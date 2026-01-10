'use client';

import { motion } from 'framer-motion';
import { Users, Briefcase, Euro, Clock, TrendingUp } from 'lucide-react';
import type { FreelancerStats as FreelancerStatsType } from '@/lib/data/freelancer';

interface FreelancerStatsProps {
  stats: FreelancerStatsType;
}

export function FreelancerStats({ stats }: FreelancerStatsProps) {
  const statCards = [
    {
      label: 'Kunden',
      value: `${stats.activeClients} / ${stats.totalClients}`,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      label: 'Projekte',
      value: `${stats.activeProjects} aktiv`,
      subValue: `${stats.completedProjects} abgeschlossen`,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      label: 'Umsatz',
      value: new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(stats.totalRevenue),
      icon: <Euro className="w-5 h-5" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
    {
      label: 'Stunden',
      value: `${Math.round(stats.totalHours)}h`,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
  ];

  if (stats.avgHourlyRate > 0) {
    statCards.push({
      label: '⌀ Stundensatz',
      value: `${Math.round(stats.avgHourlyRate)}€/h`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center mb-3`}>
            <div className={stat.color}>{stat.icon}</div>
          </div>
          <div className="text-sm text-white/60 mb-1">{stat.label}</div>
          <div className="text-lg font-bold">{stat.value}</div>
          {stat.subValue && (
            <div className="text-xs text-white/50 mt-1">{stat.subValue}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
