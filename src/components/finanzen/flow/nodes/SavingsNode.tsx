'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Target, PiggyBank, TrendingUp, Trophy } from 'lucide-react';

export interface SavingsNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  currency: string;
  icon?: string;
  color: string;
  isAchieved?: boolean;
}

function SavingsNode({ data }: { data: SavingsNodeData }) {
  const {
    name,
    targetAmount,
    currentAmount,
    monthlyContribution,
    currency,
    icon,
    color,
    isAchieved,
  } = data;

  const progress = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  const remaining = Math.max(0, targetAmount - currentAmount);

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
      {/* Connection Handles */}
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
        className="min-w-[150px] rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)] p-3"
        style={{
          boxShadow: `
            0 0 20px ${color}30,
            0 0 40px ${color}15,
            inset 0 0 20px ${color}08
          `,
          borderColor: isAchieved ? '#10B981' : undefined,
        }}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {isAchieved ? (
              <Trophy className="w-5 h-5" />
            ) : icon ? (
              <span className="text-lg">{icon}</span>
            ) : (
              <Target className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            {isAchieved ? (
              <p className="text-xs text-green-400">Erreicht!</p>
            ) : (
              <p className="text-xs text-adaptive-dim">
                {monthlyContribution > 0 ? `${formatCurrency(monthlyContribution)}/Monat` : 'Sparziel'}
              </p>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          {/* Current Amount */}
          <div
            className="text-lg font-bold text-center py-1 rounded-lg"
            style={{ backgroundColor: `${color}10`, color }}
          >
            {formatCurrency(currentAmount)}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isAchieved ? '#10B981' : color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Progress Text */}
          <div className="flex justify-between text-xs">
            <span style={{ color }}>{progress.toFixed(0)}%</span>
            <span className="text-adaptive-dim">/ {formatCurrency(targetAmount)}</span>
          </div>

          {/* Remaining */}
          {!isAchieved && remaining > 0 && (
            <div className="text-center">
              <span className="text-xs text-adaptive-dim">
                Noch {formatCurrency(remaining)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(SavingsNode);
