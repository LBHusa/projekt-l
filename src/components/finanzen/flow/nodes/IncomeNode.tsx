'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Wallet, Briefcase, TrendingUp, Gift, DollarSign } from 'lucide-react';

export interface IncomeNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  category: 'salary' | 'freelance' | 'investments' | 'rental' | 'other_income';
  amount: number;
  currency: string;
  icon?: string;
  isRecurring?: boolean;
}

const INCOME_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  salary: { icon: <Wallet className="w-5 h-5" />, label: 'Gehalt', color: '#10B981' },
  freelance: { icon: <Briefcase className="w-5 h-5" />, label: 'Freelance', color: '#34D399' },
  investments: { icon: <TrendingUp className="w-5 h-5" />, label: 'Kapitalertrage', color: '#6EE7B7' },
  rental: { icon: <DollarSign className="w-5 h-5" />, label: 'Mieteinnahmen', color: '#A7F3D0' },
  other_income: { icon: <Gift className="w-5 h-5" />, label: 'Sonstiges', color: '#D1FAE5' },
};

function IncomeNode({ data }: { data: IncomeNodeData }) {
  const { name, category, amount, currency, icon, isRecurring } = data;
  const config = INCOME_CONFIG[category] || INCOME_CONFIG.other_income;

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
      {/* Connection Handles - Income nodes are SOURCE only (left side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-0 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-transparent !border-0 !w-3 !h-3"
      />

      {/* Node Card */}
      <div
        className="min-w-[130px] rounded-xl bg-gradient-to-br from-[#0a2e1a] to-[#0d3320] border border-green-500/30 p-3"
        style={{
          boxShadow: `
            0 0 20px ${config.color}30,
            0 0 40px ${config.color}15,
            inset 0 0 20px ${config.color}08
          `,
        }}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20"
            style={{ color: config.color }}
          >
            {icon ? <span className="text-lg">{icon}</span> : config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-400 truncate">{name}</p>
            <p className="text-xs text-green-400/50">{config.label}</p>
          </div>
        </div>

        {/* Amount */}
        <div
          className="text-lg font-bold text-center py-1 rounded-lg bg-green-500/10"
          style={{ color: config.color }}
        >
          +{formatCurrency(amount)}
        </div>

        {/* Recurring Badge */}
        {isRecurring && (
          <div className="mt-2 text-center">
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400/70">
              monatlich
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(IncomeNode);
