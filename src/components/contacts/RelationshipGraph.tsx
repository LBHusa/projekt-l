'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import ContactNode, { type ContactNodeData } from './ContactNode';
import type { ContactWithStats, RelationshipCategory } from '@/lib/types/contacts';
import { CATEGORY_META } from '@/lib/types/contacts';

interface RelationshipGraphProps {
  contacts: ContactWithStats[];
  onContactClick?: (contact: ContactWithStats) => void;
  selectedCategory?: RelationshipCategory | null;
}

// Node dimensions for layout
const NODE_WIDTH = 120;
const NODE_HEIGHT = 120;

// Category colors for edges
const categoryColors: Record<RelationshipCategory, string> = {
  family: '#ec4899',
  friend: '#06b6d4',
  professional: '#3b82f6',
  other: '#6b7280',
};

const nodeTypes = {
  contact: ContactNode,
} as const;

// Radial layout function - arranges nodes in a circle by category
function getRadialLayout(
  nodes: Node[],
  contacts: ContactWithStats[]
): { nodes: Node[]; edges: Edge[] } {
  // Group contacts by category
  const categories: RelationshipCategory[] = ['family', 'friend', 'professional', 'other'];
  const groupedByCategory = categories.map((cat) => ({
    category: cat,
    contacts: contacts.filter((c) => c.relationship_category === cat),
  }));

  // Calculate positions in radial layout
  const centerX = 400;
  const centerY = 300;
  const baseRadius = 200;

  const positionedNodes: Node[] = [];

  // Add center node (user placeholder)
  positionedNodes.push({
    id: 'center-user',
    type: 'default',
    position: { x: centerX - 30, y: centerY - 30 },
    data: { label: '👤 Du' },
    style: {
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '50%',
      width: 60,
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: 'white',
      fontWeight: 'bold',
    },
  });

  // Calculate angle per category section (divide circle into 4 parts)
  const sectionAngle = (2 * Math.PI) / 4;

  groupedByCategory.forEach((group, categoryIndex) => {
    const startAngle = categoryIndex * sectionAngle - Math.PI / 2; // Start from top
    const contactCount = group.contacts.length;

    if (contactCount === 0) return;

    // Calculate angle spread within category section
    const angleSpread = sectionAngle * 0.8; // Use 80% of section
    const angleStep = contactCount > 1 ? angleSpread / (contactCount - 1) : 0;
    const sectionStartAngle = startAngle + (sectionAngle - angleSpread) / 2;

    group.contacts.forEach((contact, index) => {
      const angle = sectionStartAngle + (contactCount > 1 ? index * angleStep : angleSpread / 2);

      // Radius based on level (higher level = closer to center)
      const levelRadius = baseRadius + (10 - Math.min(contact.relationship_level, 10)) * 15;

      const x = centerX + Math.cos(angle) * levelRadius - NODE_WIDTH / 2;
      const y = centerY + Math.sin(angle) * levelRadius - NODE_HEIGHT / 2;

      positionedNodes.push({
        id: contact.id,
        type: 'contact',
        position: { x, y },
        data: { ...contact, label: contact.first_name } as ContactNodeData,
      });
    });
  });

  // Create edges from center to all contacts
  const edges: Edge[] = contacts.map((contact) => ({
    id: `edge-center-${contact.id}`,
    source: 'center-user',
    target: contact.id,
    type: 'smoothstep',
    style: {
      stroke: categoryColors[contact.relationship_category],
      strokeWidth: 2,
      opacity: 0.6,
    },
    animated: contact.is_favorite,
  }));

  return { nodes: positionedNodes, edges };
}

// Force-directed layout using dagre
function getForceLayout(
  nodes: Node[],
  contacts: ContactWithStats[]
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    ranksep: 150,
    nodesep: 100,
    marginx: 50,
    marginy: 50,
  });

  // Add center node
  dagreGraph.setNode('center-user', { width: 60, height: 60 });

  // Add contact nodes
  contacts.forEach((contact) => {
    dagreGraph.setNode(contact.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges
  contacts.forEach((contact) => {
    dagreGraph.setEdge('center-user', contact.id);
  });

  // Run layout
  dagre.layout(dagreGraph);

  // Build positioned nodes
  const positionedNodes: Node[] = [];

  // Center user node
  const centerNode = dagreGraph.node('center-user');
  positionedNodes.push({
    id: 'center-user',
    type: 'default',
    position: { x: centerNode.x - 30, y: centerNode.y - 30 },
    data: { label: '👤 Du' },
    style: {
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '50%',
      width: 60,
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: 'white',
      fontWeight: 'bold',
    },
  });

  // Contact nodes
  contacts.forEach((contact) => {
    const nodePos = dagreGraph.node(contact.id);
    positionedNodes.push({
      id: contact.id,
      type: 'contact',
      position: { x: nodePos.x - NODE_WIDTH / 2, y: nodePos.y - NODE_HEIGHT / 2 },
      data: { ...contact, label: contact.first_name } as ContactNodeData,
    });
  });

  // Create edges
  const edges: Edge[] = contacts.map((contact) => ({
    id: `edge-center-${contact.id}`,
    source: 'center-user',
    target: contact.id,
    type: 'smoothstep',
    style: {
      stroke: categoryColors[contact.relationship_category],
      strokeWidth: 2,
      opacity: 0.6,
    },
    animated: contact.is_favorite,
  }));

  return { nodes: positionedNodes, edges };
}

function RelationshipGraphInner({
  contacts,
  onContactClick,
  selectedCategory,
}: RelationshipGraphProps) {
  // Filter contacts by category if selected
  const filteredContacts = useMemo(() => {
    if (!selectedCategory) return contacts;
    return contacts.filter((c) => c.relationship_category === selectedCategory);
  }, [contacts, selectedCategory]);

  // Calculate layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (filteredContacts.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getRadialLayout([], filteredContacts);
  }, [filteredContacts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === 'center-user' || !onContactClick) return;
      const contact = contacts.find((c) => c.id === node.id);
      if (contact) onContactClick(contact);
    },
    [contacts, onContactClick]
  );

  if (filteredContacts.length === 0) {
    return (
      <div className="w-full h-[500px] bg-[var(--background)] rounded-xl border border-[var(--orb-border)] flex items-center justify-center">
        <p className="text-white/40">Keine Kontakte vorhanden</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] bg-[var(--background)] rounded-xl border border-[var(--orb-border)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#6366f1"
          gap={32}
          size={1}
          style={{ opacity: 0.1 }}
        />
        <Controls
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg [&>button]:!bg-[var(--background-secondary)] [&>button]:!border-[var(--orb-border)] [&>button]:!fill-[var(--foreground-muted)] [&>button:hover]:!bg-[var(--background)]"
        />
        <MiniMap
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg"
          nodeColor={(node) => {
            if (node.id === 'center-user') return '#6366f1';
            const data = node.data as ContactNodeData;
            return categoryColors[data.relationship_category] || '#6b7280';
          }}
          maskColor="rgba(10, 10, 15, 0.8)"
        />

        {/* Legend Panel */}
        <Panel position="bottom-left" className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <p className="text-white/60 font-medium mb-1">Kategorien</p>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColors[key as RelationshipCategory] }}
                />
                <span className="text-white/60">{meta.labelDe}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <ReactFlowProvider>
      <RelationshipGraphInner {...props} />
    </ReactFlowProvider>
  );
}
