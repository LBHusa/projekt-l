'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Wallet, Building2, CreditCard, PiggyBank, TrendingUp, Coins, Landmark } from 'lucide-react';

export interface AccountNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  institution?: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment' | 'crypto' | 'cash' | 'loan';
  balance: number;
  currency: string;
  color: string;
  icon?: string;
}

const ACCOUNT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; defaultColor: string }> = {
  checking: { icon: <Building2 className="w-5 h-5" />, defaultColor: '#3B82F6' },
  savings: { icon: <PiggyBank className="w-5 h-5" />, defaultColor: '#10B981' },
  credit: { icon: <CreditCard className="w-5 h-5" />, defaultColor: '#EF4444' },
  investment: { icon: <TrendingUp className="w-5 h-5" />, defaultColor: '#8B5CF6' },
  crypto: { icon: <Coins className="w-5 h-5" />, defaultColor: '#F59E0B' },
  cash: { icon: <Wallet className="w-5 h-5" />, defaultColor: '#6B7280' },
  loan: { icon: <Landmark className="w-5 h-5" />, defaultColor: '#DC2626' },
};

function AccountNode({ data }: { data: AccountNodeData }) {
  const { name, institution, accountType, balance, currency, color, icon } = data;
  const config = ACCOUNT_TYPE_CONFIG[accountType] || ACCOUNT_TYPE_CONFIG.checking;
  const nodeColor = color || config.defaultColor;

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
        position={Position.Top}
        className="!bg-transparent !border-0 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-3 !h-3"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-transparent !border-0 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-transparent !border-0 !w-3 !h-3"
      />

      {/* Node Card */}
      <div
        className="min-w-[140px] rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)] p-3"
        style={{
          boxShadow: `
            0 0 20px ${nodeColor}30,
            0 0 40px ${nodeColor}15,
            inset 0 0 20px ${nodeColor}08
          `,
        }}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${nodeColor}20`, color: nodeColor }}
          >
            {icon ? <span className="text-lg">{icon}</span> : config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            {institution && (
              <p className="text-xs text-adaptive-dim truncate">{institution}</p>
            )}
          </div>
        </div>

        {/* Balance */}
        <div
          className="text-lg font-bold text-center py-1 rounded-lg"
          style={{
            color: balance >= 0 ? nodeColor : '#EF4444',
            backgroundColor: `${balance >= 0 ? nodeColor : '#EF4444'}10`
          }}
        >
          {formatCurrency(balance)}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(AccountNode);
