'use client';

import { AlertTriangle, Heart, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { UserHealth } from '@/lib/database.types';
import { isInDangerZone } from '@/lib/data/health';

interface DangerZoneAlertProps {
  health: UserHealth;
}

/**
 * DangerZoneAlert - Warning UI for critically low HP
 *
 * Only renders when HP is below 20% (danger zone).
 * Provides actionable advice on how to heal and avoid damage.
 * Shows extra warning when user has only 1 life left.
 */
export default function DangerZoneAlert({ health }: DangerZoneAlertProps) {
  // Only show if user is in danger zone (HP < 20%)
  if (!isInDangerZone(health)) {
    return null;
  }

  const hpPercentage = Math.round((health.current_hp / health.max_hp) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-4"
    >
      <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 space-y-3 shadow-lg shadow-red-500/20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-red-400">Kritischer HP-Stand!</h3>
            <p className="text-sm text-red-300">
              Dein Avatar ist in Gefahr ({hpPercentage}% HP)
            </p>
          </div>
        </div>

        {/* Advice */}
        <div className="bg-red-950/50 rounded p-3 space-y-2">
          <p className="text-sm text-gray-300 flex items-start gap-2">
            <Heart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-green-400">HP wiederherstellen:</strong> Quests abschliessen (+10-40 HP),
              Habits tracken (+5 HP), Mood loggen (+2 HP)
            </span>
          </p>
          <p className="text-sm text-gray-300 flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-orange-400">Schaden vermeiden:</strong> Keine Quests scheitern lassen (-10 HP),
              Streaks halten (-5 HP bei Break)
            </span>
          </p>
        </div>

        {/* Lives warning - extra warning when only 1 life left */}
        {health.lives <= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-900/30 border border-orange-500/30 rounded p-2"
          >
            <p className="text-sm text-orange-300 text-center font-medium">
              Nur noch {health.lives} {health.lives === 1 ? 'Leben' : 'Leben'} uebrig! Bei 0 HP verlierst du ein Leben.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
