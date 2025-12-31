'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Zap,
  UserPlus,
  Timer,
  Dumbbell,
  BookOpen,
  PiggyBank,
  Target,
  Plus,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionsWidgetProps {
  onLogXp?: () => void;
  onAddContact?: () => void;
  onStartTimer?: () => void;
}

export default function QuickActionsWidget({
  onLogXp,
  onAddContact,
  onStartTimer,
}: QuickActionsWidgetProps) {
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      id: 'log-xp',
      label: 'XP loggen',
      icon: <Zap className="w-5 h-5" />,
      color: '#F59E0B',
      onClick: onLogXp,
    },
    {
      id: 'add-contact',
      label: 'Kontakt',
      icon: <UserPlus className="w-5 h-5" />,
      color: '#EC4899',
      onClick: onAddContact || (() => router.push('/contacts?action=new')),
    },
    {
      id: 'timer',
      label: 'Timer',
      icon: <Timer className="w-5 h-5" />,
      color: '#8B5CF6',
      onClick: onStartTimer,
    },
    {
      id: 'workout',
      label: 'Workout',
      icon: <Dumbbell className="w-5 h-5" />,
      color: '#10B981',
      href: '/gesundheit',
    },
    {
      id: 'book',
      label: 'Buch',
      icon: <BookOpen className="w-5 h-5" />,
      color: '#3B82F6',
      href: '/lernen',
    },
    {
      id: 'finance',
      label: 'Finanzen',
      icon: <PiggyBank className="w-5 h-5" />,
      color: '#14B8A6',
      href: '/finanzen',
    },
  ];

  const handleClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

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
      <div className="grid grid-cols-3 gap-2">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={() => handleClick(action)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${action.color}20`, color: action.color }}
            >
              {action.icon}
            </div>
            <span className="text-xs text-white/70 font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
