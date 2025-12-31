'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Node,
  type Viewport,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ArrowDownUp, ArrowLeftRight } from 'lucide-react';
import SkillNode, { type SkillNodeData } from './SkillNode';
import type { SkillWithHierarchy, GraphView, ViewState } from '@/lib/database.types';

interface ConnectionData {
  source: string;
  target: string;
  type: 'prerequisite' | 'synergy' | 'related';
  strength: number;
}

interface SkillGraphProps {
  skills: SkillNodeData[];
  skillTree?: SkillWithHierarchy[]; // For parent-child relationships
  connections: ConnectionData[];
  domainColor?: string;
  direction?: 'TB' | 'LR';
  // View Management
  savedView?: GraphView;                     // Geladene View mit gespeicherten Positionen
  onViewChange?: (state: ViewState) => void; // Callback bei Änderungen (Positionen, Viewport, Richtung)
}

// Edge type colors
const edgeColors = {
  hierarchy: '#4b5563', // gray - parent-child relationship
  prerequisite: '#ef4444', // red - skill A required for skill B
  synergy: '#22c55e', // green - skills work well together
  related: '#6366f1', // blue - related skills
};

const nodeTypes = {
  skill: SkillNode,
} as const;

// Node dimensions for layout calculation
const NODE_WIDTH = 100;
const NODE_HEIGHT = 100;

// Dagre layout function
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 160, // Vertical spacing between levels (was 100 - mehr Abstand für RPG-Feeling)
    nodesep: 100, // Horizontal spacing between nodes (was 60 - mehr Platz zwischen Geschwistern)
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges to dagre (only hierarchy edges affect layout)
  edges
    .filter((edge) => edge.data?.isHierarchy)
    .forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

  // Run layout
  dagre.layout(dagreGraph);

  // Get positioned nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Extract parent-child edges from skill tree (RPG Constellation Style)
function extractHierarchyEdges(
  skillTree: SkillWithHierarchy[],
  domainColor: string
): Edge[] {
  const edges: Edge[] = [];

  function traverse(skills: SkillWithHierarchy[], parentId?: string) {
    skills.forEach((skill) => {
      if (parentId) {
        edges.push({
          id: `hierarchy-${parentId}-${skill.id}`,
          source: parentId,
          target: skill.id,
          type: 'smoothstep',
          style: {
            stroke: domainColor,     // Domain-Farbe statt grau (Constellation-Stil)
            strokeWidth: 3,          // Dicker (war 2)
            opacity: 0.8,            // Prominenter (war 0.4)
            // Kein strokeDasharray - solid für Skyrim-Feeling
          },
          className: 'hierarchy-edge',
          data: { isHierarchy: true },
        });
      }
      if (skill.children && skill.children.length > 0) {
        traverse(skill.children, skill.id);
      }
    });
  }

  traverse(skillTree);
  return edges;
}

