'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, ChevronRight, Flame } from 'lucide-react';
import type { DailyTimeStats } from '@/lib/database.types';

interface TimeTrackingWidgetProps {
  maxStreak?: number;
}

export default function TimeTrackingWidget({ maxStreak }: TimeTrackingWidgetProps) {
  const [stats, setStats] = useState<DailyTimeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/habits/time-stats/today');
      if (!response.ok) throw new Error('Failed to load time stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading time stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-white/10 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-8 bg-white/5 rounded-lg" />
            <div className="h-8 bg-white/5 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const productive = stats.filter(s => s.is_productive).reduce((sum, s) => sum + s.total_minutes, 0);
  const negative = stats.filter(s => s.is_negative).reduce((sum, s) => sum + s.total_minutes, 0);
  const neutral = stats.filter(s => !s.is_productive && !s.is_negative).reduce((sum, s) => sum + s.total_minutes, 0);
  const total = productive + negative + neutral;

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider">
            Zeit heute
          </h3>
        </div>
        <Link
          href="/habits"
          className="text-xs text-adaptive-dim hover:text-adaptive-muted flex items-center gap-1 transition-colors"
        >
          Details
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-adaptive-dim text-sm mb-2">Noch keine Zeit geloggt</p>
          <Link
            href="/habits"
            className="text-xs text-[var(--accent-primary)] hover:underline"
          >
            Zeit tracken
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Line */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">{formatTime(productive)}</span>
                <span className="text-adaptive-dim text-xs">produktiv</span>
              </div>
              {negative > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">{formatTime(negative)}</span>
                  <span className="text-adaptive-dim text-xs">verloren</span>
                </div>
              )}
            </div>
            {maxStreak && maxStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3 h-3" />
                <span className="text-xs font-medium">{maxStreak}</span>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="space-y-2">
            {stats
              .sort((a, b) => b.total_minutes - a.total_minutes)
              .slice(0, 5)
              .map((stat) => (
                <div
                  key={stat.category_id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{stat.category_icon}</span>
                    <span className="text-adaptive-muted truncate">{stat.category_name}</span>
                  </div>
                  <span
                    className={`font-medium ${
                      stat.is_productive
                        ? 'text-green-400'
                        : stat.is_negative
                        ? 'text-red-400'
                        : 'text-adaptive-dim'
                    }`}
                  >
                    {formatTime(stat.total_minutes)}
                  </span>
                </div>
              ))}
          </div>

          {/* Visual Progress Bar */}
          {total > 0 && (
            <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
              {productive > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(productive / total) * 100}%` }}
                  title={`Produktiv: ${formatTime(productive)}`}
                />
              )}
              {neutral > 0 && (
                <div
                  className="bg-gray-500 h-full"
                  style={{ width: `${(neutral / total) * 100}%` }}
                  title={`Neutral: ${formatTime(neutral)}`}
                />
              )}
              {negative > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${(negative / total) * 100}%` }}
                  title={`Verloren: ${formatTime(negative)}`}
                />
              )}
            </div>
          )}

          {/* Total Time */}
          <div className="text-center text-xs text-adaptive-dim pt-2 border-t border-white/10">
            Gesamt: {formatTime(total)}
          </div>
        </div>
      )}
    </motion.div>
  );
}
