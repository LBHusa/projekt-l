'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, X, Loader2 } from 'lucide-react';

interface UseTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId: string;
  habitName: string;
  currentStreak: number;
  onTokenUsed: () => void;
}

export function UseTokenModal({
  isOpen,
  onClose,
  habitId,
  habitName,
  currentStreak,
  onTokenUsed,
}: UseTokenModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleUseToken() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/streak-insurance/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to use token');
      }

      onTokenUsed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Streak in Gefahr!
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Dein <strong>{currentStreak}-Tage-Streak</strong> fuer{' '}
            <strong>&quot;{habitName}&quot;</strong> wuerde heute brechen.
          </p>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">
                Streak-Schutz verwenden?
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                1 Token schuetzt deinen Streak fuer heute
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Streak brechen lassen
          </button>
          <button
            onClick={handleUseToken}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Token verwenden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
