'use client';

/**
 * Welcome Trial Modal
 * Shows after onboarding completion to inform user about 5h AI trial
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Target, Rocket, X } from 'lucide-react';

interface WelcomeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string | null;
}

export function WelcomeTrialModal({
  isOpen,
  onClose,
  username,
}: WelcomeTrialModalProps) {
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with celebration animation */}
              <div className="bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-green-500/30 p-6 relative overflow-hidden">
                {/* Animated sparkles */}
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      initial={{
                        x: Math.random() * 400,
                        y: Math.random() * 100,
                        scale: 0,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.3,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                  ))}
                </motion.div>

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-adaptive-muted" />
                </button>

                <div className="relative text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto mb-4"
                  >
                    <Rocket className="w-8 h-8 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-adaptive"
                  >
                    Willkommen{username ? `, ${username}` : ''}!
                  </motion.h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-adaptive-muted mb-6"
                >
                  Du kannst den KI-Assistenten jetzt{' '}
                  <span className="text-cyan-400 font-semibold">5 Stunden</span>{' '}
                  kostenlos testen!
                </motion.p>

                {/* Features list */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <span className="font-medium text-adaptive">
                        Quest-Generierung
                      </span>
                      <p className="text-xs text-adaptive-muted">
                        KI erstellt personalisierte Aufgaben
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <span className="font-medium text-adaptive">
                        Skill-Coaching
                      </span>
                      <p className="text-xs text-adaptive-muted">
                        Persönlicher Lern-Assistent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <span className="font-medium text-adaptive">
                        Intelligente Vorschläge
                      </span>
                      <p className="text-xs text-adaptive-muted">
                        Empfehlungen basierend auf deinem Profil
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Info note */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 mb-6"
                >
                  <p className="text-xs text-adaptive-muted text-center">
                    Danach benötigst du deinen eigenen API-Key, den du unter
                    Einstellungen einrichten kannst.
                  </p>
                </motion.div>

                {/* CTA Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <Rocket className="w-5 h-5" />
                  Los geht&apos;s!
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
