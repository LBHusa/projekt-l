'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Flame, AlertCircle, TrendingDown, Award } from 'lucide-react';

interface PrestigeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentPrestigeLevel: number;
}

/**
 * PrestigeModal - Shown when user reaches 0 lives (game over)
 *
 * Explains the prestige system and requires explicit user confirmation
 * before resetting HP/lives and applying XP penalty.
 *
 * Features:
 * - Clear explanation of what prestige does
 * - Shows consequences (10% XP loss in all factions)
 * - Shows rewards (Phoenix badge, new prestige level)
 * - Requires user confirmation (cannot be dismissed by clicking outside)
 * - Disabled state during processing
 */
export default function PrestigeModal({
  isOpen,
  onClose,
  currentPrestigeLevel,
  onConfirm
}: PrestigeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Prestige failed:', err);
      setError('Prestige fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Prevent closing by clicking outside or pressing escape
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Phoenix-Prestige" size="lg">
      <div className="space-y-6">
        {/* Header with Phoenix icon */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center border border-orange-500/50">
            <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <p className="text-gray-400">
            Du hast alle Leben verloren. Zeit fuer einen Neuanfang.
          </p>
        </div>

        {/* Explanation sections */}
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
          {/* What happens */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-adaptive">Was passiert beim Prestige?</h3>
              <p className="text-sm text-gray-400 mt-1">
                Du erhaeltst <strong className="text-green-400">3 neue Leben</strong> und <strong className="text-green-400">100 HP</strong>. Dein Avatar wird wiedergeboren.
              </p>
            </div>
          </div>

          {/* Consequences */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-adaptive">Konsequenzen</h3>
              <p className="text-sm text-gray-400 mt-1">
                Du verlierst <strong className="text-red-400">10% XP in allen Factions</strong>.
                Das ist spuerbar, aber du kannst dich davon erholen.
              </p>
            </div>
          </div>

          {/* Rewards */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-adaptive">Belohnungen</h3>
              <p className="text-sm text-gray-400 mt-1">
                Du erhaeltst das <strong className="text-purple-400">Phoenix Badge (Prestige {currentPrestigeLevel + 1})</strong> als
                Zeichen deiner Widerstandsfaehigkeit.
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
          <p className="text-sm text-orange-300 text-center">
            Diese Entscheidung ist endgueltig. Ueberlege gut, ob du bereit bist.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            Noch nicht bereit
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wiedergeburt...
              </span>
            ) : (
              'Phoenix-Prestige akzeptieren'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
