'use client';

import { useState, useEffect } from 'react';
import { Shield, ChevronRight, Loader2 } from 'lucide-react';
import type { TokenStats } from '@/lib/types/streak-insurance';

interface StreakInsuranceCardProps {
  className?: string;
  onViewDetails?: () => void;
}

export function StreakInsuranceCard({ className = '', onViewDetails }: StreakInsuranceCardProps) {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokenStats();
  }, []);

  async function fetchTokenStats() {
    try {
      setLoading(true);
      const response = await fetch('/api/streak-insurance/tokens');

      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching token stats:', err);
      setError('Konnte Tokens nicht laden');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const tokenCount = stats?.available || 0;

  return (
    <div
      className={`bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onViewDetails}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Streak-Schutz
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tokenCount === 0
                ? 'Keine Tokens verfuegbar'
                : `${tokenCount} Token${tokenCount !== 1 ? 's' : ''} verfuegbar`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {tokenCount}
          </span>
          {onViewDetails && (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {tokenCount > 0 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Schuetzt deine Streaks vor dem Brechen
        </p>
      )}
    </div>
  );
}
