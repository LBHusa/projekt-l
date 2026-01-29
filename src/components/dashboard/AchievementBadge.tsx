'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { AchievementWithProgress, AchievementStats } from '@/lib/data/achievements';
import { getAchievementStats } from '@/lib/data/achievements';

interface AchievementBadgeWidgetProps {
  initialStats?: AchievementStats;
  onRefresh?: () => void;
}

export default function AchievementBadgeWidget({ initialStats, onRefresh }: AchievementBadgeWidgetProps) {
  const [stats, setStats] = useState<{
    total: number;
    unlocked: number;
    recentUnlocks: AchievementWithProgress[];
  } | null>(initialStats ? {
    total: initialStats.total,
    unlocked: initialStats.unlocked,
    recentUnlocks: initialStats.recentUnlocks,
  } : null);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    // Only fetch if no initial data provided
    if (initialStats) return;

    async function loadStats() {
      try {
        const data = await getAchievementStats();
        setStats({
          total: data.total,
          unlocked: data.unlocked,
          recentUnlocks: data.recentUnlocks,
        });
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [initialStats]);

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4 animate-pulse">
        <div className="h-6 bg-white/10 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          <div className="h-16 bg-white/5 rounded"></div>
          <div className="h-16 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider">
            Achievements
          </h3>
        </div>
        <Link
          href="/achievements"
          className="text-xs text-adaptive-dim hover:text-adaptive-muted flex items-center gap-1"
        >
          Alle anzeigen <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-adaptive-muted">Fortschritt</span>
          <span className="text-adaptive-dim">
            {stats?.unlocked || 0} / {stats?.total || 0}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{
              width: `${stats ? (stats.unlocked / stats.total) * 100 : 0}%`,
            }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
        </div>
      </div>

      {/* Recent Unlocks */}
      <div className="space-y-2">
        {stats?.recentUnlocks && stats.recentUnlocks.length > 0 ? (
          stats.recentUnlocks.slice(0, 3).map(achievement => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
            >
              <span className="text-2xl">{achievement.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{achievement.name}</p>
                <p className="text-xs text-yellow-400">+{achievement.xp_reward} XP</p>
              </div>
              <div className="text-xs text-adaptive-dim opacity-60">
                {achievement.rarity === 'legendary' && '👑'}
                {achievement.rarity === 'epic' && '💎'}
                {achievement.rarity === 'rare' && '✨'}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-4 text-adaptive-dim text-sm">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Noch keine Achievements freigeschaltet</p>
            <p className="text-xs mt-1">Schließe Aufgaben ab um welche zu bekommen!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
