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
import type { ContactWithStats, RelationshipType } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

interface RelationshipTreeProps {
  contacts: ContactWithStats[];
  onContactClick?: (contact: ContactWithStats) => void;
}

// Node dimensions for layout
const NODE_WIDTH = 120;
const NODE_HEIGHT = 120;

const nodeTypes = {
  contact: ContactNode,
} as const;

// Define generation levels for family tree hierarchy
const GENERATION_LEVELS: Record<RelationshipType, number> = {
  // Generation 2 (Grandparents level)
  grandparent: 2,
  // Generation 1 (Parents level)
  parent: 1,
  parent_in_law: 1,
  step_parent: 1,
  aunt_uncle: 1,
  // Generation 0 (User level - siblings, partners, cousins)
  partner: 0,
  spouse: 0,
  sibling: 0,
  sibling_in_law: 0,
  step_sibling: 0,
  cousin: 0,
  close_friend: 0,
  friend: 0,
  acquaintance: 0,
  colleague: 0,
  mentor: 0,
  mentee: 0,
  neighbor: 0,
  other: 0,
  // Generation -1 (Children level)
  child: -1,
  step_child: -1,
  child_in_law: -1,
  niece_nephew: -1,
};

// Family tree layout - hierarchical by generation
function getFamilyTreeLayout(
  contacts: ContactWithStats[]
): { nodes: Node[]; edges: Edge[] } {
  // Only show family contacts in tree
  const familyContacts = contacts.filter((c) => c.relationship_category === 'family');

  if (familyContacts.length === 0) {
    return { nodes: [], edges: [] };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB', // Top to Bottom
    ranksep: 180, // Vertical spacing between generations
    nodesep: 80, // Horizontal spacing between siblings
    marginx: 50,
    marginy: 50,
  });

  // Add center user node
  dagreGraph.setNode('center-user', { width: 80, height: 80 });

  // Group contacts by generation
  const byGeneration: Record<number, ContactWithStats[]> = {};
  familyContacts.forEach((contact) => {
    const gen = GENERATION_LEVELS[contact.relationship_type] || 0;
    if (!byGeneration[gen]) byGeneration[gen] = [];
    byGeneration[gen].push(contact);
  });

  // Add contact nodes
  familyContacts.forEach((contact) => {
    dagreGraph.setNode(contact.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Create hierarchical edges based on generation
  // Grandparents -> Parents
  const grandparents = byGeneration[2] || [];
  const parents = byGeneration[1] || [];
  const sameGen = byGeneration[0] || [];
  const children = byGeneration[-1] || [];

  // Connect grandparents to parents (if any)
  if (grandparents.length > 0 && parents.length > 0) {
    grandparents.forEach((gp) => {
      parents.forEach((p) => {
        dagreGraph.setEdge(gp.id, p.id);
      });
    });
  }

  // Connect parents to user
  parents.forEach((p) => {
    dagreGraph.setEdge(p.id, 'center-user');
  });

  // If no parents, connect grandparents to user
  if (parents.length === 0 && grandparents.length > 0) {
    grandparents.forEach((gp) => {
      dagreGraph.setEdge(gp.id, 'center-user');
    });
  }

  // Connect user to children
  children.forEach((c) => {
    dagreGraph.setEdge('center-user', c.id);
  });

  // Same generation - connect to user as siblings
  const siblings = sameGen.filter((c) =>
    ['sibling', 'step_sibling', 'sibling_in_law'].includes(c.relationship_type)
  );
  const partners = sameGen.filter((c) =>
    ['partner', 'spouse'].includes(c.relationship_type)
  );

  // Siblings get same parent connections as user
  siblings.forEach((s) => {
    if (parents.length > 0) {
      parents.forEach((p) => {
        dagreGraph.setEdge(p.id, s.id);
      });
    }
  });

  // Partners connect horizontally to user
  partners.forEach((p) => {
    dagreGraph.setEdge('center-user', p.id);
  });

  // Run layout
  dagre.layout(dagreGraph);

  // Build positioned nodes
  const positionedNodes: Node[] = [];

  // Center user node
  const centerNode = dagreGraph.node('center-user');
  if (centerNode) {
    positionedNodes.push({
      id: 'center-user',
      type: 'default',
      position: { x: centerNode.x - 40, y: centerNode.y - 40 },
      data: { label: '👤 Du' },
      style: {
        background: 'linear-gradient(135deg, #ec4899, #f472b6)',
        border: '3px solid rgba(255,255,255,0.4)',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)',
      },
    });
  }

  // Contact nodes
  familyContacts.forEach((contact) => {
    const nodePos = dagreGraph.node(contact.id);
    if (nodePos) {
      positionedNodes.push({
        id: contact.id,
        type: 'contact',
        position: { x: nodePos.x - NODE_WIDTH / 2, y: nodePos.y - NODE_HEIGHT / 2 },
        data: { ...contact, label: contact.first_name } as ContactNodeData,
      });
    }
  });

  // Create visual edges
  const edges: Edge[] = [];

  // Parent edges
  parents.forEach((p) => {
    edges.push({
      id: `edge-${p.id}-user`,
      source: p.id,
      target: 'center-user',
      type: 'smoothstep',
      style: { stroke: '#ec4899', strokeWidth: 3, opacity: 0.8 },
    });
  });

  // Grandparent edges
  grandparents.forEach((gp) => {
    const targets = parents.length > 0 ? parents : [{ id: 'center-user' }];
    targets.forEach((t) => {
      edges.push({
        id: `edge-${gp.id}-${t.id}`,
        source: gp.id,
        target: t.id,
        type: 'smoothstep',
        style: { stroke: '#f472b6', strokeWidth: 2, opacity: 0.6 },
      });
    });
  });

  // Children edges
  children.forEach((c) => {
    edges.push({
      id: `edge-user-${c.id}`,
      source: 'center-user',
      target: c.id,
      type: 'smoothstep',
      style: { stroke: '#ec4899', strokeWidth: 3, opacity: 0.8 },
    });
  });

  // Sibling edges (from parents)
  siblings.forEach((s) => {
    if (parents.length > 0) {
      edges.push({
        id: `edge-parent-${s.id}`,
        source: parents[0].id,
        target: s.id,
        type: 'smoothstep',
        style: { stroke: '#ec4899', strokeWidth: 2, opacity: 0.6 },
      });
    }
  });

  // Partner edges (horizontal)
  partners.forEach((p) => {
    edges.push({
      id: `edge-user-${p.id}`,
      source: 'center-user',
      target: p.id,
      type: 'smoothstep',
      style: { stroke: '#f472b6', strokeWidth: 3, opacity: 0.8 },
      animated: true,
    });
  });

  return { nodes: positionedNodes, edges };
}

function RelationshipTreeInner({
  contacts,
  onContactClick,
}: RelationshipTreeProps) {
  // Calculate layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return getFamilyTreeLayout(contacts);
  }, [contacts]);

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

  const familyCount = contacts.filter((c) => c.relationship_category === 'family').length;

  if (familyCount === 0) {
    return (
      <div className="w-full h-[500px] bg-[var(--background)] rounded-xl border border-[var(--orb-border)] flex items-center justify-center flex-col gap-2">
        <span className="text-4xl">👨‍👩‍👧‍👦</span>
        <p className="text-adaptive-dim">Keine Familienmitglieder vorhanden</p>
        <p className="text-adaptive-dim text-sm">Füge Familien-Kontakte hinzu um den Stammbaum zu sehen</p>
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
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#ec4899"
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
            if (node.id === 'center-user') return '#ec4899';
            return '#f472b6';
          }}
          maskColor="rgba(10, 10, 15, 0.8)"
        />

        {/* Generation Legend */}
        <Panel position="bottom-left" className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <p className="text-adaptive-muted font-medium mb-1">Generationen</p>
            <div className="flex items-center gap-2">
              <span className="text-adaptive-dim">👴</span>
              <span className="text-adaptive-muted">Großeltern</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-adaptive-dim">👨‍👩‍👧</span>
              <span className="text-adaptive-muted">Eltern</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-adaptive-dim">👤</span>
              <span className="text-adaptive-muted">Du & Geschwister</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-adaptive-dim">👶</span>
              <span className="text-adaptive-muted">Kinder</span>
            </div>
          </div>
        </Panel>

        {/* Title Panel */}
        <Panel position="top-left" className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span>👨‍👩‍👧‍👦</span> Familien-Stammbaum
          </h3>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function RelationshipTree(props: RelationshipTreeProps) {
  return (
    <ReactFlowProvider>
      <RelationshipTreeInner {...props} />
    </ReactFlowProvider>
  );
}
