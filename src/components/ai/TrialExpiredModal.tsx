'use client';

/**
 * Trial Expired Modal
 * Shows when user tries to use AI after trial has expired
 */

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Key, Sparkles, Zap, Target, X } from 'lucide-react';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrialExpiredModal({ isOpen, onClose }: TrialExpiredModalProps) {
  const router = useRouter();

  const handleSetupKey = () => {
    router.push('/settings/integrations');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with icon */}
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-adaptive-muted" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-amber-500/30 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-adaptive">
                      Testphase abgelaufen
                    </h2>
                    <p className="text-sm text-adaptive-muted mt-1">
                      Deine 5 Stunden sind um
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-adaptive-muted mb-4">
                  Deine kostenlose Testphase für den KI-Assistenten ist
                  abgelaufen. Um weiterhin KI-Funktionen zu nutzen, hinterlege
                  deinen eigenen Anthropic API-Key.
                </p>

                {/* Features list */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-adaptive-muted">Quest-Generierung</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-adaptive-muted">Skill-Coaching</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-adaptive-muted">
                      Intelligente Vorschläge
                    </span>
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-200">
                    <strong>Tipp:</strong> Du kannst einen API-Key kostenlos bei{' '}
                    <a
                      href="https://console.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      console.anthropic.com
                    </a>{' '}
                    erstellen. Du zahlst nur für die tatsächliche Nutzung.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-adaptive-muted font-medium transition-colors"
                  >
                    Später
                  </button>
                  <button
                    onClick={handleSetupKey}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    API-Key einrichten
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
