'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type Connection,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ArrowDownUp, ArrowLeftRight, Plus, Wallet, Target, Repeat, TrendingUp } from 'lucide-react';
import { AccountNode, IncomeNode, ExpenseNode, SavingsNode } from './nodes';
import type { AccountNodeData, IncomeNodeData, ExpenseNodeData, SavingsNodeData } from './nodes';
import type { Account, MoneyFlowData, SavingsGoalProgress, RecurringFlow } from '@/lib/database.types';

// Node type mapping
const nodeTypes = {
  account: AccountNode,
  income: IncomeNode,
  expense: ExpenseNode,
  savings: SavingsNode,
} as const;

// Node dimensions for layout
const NODE_WIDTH = 150;
const NODE_HEIGHT = 120;

interface MoneyFlowCanvasProps {
  data: MoneyFlowData;
  accounts: Account[];
  goals: SavingsGoalProgress[];
  recurringFlows?: RecurringFlow[];
  onNodeClick?: (nodeId: string, nodeType: string) => void;
  onEdgeClick?: (flowId: string) => void;
  onAddAccount?: () => void;
  onAddSavingsGoal?: () => void;
  onAddRecurringFlow?: () => void;
  onAddTransaction?: () => void;
  onConnect?: (connection: Connection) => void;
}

// Dagre layout function
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 80,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

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

