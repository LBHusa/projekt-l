'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Sparkles } from 'lucide-react';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  type: 'skills' | 'habits';
}

export default function RegenerateModal({
  isOpen,
  onClose,
  onSubmit,
  type,
}: RegenerateModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    await onSubmit(feedback);
    setIsSubmitting(false);
    setFeedback('');
    onClose();
  };

  const typeLabel = type === 'skills' ? 'Skills' : 'Habits';
  const placeholderExamples = type === 'skills'
    ? 'z.B. "Ich brauche mehr Skills für Finanzen, weniger für Karriere. Außerdem fehlt Kochen als Hobby..."'
    : 'z.B. "Ich möchte mehr Fitness-Habits und weniger Arbeits-Habits. Bitte füge auch Meditation hinzu..."';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">
                  {typeLabel} mit Feedback regenerieren
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-adaptive-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-adaptive-muted mb-4">
              Erkläre der KI, was an den aktuellen {typeLabel} nicht passt.
              Je genauer dein Feedback, desto besser werden die neuen Vorschläge.
            </p>

            {/* Feedback textarea */}
            <div className="relative mb-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={placeholderExamples}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              />
              <div className="absolute bottom-2 right-2 text-xs text-adaptive-dim">
                {feedback.length}/500
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-adaptive-muted hover:text-white transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Neu generieren
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
