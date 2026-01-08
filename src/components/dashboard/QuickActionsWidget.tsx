'use client';

import { motion } from 'framer-motion';
import { Check, Smile, DollarSign, Target } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface QuickActionsWidgetProps {
  onOpenHabitModal: () => void;
  onOpenMoodModal: () => void;
  onOpenTransactionModal: () => void;
}

export default function QuickActionsWidget({
  onOpenHabitModal,
  onOpenMoodModal,
  onOpenTransactionModal,
}: QuickActionsWidgetProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'habit',
      label: 'Habit erledigen',
      icon: <Check className="w-6 h-6" />,
      color: '#10B981', // green
      onClick: onOpenHabitModal,
    },
    {
      id: 'mood',
      label: 'Stimmung loggen',
      icon: <Smile className="w-6 h-6" />,
      color: '#F59E0B', // amber
      onClick: onOpenMoodModal,
    },
    {
      id: 'transaction',
      label: 'Transaktion',
      icon: <DollarSign className="w-6 h-6" />,
      color: '#14B8A6', // teal
      onClick: onOpenTransactionModal,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-white/60" />
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Schnellaktionen
        </h3>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 gap-2">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={action.onClick}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${action.color}20`, color: action.color }}
            >
              {action.icon}
            </div>
            <span className="text-sm text-white font-medium flex-1 text-left">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
