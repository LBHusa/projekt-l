'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/Modal';
import { getTodaysHabits, logHabitCompletion } from '@/lib/data/habits';
import type { HabitWithLogs } from '@/lib/database.types';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface HabitCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (habitIds: string[]) => Promise<void>;
}

export default function HabitCompletionModal({
  isOpen,
  onClose,
  onComplete,
}: HabitCompletionModalProps) {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [totalXpGained, setTotalXpGained] = useState(0);

  // Load habits when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHabits();
      setSelectedIds(new Set());
      setSuccess(false);
      setTotalXpGained(0);
    }
  }, [isOpen]);

  const loadHabits = async () => {
    setLoading(true);
    try {
      const todaysHabits = await getTodaysHabits();

      // Filter: incomplete + positive habits only
      const incompletePositive = todaysHabits.filter(
        (h) => !h.completedToday && h.habit_type === 'positive'
      );

      setHabits(incompletePositive);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = (habitId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(habits.map((h) => h.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const calculateTotalXP = () => {
    return habits
      .filter((h) => selectedIds.has(h.id))
      .reduce((sum, h) => sum + h.xp_per_completion, 0);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const habitIdsArray = Array.from(selectedIds);

      // Batch complete habits
      const results = await Promise.all(
        habitIdsArray.map((id) => logHabitCompletion(id, true))
      );

      // Calculate total XP gained (including streak bonuses)
      const totalXP = results.reduce((sum, result) => {
        return sum + (result?.xpGained || 0);
      }, 0);

      setTotalXpGained(totalXP);
      setSuccess(true);

      // Call parent handler
      await onComplete(habitIdsArray);

      // Auto-close after success animation
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error completing habits:', error);
      // TODO: Show error message
    } finally {
      setSubmitting(false);
    }
  };

  const totalXpPreview = calculateTotalXP();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Habit erledigen" size="md">
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}

        {/* Success State */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedIds.size} Habit{selectedIds.size > 1 ? 's' : ''} erledigt!
            </h3>
            <p className="text-2xl font-bold text-green-400">
              +{totalXpGained} XP
            </p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !success && habits.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Alle Habits für heute erledigt!
            </h3>
            <p className="text-adaptive-muted mb-4">
              Großartig! Alle deine Habits sind geschafft.
            </p>
            <Link href="/habits">
              <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition">
                Neue Habits erstellen
              </button>
            </Link>
          </div>
        )}

        {/* Habit List */}
        {!loading && !success && habits.length > 0 && (
          <>
            {/* Select All / Deselect All */}
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={selectedIds.size === habits.length}
                className="flex-1 px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Alle auswählen
              </button>
              <button
                onClick={deselectAll}
                disabled={selectedIds.size === 0}
                className="flex-1 px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Auswahl aufheben
              </button>
            </div>

            {/* Habit Checkboxes */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {habits.map((habit) => {
                const isSelected = selectedIds.has(habit.id);
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-[var(--orb-border)] hover:bg-white/10'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-white/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Habit Icon */}
                    <div className="text-2xl">{habit.icon}</div>

                    {/* Habit Info */}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-adaptive">{habit.name}</div>
                      <div className="text-xs text-adaptive-muted">
                        +{habit.xp_per_completion} XP
                        {habit.current_streak > 0 && (
                          <span className="ml-2">
                            🔥 {habit.current_streak} Tage
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Total XP Preview */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <span className="text-adaptive">
                  {selectedIds.size} Habit{selectedIds.size > 1 ? 's' : ''}{' '}
                  ausgewählt
                </span>
                <span className="text-lg font-bold text-purple-400">
                  Gesamt: +{totalXpPreview} XP
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || submitting}
                className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
