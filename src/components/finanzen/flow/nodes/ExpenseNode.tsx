'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  Home, Zap, Utensils, Car, Shield, Heart, Smartphone,
  Gamepad2, ShoppingBag, GraduationCap, Gift, Package
} from 'lucide-react';

export interface ExpenseNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  category: string;
  amount: number;       // IST - actual spent
  budget?: number;      // SOLL - planned budget
  currency: string;
  icon?: string;
}

const EXPENSE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  housing: { icon: <Home className="w-5 h-5" />, label: 'Wohnen', color: '#EF4444' },
  utilities: { icon: <Zap className="w-5 h-5" />, label: 'Nebenkosten', color: '#F97316' },
  food: { icon: <Utensils className="w-5 h-5" />, label: 'Essen', color: '#F59E0B' },
  transport: { icon: <Car className="w-5 h-5" />, label: 'Transport', color: '#84CC16' },
  insurance: { icon: <Shield className="w-5 h-5" />, label: 'Versicherungen', color: '#06B6D4' },
  health: { icon: <Heart className="w-5 h-5" />, label: 'Gesundheit', color: '#EC4899' },
  communication: { icon: <Smartphone className="w-5 h-5" />, label: 'Kommunikation', color: '#8B5CF6' },
  entertainment: { icon: <Gamepad2 className="w-5 h-5" />, label: 'Unterhaltung', color: '#6366F1' },
  shopping: { icon: <ShoppingBag className="w-5 h-5" />, label: 'Shopping', color: '#A855F7' },
  education: { icon: <GraduationCap className="w-5 h-5" />, label: 'Bildung', color: '#14B8A6' },
  gifts: { icon: <Gift className="w-5 h-5" />, label: 'Geschenke', color: '#F43F5E' },
  other_expense: { icon: <Package className="w-5 h-5" />, label: 'Sonstiges', color: '#64748B' },
  subscriptions: { icon: <Smartphone className="w-5 h-5" />, label: 'Abos', color: '#6366F1' },
};

function ExpenseNode({ data }: { data: ExpenseNodeData }) {
  const { name, category, amount, budget, currency, icon } = data;
  const config = EXPENSE_CONFIG[category] || EXPENSE_CONFIG.other_expense;

  // Calculate budget status
  const budgetPercent = budget && budget > 0 ? (amount / budget) * 100 : 0;
  const budgetStatus = !budget ? 'none'
    : budgetPercent > 100 ? 'over'
    : budgetPercent > 80 ? 'warning'
    : 'good';

  const statusColors = {
    none: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
    over: { border: 'border-red-500/50', bg: 'bg-red-500/20', text: 'text-red-400' },
    warning: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    good: { border: 'border-green-500/50', bg: 'bg-green-500/20', text: 'text-green-400' },
  };

  const colors = statusColors[budgetStatus];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Connection Handles - Expense nodes are TARGET only (right side) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-0 !w-3 !h-3"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-transparent !border-0 !w-3 !h-3"
      />

      {/* Node Card */}
      <div
        className={`min-w-[130px] rounded-xl bg-gradient-to-br from-[#2e1a1a] to-[#331616] ${colors.border} border p-3`}
        style={{
          boxShadow: `
            0 0 20px ${config.color}25,
            0 0 40px ${config.color}10,
            inset 0 0 20px ${config.color}05
          `,
        }}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {icon ? <span className="text-lg">{icon}</span> : config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-400 truncate">{name}</p>
            <p className="text-xs text-red-400/50">{config.label}</p>
          </div>
        </div>

        {/* Amount */}
        <div
          className={`text-lg font-bold text-center py-1 rounded-lg ${colors.bg}`}
          style={{ color: config.color }}
        >
          -{formatCurrency(amount)}
        </div>

        {/* Budget Comparison */}
        {budget && budget > 0 && (
          <div className="mt-2 space-y-1">
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(budgetPercent, 100)}%`,
                  backgroundColor: budgetStatus === 'over' ? '#EF4444'
                    : budgetStatus === 'warning' ? '#F59E0B'
                    : '#10B981',
                }}
              />
            </div>
            {/* Budget Text */}
            <div className="flex justify-between text-xs">
              <span className={colors.text}>
                {budgetPercent.toFixed(0)}%
              </span>
              <span className="text-white/40">
                / {formatCurrency(budget)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ExpenseNode);