// Transform data to React Flow nodes and edges
function transformToFlowElements(
  data: MoneyFlowData,
  accounts: Account[],
  goals: SavingsGoalProgress[],
  recurringFlows: RecurringFlow[] = []
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const existingNodeIds = new Set<string>();

  // 1. Create Income Nodes (from transaction data)
  data.income.forEach((income) => {
    const nodeId = `income-${income.category}`;
    if (!existingNodeIds.has(nodeId)) {
      existingNodeIds.add(nodeId);
      nodes.push({
        id: nodeId,
        type: 'income',
        position: { x: 0, y: 0 },
        data: {
          id: nodeId,
          name: income.category === 'salary' ? 'Gehalt'
            : income.category === 'freelance' ? 'Freelance'
            : income.category === 'investments' ? 'Kapitalertrage'
            : income.category === 'rental' ? 'Mieteinnahmen'
            : 'Sonstiges',
          category: income.category,
          amount: income.amount,
          currency: 'EUR',
          isRecurring: true,
        } as IncomeNodeData,
      });
    }
  });

  // 1b. Create Income Nodes from Recurring Flows
  recurringFlows
    .filter(f => f.source_type === 'income' && f.source_category)
    .forEach((flow) => {
      const nodeId = `income-${flow.source_category}`;
      if (!existingNodeIds.has(nodeId)) {
        existingNodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          type: 'income',
          position: { x: 0, y: 0 },
          data: {
            id: nodeId,
            name: flow.name || flow.source_category || 'Einnahme',
            category: flow.source_category || 'other_income',
            amount: flow.amount,
            currency: 'EUR',
            isRecurring: true,
          } as IncomeNodeData,
        });
      }
    });

  // 2. Create Account Nodes
  accounts.forEach((account) => {
    const nodeId = `account-${account.id}`;
    existingNodeIds.add(nodeId);
    nodes.push({
      id: nodeId,
      type: 'account',
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        name: account.name,
        institution: account.institution || undefined,
        accountType: account.account_type as AccountNodeData['accountType'] || 'checking',
        balance: account.current_balance,
        currency: account.currency || 'EUR',
        color: account.color || '#3B82F6',
        icon: account.icon || undefined,
      } as AccountNodeData,
    });
  });

  // 3. Create Expense Nodes (grouped by category)
  data.expenses.forEach((expense) => {
    const nodeId = `expense-${expense.category}`;
    if (!existingNodeIds.has(nodeId)) {
      existingNodeIds.add(nodeId);
      nodes.push({
        id: nodeId,
        type: 'expense',
        position: { x: 0, y: 0 },
        data: {
          id: nodeId,
          name: expense.category,
          category: expense.category,
          amount: expense.amount,
          budget: undefined,
          currency: 'EUR',
        } as ExpenseNodeData,
      });
    }
  });

  // 3b. Create Expense Nodes from Recurring Flows
  recurringFlows
    .filter(f => f.target_type === 'expense' && f.target_category)
    .forEach((flow) => {
      const nodeId = `expense-${flow.target_category}`;
      if (!existingNodeIds.has(nodeId)) {
        existingNodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          type: 'expense',
          position: { x: 0, y: 0 },
          data: {
            id: nodeId,
            name: flow.name || flow.target_category || 'Ausgabe',
            category: flow.target_category || 'other_expense',
            amount: flow.amount,
            budget: undefined,
            currency: 'EUR',
          } as ExpenseNodeData,
        });
      }
    });

  // 4. Create Savings Goal Nodes
  goals.forEach((goal) => {
    const nodeId = `savings-${goal.id}`;
    existingNodeIds.add(nodeId);
    nodes.push({
      id: nodeId,
      type: 'savings',
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        name: goal.name,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        monthlyContribution: goal.monthly_contribution,
        currency: 'EUR',
        icon: goal.icon || undefined,
        color: goal.color || '#3B82F6',
        isAchieved: goal.is_achieved,
      } as SavingsNodeData,
    });
  });

  // 5. Create Edges: Income → Accounts (use first account as main)
  const mainAccountId = accounts.length > 0 ? `account-${accounts[0].id}` : null;
  if (mainAccountId) {
    data.income.forEach((income) => {
      edges.push({
        id: `edge-income-${income.category}-${mainAccountId}`,
        source: `income-${income.category}`,
        target: mainAccountId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        label: formatCurrencySimple(income.amount),
        labelStyle: { fontSize: 11, fill: '#10B981' },
        labelBgStyle: { fill: 'rgba(0,0,0,0.7)' },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
      });
    });

    // 6. Create Edges: Account → Expenses
    data.expenses.forEach((expense) => {
      edges.push({
        id: `edge-${mainAccountId}-expense-${expense.category}`,
        source: mainAccountId,
        target: `expense-${expense.category}`,
        type: 'smoothstep',
        style: { stroke: '#EF4444', strokeWidth: 2, opacity: 0.7 },
        label: formatCurrencySimple(expense.amount),
        labelStyle: { fontSize: 11, fill: '#EF4444' },
        labelBgStyle: { fill: 'rgba(0,0,0,0.7)' },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
      });
    });

    // 7. Create Edges: Account → Savings Goals
    goals.forEach((goal) => {
      if (goal.monthly_contribution > 0) {
        edges.push({
          id: `edge-${mainAccountId}-savings-${goal.id}`,
          source: mainAccountId,
          target: `savings-${goal.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: goal.color || '#3B82F6', strokeWidth: 2 },
          label: formatCurrencySimple(goal.monthly_contribution),
          labelStyle: { fontSize: 11, fill: goal.color || '#3B82F6' },
          labelBgStyle: { fill: 'rgba(0,0,0,0.7)' },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
        });
      }
    });
  }

  // 8. Create Edges from Recurring Flows (Dauerauftrage)
  recurringFlows.forEach((flow) => {
    let sourceNodeId: string | null = null;
    let targetNodeId: string | null = null;

    // Determine source node ID
    if (flow.source_type === 'income' && flow.source_category) {
      sourceNodeId = `income-${flow.source_category}`;
    } else if (flow.source_type === 'account' && flow.source_id) {
      sourceNodeId = `account-${flow.source_id}`;
    }

    // Determine target node ID
    if (flow.target_type === 'account' && flow.target_id) {
      targetNodeId = `account-${flow.target_id}`;
    } else if (flow.target_type === 'expense' && flow.target_category) {
      targetNodeId = `expense-${flow.target_category}`;
    } else if (flow.target_type === 'savings' && flow.target_id) {
      targetNodeId = `savings-${flow.target_id}`;
    }

    // Only create edge if both nodes exist
    if (sourceNodeId && targetNodeId && existingNodeIds.has(sourceNodeId) && existingNodeIds.has(targetNodeId)) {
      const isIncome = flow.source_type === 'income';
      const isSavings = flow.target_type === 'savings';
      const color = isIncome ? '#10B981' : isSavings ? '#8B5CF6' : '#EF4444';

      edges.push({
        id: `recurring-${flow.id}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: color, strokeWidth: 2.5, strokeDasharray: '5,5' },
        label: `${formatCurrencySimple(flow.amount)}/${getFrequencyShort(flow.frequency)}`,
        labelStyle: { fontSize: 10, fill: color, fontWeight: 500 },
        labelBgStyle: { fill: 'rgba(0,0,0,0.8)' },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
        data: { flowId: flow.id, flowName: flow.name },
      });
    }
  });

  return { nodes, edges };
}

function getFrequencyShort(frequency: string): string {
  switch (frequency) {
    case 'weekly': return 'Wo';
    case 'biweekly': return '2Wo';
    case 'monthly': return 'Mo';
    case 'quarterly': return 'Q';
    case 'yearly': return 'J';
    default: return 'Mo';
  }
}

