'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, MoreVertical, Trash2, Edit2, Bell, Shield, AlertTriangle } from 'lucide-react';
import type { HabitWithLogs } from '@/lib/database.types';
import HabitStreak from './HabitStreak';

interface HabitCardProps {
  habit: HabitWithLogs;
  onComplete: (habitId: string, completed: boolean) => Promise<void>;
  onResist?: (habitId: string) => Promise<void>;
  onRelapse?: (habitId: string) => Promise<void>;
  onEdit?: (habit: HabitWithLogs) => void;
  onDelete?: (habitId: string) => void;
  onShowReminders?: (habitId: string) => void;
  compact?: boolean;
}

/**
 * Calculate "days clean" from streak_start_date for negative habits
 */
function calculateDaysClean(habit: HabitWithLogs): number {
  if (habit.habit_type !== 'negative' || !habit.streak_start_date) {
    return habit.current_streak;
  }
  const start = new Date(habit.streak_start_date);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function HabitCard({
  habit,
  onComplete,
  onResist,
  onRelapse,
  onEdit,
  onDelete,
  onShowReminders,
  compact = false,
}: HabitCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);

  const isPositive = habit.habit_type === 'positive';
  const isNegative = habit.habit_type === 'negative';
  const isCompleted = habit.completedToday;

  // For negative habits, calculate days clean from streak_start_date
  const daysClean = isNegative ? calculateDaysClean(habit) : habit.current_streak;

  // Check if resistance was already confirmed today
  const today = new Date().toISOString().split('T')[0];
  const resistedToday = isNegative && habit.last_resistance_at === today;

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onComplete(habit.id, !isCompleted);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResist = async () => {
    if (isLoading || !onResist) return;

    setIsLoading(true);
    try {
      await onResist(habit.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelapse = async () => {
    if (isLoading || !onRelapse) return;

    setIsLoading(true);
    try {
      await onRelapse(habit.id);
      setShowRelapseConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
          isCompleted || resistedToday
            ? 'bg-green-500/20 border border-green-500/30'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <button
          onClick={isNegative && onResist ? handleResist : handleToggle}
          disabled={isLoading || (isNegative && resistedToday)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isCompleted || resistedToday
              ? 'bg-green-500 text-white'
              : isPositive
              ? 'bg-white/10 text-adaptive-muted hover:bg-white/20'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          } ${isLoading ? 'opacity-50' : ''}`}
        >
          {isCompleted || resistedToday ? (
            <Check className="w-5 h-5" />
          ) : isPositive ? (
            <span className="text-lg">{habit.icon}</span>
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className={`font-medium ${isCompleted ? 'line-through text-adaptive-muted' : ''}`}>
            {habit.name}
          </span>
          {isNegative && daysClean > 0 && (
            <span className="ml-2 text-xs text-emerald-400">
              {daysClean} {daysClean === 1 ? 'Tag' : 'Tage'} clean
            </span>
          )}
        </div>

        {(isPositive ? habit.current_streak : daysClean) > 0 && (
          <HabitStreak
            currentStreak={isPositive ? habit.current_streak : daysClean}
            longestStreak={habit.longest_streak}
            size="sm"
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative p-4 rounded-xl transition-all ${
        isCompleted
          ? 'bg-green-500/20 border border-green-500/30'
          : 'bg-[var(--background-secondary)] border border-[var(--orb-border)]'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: `${habit.color}20` }}
          >
            {habit.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${isCompleted ? 'line-through text-adaptive-muted' : ''}`}>
              {habit.name}
            </h3>
            {habit.description && (
              <p className="text-sm text-adaptive-muted line-clamp-1">{habit.description}</p>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-white/10 text-adaptive-dim hover:text-adaptive-muted"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg shadow-lg py-1 min-w-32">
                {onShowReminders && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onShowReminders(habit.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Erinnerungen
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(habit);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(habit.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 text-red-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-adaptive-muted">
          {isPositive ? (
            <span>{habit.total_completions} mal erledigt</span>
          ) : (
            <>
              <span className="text-emerald-400 font-medium">
                {daysClean} {daysClean === 1 ? 'Tag' : 'Tage'} clean 🛡️
              </span>
              {habit.total_completions > 0 && (
                <span className="text-amber-400/60">
                  {habit.total_completions} Rückfälle
                </span>
              )}
            </>
          )}
          {habit.faction_id && (
            <span className="px-2 py-0.5 rounded bg-white/10 text-xs capitalize">
              {habit.faction_id}
            </span>
          )}
        </div>

        <HabitStreak
          currentStreak={isPositive ? habit.current_streak : daysClean}
          longestStreak={habit.longest_streak}
          showLongest
        />
      </div>

      {/* Action Buttons */}
      {isPositive ? (
        // Positive habit: Single toggle button
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isCompleted
              ? 'bg-green-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isCompleted ? (
            <>
              <Check className="w-5 h-5" />
              Erledigt!
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Als erledigt markieren
            </>
          )}
        </button>
      ) : (
        // Negative habit: Resist and Relapse buttons
        <>
          {showRelapseConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-amber-400 mb-2">
                Bist du sicher? Das setzt deinen Streak zurück.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRelapseConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleRelapse}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-all flex items-center justify-center gap-1"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Rückfall loggen
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleResist}
                disabled={isLoading || resistedToday}
                className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  resistedToday
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : resistedToday ? (
                  <>
                    <Check className="w-5 h-5" />
                    Heute bestätigt!
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Widerstanden (+10 XP)
                  </>
                )}
              </button>
              {onRelapse && (
                <button
                  onClick={() => setShowRelapseConfirm(true)}
                  disabled={isLoading}
                  className="px-4 py-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
                  title="Rückfall melden"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* XP Badge */}
      {isPositive && habit.xp_per_completion > 0 && (
        <div className="absolute top-3 right-12 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">
          +{habit.xp_per_completion} XP
        </div>
      )}

      {/* Negative habit resistance count badge */}
      {isNegative && (habit.resistance_count || 0) > 0 && (
        <div className="absolute top-3 right-12 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">
          {habit.resistance_count}x widerstanden
        </div>
      )}
    </motion.div>
  );
}
