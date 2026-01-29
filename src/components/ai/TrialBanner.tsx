'use client';

/**
 * Trial Banner Component
 * Shows AI trial countdown or expiration status
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Key, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrialBannerProps {
  /** Remaining minutes of trial */
  remainingMinutes: number;
  /** Whether trial is still active */
  isInTrial: boolean;
  /** Whether user has their own API key */
  hasOwnKey: boolean;
  /** Class name for styling */
  className?: string;
}

export function TrialBanner({
  remainingMinutes: initialMinutes,
  isInTrial: initialIsInTrial,
  hasOwnKey,
  className = '',
}: TrialBannerProps) {
  const [remainingMinutes, setRemainingMinutes] = useState(initialMinutes);
  const [isInTrial, setIsInTrial] = useState(initialIsInTrial);

  // Update countdown every minute
  useEffect(() => {
    if (!isInTrial || hasOwnKey) return;

    const interval = setInterval(() => {
      setRemainingMinutes((prev) => {
        const newValue = Math.max(0, prev - 1);
        if (newValue === 0) {
          setIsInTrial(false);
        }
        return newValue;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isInTrial, hasOwnKey]);

  // Don't show banner if user has their own key
  if (hasOwnKey) {
    return null;
  }

  // Format time display
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

  // Trial expired
  if (!isInTrial) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg p-3 ${className}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-200">
              KI-Trial abgelaufen
            </span>
          </div>
          <Link
            href="/settings/integrations"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 rounded-md text-sm font-medium transition-colors"
          >
            <Key className="w-4 h-4" />
            API-Key einrichten
          </Link>
        </div>
      </motion.div>
    );
  }

  // Determine urgency level
  const isUrgent = remainingMinutes < 60; // Less than 1 hour
  const isVeryUrgent = remainingMinutes < 30; // Less than 30 minutes

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${
        isVeryUrgent
          ? 'from-red-500/20 to-orange-500/20 border-red-500/40'
          : isUrgent
            ? 'from-amber-500/20 to-yellow-500/20 border-amber-500/40'
            : 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40'
      } border rounded-lg p-3 ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isVeryUrgent ? (
            <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
          ) : (
            <Sparkles className="w-5 h-5 text-cyan-400" />
          )}
          <span
            className={`text-sm font-medium ${
              isVeryUrgent
                ? 'text-red-200'
                : isUrgent
                  ? 'text-amber-200'
                  : 'text-cyan-200'
            }`}
          >
            KI-Test: noch {timeDisplay}
          </span>
          <Clock
            className={`w-4 h-4 ${
              isVeryUrgent
                ? 'text-red-400'
                : isUrgent
                  ? 'text-amber-400'
                  : 'text-cyan-400'
            }`}
          />
        </div>
        <Link
          href="/settings/integrations"
          className={`flex items-center gap-1.5 px-3 py-1.5 ${
            isVeryUrgent
              ? 'bg-red-500/30 hover:bg-red-500/40 text-red-200'
              : isUrgent
                ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-200'
                : 'bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-200'
          } rounded-md text-sm font-medium transition-colors`}
        >
          <Key className="w-4 h-4" />
          Key einrichten
        </Link>
      </div>
    </motion.div>
  );
}