// Inner component with ReactFlow context access
function SkillGraphInner({
  skills,
  skillTree = [],
  connections,
  domainColor = '#6366f1',
  direction: initialDirection = 'TB',
  savedView,
  onViewChange,
}: SkillGraphProps) {
  const { getViewport } = useReactFlow();
  const [direction, setDirection] = useState<'TB' | 'LR'>(
    savedView?.direction || initialDirection
  );

  // Track node positions for view saving
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const isInitializedRef = useRef(false);

  // Create nodes from skills
  const skillNodes: Node[] = useMemo(() => {
    return skills.map((skill) => ({
      id: skill.id,
      type: 'skill' as const,
      position: { x: 0, y: 0 }, // Will be set by dagre or savedView
      data: {
        ...skill,
        label: skill.name,
      },
    }));
  }, [skills]);

  // Create hierarchy edges from skill tree (with domain color for constellation effect)
  const hierarchyEdges = useMemo(() => {
    return extractHierarchyEdges(skillTree, domainColor);
  }, [skillTree, domainColor]);

  // Create connection edges (less prominent than hierarchy for visual clarity)
  const connectionEdges: Edge[] = useMemo(() => {
    return connections.map((conn, index) => ({
      id: `conn-${index}`,
      source: conn.source,
      target: conn.target,
      type: 'smoothstep',
      animated: conn.type === 'synergy',
      style: {
        stroke: edgeColors[conn.type],
        strokeWidth: conn.type === 'prerequisite' ? 2.5 : 2,
        opacity: 0.5,
        strokeDasharray: conn.type === 'related' ? '4,4' : undefined,
      },
      markerEnd:
        conn.type === 'prerequisite'
          ? {
              type: 'arrowclosed' as const,
              color: edgeColors.prerequisite,
            }
          : undefined,
      data: {
        isHierarchy: false,
        connectionType: conn.type,
        strength: conn.strength,
      },
      label: conn.type === 'synergy' ? '⚡' : conn.type === 'prerequisite' ? '→' : '~',
      labelStyle: { fontSize: 12, fill: edgeColors[conn.type] },
      labelBgStyle: { fill: 'rgba(0,0,0,0.6)', fillOpacity: 0.6 },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));
  }, [connections]);

  // Combine all edges
  const allEdges = useMemo(() => {
    return [...hierarchyEdges, ...connectionEdges];
  }, [hierarchyEdges, connectionEdges]);

  // Apply dagre layout OR use saved positions
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (skillNodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // First, get dagre layout as base
    const { nodes: dagreNodes, edges } = getLayoutedElements(skillNodes, allEdges, direction);

    // If we have saved positions, apply them
    if (savedView?.node_positions && Object.keys(savedView.node_positions).length > 0) {
      const nodesWithSavedPositions = dagreNodes.map((node) => {
        const savedPos = savedView.node_positions[node.id];
        if (savedPos) {
          return { ...node, position: savedPos };
        }
        return node;
      });
      return { nodes: nodesWithSavedPositions, edges };
    }

    return { nodes: dagreNodes, edges };
  }, [skillNodes, allEdges, direction, savedView]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Initialize node positions ref
  useEffect(() => {
    if (!isInitializedRef.current && nodes.length > 0) {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach((node) => {
        positions[node.id] = node.position;
      });
      nodePositionsRef.current = positions;
      isInitializedRef.current = true;
    }
  }, [nodes]);

  // Emit view changes
  const emitViewChange = useCallback(() => {
    if (!onViewChange) return;

    const viewport = getViewport();
    onViewChange({
      viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
      nodePositions: nodePositionsRef.current,
      direction,
    });
  }, [onViewChange, getViewport, direction]);

  // Handle node drag end - track position changes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      nodePositionsRef.current[node.id] = node.position;
      emitViewChange();
    },
    [emitViewChange]
  );

  // Handle viewport changes (zoom, pan)
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!onViewChange) return;
      onViewChange({
        viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
        nodePositions: nodePositionsRef.current,
        direction,
      });
    },
    [onViewChange, direction]
  );

  // Update layout when direction changes
  const onDirectionChange = useCallback(
    (newDirection: 'TB' | 'LR') => {
      setDirection(newDirection);
      const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
        skillNodes,
        allEdges,
        newDirection
      );
      setNodes(newNodes);
      setEdges(newEdges);

      // Update positions ref
      const positions: Record<string, { x: number; y: number }> = {};
      newNodes.forEach((node) => {
        positions[node.id] = node.position;
      });
      nodePositionsRef.current = positions;

      // Emit change
      if (onViewChange) {
        const viewport = getViewport();
        onViewChange({
          viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
          nodePositions: positions,
          direction: newDirection,
        });
      }
    },
    [skillNodes, allEdges, setNodes, setEdges, onViewChange, getViewport]
  );

  // Calculate initial viewport from saved view
  const defaultViewport = useMemo(() => {
    if (savedView) {
      return {
        x: savedView.viewport_x,
        y: savedView.viewport_y,
        zoom: savedView.viewport_zoom,
      };
    }
    return { x: 0, y: 0, zoom: 0.8 };
  }, [savedView]);

  return (
    <div className="w-full h-[600px] bg-[var(--background)] rounded-xl border border-[var(--orb-border)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView={!savedView} // Only fitView if no saved view
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={defaultViewport}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={domainColor}
          gap={32}
          size={1}
          style={{ opacity: 0.1 }}
        />
        <Controls
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg [&>button]:!bg-[var(--background-secondary)] [&>button]:!border-[var(--orb-border)] [&>button]:!fill-[var(--foreground-muted)] [&>button:hover]:!bg-[var(--background)]"
        />
        <MiniMap
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg"
          nodeColor={(node) => (node.data as unknown as SkillNodeData).color || domainColor}
          maskColor="rgba(10, 10, 15, 0.8)"
        />

        {/* Direction Toggle Panel */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => onDirectionChange('TB')}
            className={`p-2 rounded-lg border transition-colors ${
              direction === 'TB'
                ? 'bg-white/20 border-white/40 text-white'
                : 'bg-[var(--background-secondary)] border-[var(--orb-border)] text-white/50 hover:text-white'
            }`}
            title="Vertikal (Top → Bottom)"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDirectionChange('LR')}
            className={`p-2 rounded-lg border transition-colors ${
              direction === 'LR'
                ? 'bg-white/20 border-white/40 text-white'
                : 'bg-[var(--background-secondary)] border-[var(--orb-border)] text-white/50 hover:text-white'
            }`}
            title="Horizontal (Left → Right)"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </Panel>

        {/* Legend Panel - RPG Style */}
        <Panel position="bottom-left" className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-[3px] rounded-full"
                style={{
                  backgroundColor: domainColor,
                  boxShadow: `0 0 6px ${domainColor}`,
                }}
              />
              <span className="text-white/60">Struktur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 opacity-50" style={{ backgroundColor: edgeColors.synergy }} />
              <span className="text-white/60">Synergie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 opacity-50" style={{ backgroundColor: edgeColors.prerequisite }} />
              <span className="text-white/60">Voraussetzung</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 opacity-50 border-t border-dashed" style={{ borderColor: edgeColors.related }} />
              <span className="text-white/60">Verwandt</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Main export - wraps inner component with ReactFlowProvider
export default function SkillGraph(props: SkillGraphProps) {
  return (
    <ReactFlowProvider>
      <SkillGraphInner {...props} />
    </ReactFlowProvider>
  );
}
