'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { getTodaysMood, getMoodEmoji, getMoodLabel } from '@/lib/data/geist';
import type { MoodValue } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';

interface MoodLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mood: MoodValue, note?: string) => Promise<void>;
}

const MOODS: MoodValue[] = ['great', 'good', 'okay', 'bad', 'terrible'];

export default function MoodLogModal({
  isOpen,
  onClose,
  onSubmit,
}: MoodLogModalProps) {
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingMood, setExistingMood] = useState<MoodValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  // Check if mood already logged today when modal opens
  useEffect(() => {
    if (isOpen) {
      checkTodaysMood();
      setNote('');
      setSelectedMood(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const checkTodaysMood = async () => {
    setLoading(true);
    try {
      const todaysMood = await getTodaysMood();
      if (todaysMood) {
        setExistingMood(todaysMood.mood as MoodValue);
        setSelectedMood(todaysMood.mood as MoodValue);
        setNote(todaysMood.note || '');
      } else {
        setExistingMood(null);
      }
    } catch (error) {
      console.error('Error checking todays mood:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;

    setSubmitting(true);
    try {
      await onSubmit(selectedMood, note || undefined);

      // Show success animation
      setSuccess(true);

      // Auto-close after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error logging mood:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stimmung loggen" size="sm">
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}

        {/* Success State */}
        {success && selectedMood && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-6xl mb-4"
            >
              {getMoodEmoji(selectedMood)}
            </motion.div>
            <p className="text-lg font-semibold text-white">
              Stimmung gespeichert!
            </p>
          </motion.div>
        )}

        {/* Form */}
        {!loading && !success && (
          <>
            {/* Existing Mood Notice */}
            {existingMood && (
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-sm text-adaptive">
                  Bereits geloggt:{' '}
                  <span className="font-semibold">
                    {getMoodEmoji(existingMood)} {getMoodLabel(existingMood)}
                  </span>
                </p>
                <p className="text-xs text-adaptive-muted mt-1">
                  Möchtest du deine Stimmung aktualisieren?
                </p>
              </div>
            )}

            {/* Mood Buttons */}
            <div className="space-y-2">
              <label className="text-sm text-adaptive font-medium block">
                Wie fühlst du dich?
              </label>
              <div className="flex flex-col gap-2">
                {MOODS.map((mood) => {
                  const isSelected = selectedMood === mood;
                  return (
                    <motion.button
                      key={mood}
                      onClick={() => setSelectedMood(mood)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/50'
                          : 'bg-white/5 border-[var(--orb-border)] hover:bg-white/10'
                      }`}
                    >
                      <span className="text-3xl">{getMoodEmoji(mood)}</span>
                      <span className="flex-1 text-left font-medium text-white">
                        {getMoodLabel(mood)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <label
                htmlFor="mood-note"
                className="text-sm text-adaptive font-medium block"
              >
                Wie fühlst du dich? (optional)
              </label>
              <textarea
                id="mood-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Notiere deine Gedanken..."
                className="w-full px-3 py-2 bg-white/5 border border-[var(--orb-border)] rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              />
              <div className="text-xs text-adaptive-dim text-right">
                {note.length}/200
              </div>
            </div>

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
                disabled={!selectedMood || submitting}
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
