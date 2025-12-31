'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp, Calendar, Award } from 'lucide-react';
import type { FactionWithStats } from '@/lib/database.types';

interface FactionStatsBarProps {
  faction: FactionWithStats;
  skillCount?: number;
  additionalStats?: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
  }[];
}

export default function FactionStatsBar({
  faction,
  skillCount = 0,
  additionalStats = [],
}: FactionStatsBarProps) {
  const stats = faction.stats;
  const totalXp = stats?.total_xp || 0;
  const weeklyXp = stats?.weekly_xp || 0;
  const monthlyXp = stats?.monthly_xp || 0;

  const baseStats = [
    {
      label: 'Gesamt XP',
      value: totalXp.toLocaleString(),
      icon: <Zap className="w-4 h-4" />,
      color: 'text-yellow-400',
    },
    {
      label: 'Diese Woche',
      value: `+${weeklyXp.toLocaleString()}`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: weeklyXp > 0 ? 'text-green-400' : 'text-white/40',
    },
    {
      label: 'Dieser Monat',
      value: `+${monthlyXp.toLocaleString()}`,
      icon: <Calendar className="w-4 h-4" />,
      color: monthlyXp > 0 ? 'text-blue-400' : 'text-white/40',
    },
    {
      label: 'Skills',
      value: skillCount,
      icon: <Award className="w-4 h-4" />,
      color: 'text-purple-400',
    },
  ];

  const allStats = [...baseStats, ...additionalStats];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {allStats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
        >
          <div className={`flex items-center gap-2 text-white/50 mb-1 ${stat.color}`}>
            {stat.icon}
            <span className="text-sm">{stat.label}</span>
          </div>
          <div className="text-2xl font-bold">{stat.value}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
