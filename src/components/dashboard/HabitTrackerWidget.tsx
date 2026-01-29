'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, ChevronRight, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { getTodaysHabits, logHabitCompletion } from '@/lib/data/habits';
import type { HabitWithLogs } from '@/lib/database.types';

interface HabitTrackerWidgetProps {
  initialHabits?: HabitWithLogs[];
  onRefresh?: () => void;
}

export default function HabitTrackerWidget({ initialHabits, onRefresh }: HabitTrackerWidgetProps) {
  const [habits, setHabits] = useState<HabitWithLogs[]>(initialHabits || []);
  const [loading, setLoading] = useState(!initialHabits);
  const [error, setError] = useState<string | null>(null);

  const loadHabits = async () => {
    setError(null);
    try {
      const data = await getTodaysHabits();
      setHabits(data);
    } catch (err) {
      console.error('Error loading habits:', err);
      setError('Habits konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if no initial data provided
    if (!initialHabits) {
      loadHabits();
    }
  }, [initialHabits]);

  const handleToggle = async (habitId: string, completed: boolean) => {
    try {
      await logHabitCompletion(habitId, !completed);
      await loadHabits();
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  };

  // Memoize filtered arrays to prevent unnecessary recalculations
  const positiveHabits = useMemo(
    () => habits.filter(h => h.habit_type === 'positive'),
    [habits]
  );
  const negativeHabits = useMemo(
    () => habits.filter(h => h.habit_type === 'negative'),
    [habits]
  );
  const completedCount = useMemo(
    () => positiveHabits.filter(h => h.completedToday).length,
    [positiveHabits]
  );
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

  if (error) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider">
            Habits heute
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadHabits();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            <RefreshCw className="w-3 h-3" />
            Erneut versuchen
          </button>
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
          <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider">
            Habits heute
          </h3>
        </div>
        <Link
          href="/habits"
          className="text-xs text-adaptive-dim hover:text-adaptive-muted flex items-center gap-1 transition-colors"
        >
          Alle anzeigen
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress Bar */}
      {totalPositive > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-adaptive-muted mb-1">
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
          <p className="text-adaptive-dim text-sm mb-2">Keine Habits für heute</p>
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
              className="block text-center text-xs text-adaptive-dim hover:text-adaptive-muted py-2 transition-colors"
            >
              +{habits.length - 6} weitere Habits
            </Link>
          )}
        </div>
      )}

      {/* Streak Summary */}
      {habits.some(h => h.current_streak > 0) && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-adaptive-muted">
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

// Memoized HabitItem to prevent unnecessary re-renders
const HabitItem = memo(function HabitItem({ habit, onToggle, isNegative }: HabitItemProps) {
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
            : 'bg-white/10 text-adaptive-muted'
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
        <span className={`text-sm ${isCompleted ? 'line-through text-adaptive-muted' : ''}`}>
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
});
