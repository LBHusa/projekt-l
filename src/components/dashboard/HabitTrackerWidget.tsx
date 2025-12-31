'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, ChevronRight, Check, X } from 'lucide-react';
import { getTodaysHabits, logHabitCompletion } from '@/lib/data/habits';
import type { HabitWithLogs } from '@/lib/database.types';

export default function HabitTrackerWidget() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = async () => {
    try {
      const data = await getTodaysHabits();
      setHabits(data);
    } catch (err) {
      console.error('Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const handleToggle = async (habitId: string, completed: boolean) => {
    try {
      await logHabitCompletion(habitId, !completed);
      await loadHabits();
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  };

  const positiveHabits = habits.filter(h => h.habit_type === 'positive');
  const negativeHabits = habits.filter(h => h.habit_type === 'negative');
  const completedCount = positiveHabits.filter(h => h.completedToday).length;
  const totalPositive = positiveHabits.length;

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-white/10 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-white/5 rounded-lg" />
            <div className="h-12 bg-white/5 rounded-lg" />
            <div className="h-12 bg-white/5 rounded-lg" />
          </div>
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
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Habits heute
          </h3>
        </div>
        <Link
          href="/habits"
          className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
        >
          Alle anzeigen
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress Bar */}
      {totalPositive > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>{completedCount} von {totalPositive} erledigt</span>
            <span>{Math.round((completedCount / totalPositive) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalPositive) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-white/40 text-sm mb-2">Keine Habits für heute</p>
          <Link
            href="/habits"
            className="text-xs text-[var(--accent-primary)] hover:underline"
          >
            Habit erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Positive Habits */}
          {positiveHabits.slice(0, 4).map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onToggle={handleToggle}
            />
          ))}

          {/* Negative Habits */}
          {negativeHabits.slice(0, 2).map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onToggle={handleToggle}
              isNegative
            />
          ))}

          {/* Show more hint */}
          {habits.length > 6 && (
            <Link
              href="/habits"
              className="block text-center text-xs text-white/40 hover:text-white/60 py-2 transition-colors"
            >
              +{habits.length - 6} weitere Habits
            </Link>
          )}
        </div>
      )}

      {/* Streak Summary */}
      {habits.some(h => h.current_streak > 0) && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>
              Beste Streak: {Math.max(...habits.map(h => h.current_streak))} Tage
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface HabitItemProps {
  habit: HabitWithLogs;
  onToggle: (habitId: string, completed: boolean) => Promise<void>;
  isNegative?: boolean;
}

function HabitItem({ habit, onToggle, isNegative }: HabitItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isCompleted = habit.completedToday;

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onToggle(habit.id, isCompleted);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
        isCompleted
          ? 'bg-green-500/20 border border-green-500/30'
          : isNegative
          ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      } ${isLoading ? 'opacity-50' : ''}`}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCompleted
            ? 'bg-green-500 text-white'
            : isNegative
            ? 'bg-red-500/20 text-red-400'
            : 'bg-white/10 text-white/60'
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isCompleted ? (
          <Check className="w-4 h-4" />
        ) : isNegative ? (
          <X className="w-4 h-4" />
        ) : (
          <span className="text-sm">{habit.icon}</span>
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <span className={`text-sm ${isCompleted ? 'line-through text-white/50' : ''}`}>
          {habit.name}
        </span>
      </div>

      {habit.current_streak > 0 && (
        <div className="flex items-center gap-1 text-xs text-orange-400">
          <Flame className="w-3 h-3" />
          <span>{habit.current_streak}</span>
        </div>
      )}

      {!isNegative && habit.xp_per_completion > 0 && !isCompleted && (
        <span className="text-xs text-yellow-400/70">+{habit.xp_per_completion}</span>
      )}
    </motion.button>
  );
}