function formatCurrencySimple(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Inner component with ReactFlow context
function MoneyFlowCanvasInner({
  data,
  accounts,
  goals,
  recurringFlows = [],
  onNodeClick,
  onEdgeClick,
  onAddAccount,
  onAddSavingsGoal,
  onAddRecurringFlow,
  onAddTransaction,
  onConnect,
}: MoneyFlowCanvasProps) {
  const [direction, setDirection] = useState<'TB' | 'LR'>('LR');

  // Transform data to nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!data || accounts.length === 0) {
      return { nodes: [], edges: [] };
    }
    return transformToFlowElements(data, accounts, goals, recurringFlows);
  }, [data, accounts, goals, recurringFlows]);

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (initialNodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getLayoutedElements(initialNodes, initialEdges, direction);
  }, [initialNodes, initialEdges, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const onDirectionChange = useCallback((newDirection: 'TB' | 'LR') => {
    setDirection(newDirection);
  }, []);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id, node.type || 'unknown');
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Check if this is a recurring flow edge
      if (edge.id.startsWith('recurring-') && onEdgeClick) {
        const flowId = edge.id.replace('recurring-', '');
        onEdgeClick(flowId);
      }
    },
    [onEdgeClick]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (onConnect) {
        onConnect(connection);
      }
    },
    [onConnect]
  );

  // Check if any actions are available
  const hasActions = onAddAccount || onAddSavingsGoal || onAddRecurringFlow || onAddTransaction;

  if (nodes.length === 0) {
    return (
      <div className="w-full h-[500px] bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] flex flex-col items-center justify-center gap-4">
        <p className="text-white/40">Keine Finanzdaten vorhanden</p>
        {hasActions && (
          <div className="flex gap-2">
            {onAddAccount && (
              <button
                onClick={onAddAccount}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Konto hinzufugen
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] bg-[var(--background)] rounded-xl border border-[var(--orb-border)] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#10B981"
          gap={32}
          size={1}
          style={{ opacity: 0.05 }}
        />
        <Controls
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg [&>button]:!bg-[var(--background-secondary)] [&>button]:!border-[var(--orb-border)] [&>button]:!fill-[var(--foreground-muted)] [&>button:hover]:!bg-[var(--background)]"
        />
        <MiniMap
          className="!bg-[var(--background-secondary)] !border-[var(--orb-border)] !rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'income': return '#10B981';
              case 'expense': return '#EF4444';
              case 'savings': return '#3B82F6';
              default: return '#6B7280';
            }
          }}
          maskColor="rgba(10, 10, 15, 0.8)"
        />

        {/* Toolbar Panel - Top Left */}
        {hasActions && (
          <Panel position="top-left" className="flex gap-2">
            {onAddAccount && (
              <button
                onClick={onAddAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs transition-colors"
                title="Konto hinzufugen"
              >
                <Plus className="w-3 h-3" />
                <Wallet className="w-3.5 h-3.5" />
              </button>
            )}
            {onAddSavingsGoal && (
              <button
                onClick={onAddSavingsGoal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-xs transition-colors"
                title="Sparziel erstellen"
              >
                <Plus className="w-3 h-3" />
                <Target className="w-3.5 h-3.5" />
              </button>
            )}
            {onAddRecurringFlow && (
              <button
                onClick={onAddRecurringFlow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-xs transition-colors"
                title="Dauerauftrag anlegen"
              >
                <Plus className="w-3 h-3" />
                <Repeat className="w-3.5 h-3.5" />
              </button>
            )}
            {onAddTransaction && (
              <button
                onClick={onAddTransaction}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-xs transition-colors"
                title="Transaktion"
              >
                <Plus className="w-3 h-3" />
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            )}
          </Panel>
        )}

        {/* Direction Toggle - Top Right */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => onDirectionChange('TB')}
            className={`p-2 rounded-lg border transition-colors ${
              direction === 'TB'
                ? 'bg-white/20 border-white/40 text-white'
                : 'bg-[var(--background-secondary)] border-[var(--orb-border)] text-white/50 hover:text-white'
            }`}
            title="Vertikal"
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
            title="Horizontal"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left" className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-white/60">Einnahmen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-white/60">Konten</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-white/60">Ausgaben</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-white/60">Sparziele</span>
            </div>
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/10">
              <div className="w-3 h-0.5 bg-white/60" style={{ borderBottom: '2px dashed' }} />
              <span className="text-white/60">Dauerauftrag</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Main export
export function MoneyFlowCanvas(props: MoneyFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <MoneyFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
