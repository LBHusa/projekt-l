'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Zap, CheckCircle, Trophy, TrendingUp } from 'lucide-react';
import type { WeeklySummaryData } from '@/app/api/reports/weekly/route';

export default function WeeklySummary() {
  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/reports/weekly');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching weekly summary:', err);
        setError('Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-white/10 rounded w-40 mb-4" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded-lg" />
            ))}
          </div>
          <div className="h-20 bg-white/10 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="text-center py-6 text-white/40">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{error || 'Keine Daten verfügbar'}</p>
        </div>
      </div>
    );
  }

  const maxXp = Math.max(...data.factionBreakdown.map(f => f.xp), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-white/60" />
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Wochenübersicht
        </h3>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          value={data.weeklyXp.toLocaleString('de-DE')}
          label="XP"
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          value={data.habitsCompleted}
          label="Habits"
          color="green"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-purple-400" />}
          value={data.achievementsUnlocked}
          label="Erfolge"
          color="purple"
        />
      </div>

      {/* Top Faction */}
      {data.topFaction && (
        <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Top Bereich</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-white/90 font-medium">
              {data.topFaction.icon} {data.topFaction.name}
            </span>
            <span className="text-green-400 text-sm">
              +{data.topFaction.xp.toLocaleString('de-DE')} XP
            </span>
          </div>
        </div>
      )}

      {/* Faction Breakdown */}
      {data.factionBreakdown.length > 0 && (
        <div className="space-y-2">
          {data.factionBreakdown.slice(0, 5).map((faction, index) => (
            <motion.div
              key={faction.factionId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="w-6 text-center">{faction.icon}</span>
              <span className="w-20 text-sm text-white/70 truncate">{faction.name}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(faction.xp / maxXp) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: faction.color }}
                />
              </div>
              <span className="w-16 text-right text-sm text-white/50">
                {faction.xp.toLocaleString('de-DE')}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {data.factionBreakdown.length === 0 && !data.topFaction && (
        <div className="text-center py-4 text-white/40 text-sm">
          Noch keine Aktivitäten diese Woche
        </div>
      )}
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'yellow' | 'green' | 'purple';
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const colorClasses = {
    yellow: 'border-yellow-400/20 bg-yellow-400/5',
    green: 'border-green-400/20 bg-green-400/5',
    purple: 'border-purple-400/20 bg-purple-400/5',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
      </div>
      <div className="text-xl font-bold text-white/90">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
