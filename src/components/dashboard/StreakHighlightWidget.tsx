'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getHabitsWithLogs } from '@/lib/data/habits';
import type { HabitWithLogs } from '@/lib/database.types';
import HabitStreak from '@/components/habits/HabitStreak';
import { Flame, Trophy, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function StreakHighlightWidget() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreakHabits();
  }, []);

  const loadStreakHabits = async () => {
    setLoading(true);
    try {
      const allHabits = await getHabitsWithLogs(undefined, 1);

      // Filter: current_streak >= 3
      const streakHabits = allHabits.filter((h) => h.current_streak >= 3);

      // Sort: Descending by current_streak
      const sorted = streakHabits.sort(
        (a, b) => b.current_streak - a.current_streak
      );

      // Take top 6
      setHabits(sorted.slice(0, 6));
    } catch (error) {
      console.error('Error loading streak habits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Streak Champions
        </h2>
        <Link href="/habits">
          <span className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer transition">
            Alle →
          </span>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && habits.length === 0 && (
        <div className="text-center py-8">
          <Flame className="w-12 h-12 mx-auto mb-3 text-adaptive-dim" />
          <h3 className="text-base font-semibold text-white mb-1">
            Starte einen Streak! 🔥
          </h3>
          <p className="text-sm text-adaptive-muted mb-3">
            Erledige Habits 3 Tage hintereinander
          </p>
          <Link href="/habits">
            <button className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 rounded-lg transition">
              Zu Habits
            </button>
          </Link>
        </div>
      )}

      {/* Habit Streak Grid */}
      {!loading && habits.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {habits.map((habit, index) => {
            const isOnFire = habit.current_streak >= 7;
            const isPersonalRecord =
              habit.current_streak === habit.longest_streak;

            return (
              <Link key={habit.id} href="/habits">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-[var(--orb-border)] transition cursor-pointer group"
                >
                  {/* Habit Icon */}
                  <div className="text-2xl flex-shrink-0">{habit.icon}</div>

                  {/* Habit Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {habit.name}
                    </div>
                    <div className="text-xs text-adaptive-muted">
                      +{habit.xp_per_completion} XP
                    </div>
                  </div>

                  {/* Streak Display */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <HabitStreak
                      currentStreak={habit.current_streak}
                      longestStreak={habit.longest_streak}
                      size="sm"
                      showLongest={false}
                    />

                    {/* On Fire Badge */}
                    {isOnFire && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-medium"
                      >
                        🔥
                      </motion.div>
                    )}

                    {/* Personal Record Trophy */}
                    {isPersonalRecord && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                      >
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Show count if more habits exist */}
      {!loading && habits.length === 6 && (
        <Link href="/habits">
          <div className="mt-3 text-center text-xs text-adaptive-muted hover:text-purple-400 transition cursor-pointer">
            Weitere Streaks anzeigen →
          </div>
        </Link>
      )}
    </motion.div>
  );
}
