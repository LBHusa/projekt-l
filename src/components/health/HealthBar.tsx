'use client';

import { motion } from 'framer-motion';
import { Heart, HeartPulse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUserHealth } from '@/lib/data/health';
import type { UserHealth } from '@/lib/database.types';

interface HealthBarProps {
  userId?: string;
  showDetails?: boolean;
  showLives?: boolean;
  className?: string;
}

export default function HealthBar({
  userId,
  showDetails = true,
  showLives = true,
  className = ''
}: HealthBarProps) {
  const [health, setHealth] = useState<UserHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await getUserHealth(userId);
        setHealth(data);
      } catch (error) {
        console.error('Failed to load health:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHealth();
  }, [userId]);

  if (isLoading || !health) {
    return (
      <div className={`animate-pulse bg-gray-800 h-10 rounded-lg ${className}`} />
    );
  }

  const percentage = Math.max(0, Math.min(100, (health.current_hp / health.max_hp) * 100));
  const isDanger = percentage < 20;
  const isLow = percentage < 50;
  const isFlourishing = percentage >= 80;

  const barColor = isDanger
    ? 'bg-red-500'
    : isLow
    ? 'bg-yellow-500'
    : 'bg-green-500';

  const glowColor = isDanger
    ? 'shadow-red-500/50'
    : isLow
    ? 'shadow-yellow-500/50'
    : 'shadow-green-500/50';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* HP Bar */}
      <div className={`relative h-10 bg-gray-800 rounded-lg overflow-hidden border-2 ${
        isDanger ? 'border-red-500' : 'border-gray-700'
      } shadow-lg ${glowColor}`}>
        {/* Fill bar */}
        <motion.div
          className={`h-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* HP Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm drop-shadow-md flex items-center gap-2">
            {isDanger && <HeartPulse className="w-4 h-4 animate-pulse" />}
            {health.current_hp} / {health.max_hp} HP
          </span>
        </div>

        {/* Danger pulse animation */}
        {isDanger && (
          <motion.div
            className="absolute inset-0 bg-red-500 opacity-30 pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </div>

      {/* Lives display */}
      {showLives && (
        <div className="flex items-center gap-2 justify-center">
          <span className="text-sm text-gray-400">Leben:</span>
          <div className="flex gap-1">
            {Array.from({ length: health.max_lives }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 transition-all ${
                  i < health.lives
                    ? 'text-red-500 fill-red-500'
                    : 'text-gray-600 fill-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status text */}
      {showDetails && (
        <div className="text-center">
          <p className={`text-xs ${
            isDanger ? 'text-red-400' :
            isLow ? 'text-yellow-400' :
            isFlourishing ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {isDanger && 'Kritischer Zustand - HP dringend auffuellen!'}
            {isLow && !isDanger && 'Niedriger HP-Stand - Vorsicht geboten'}
            {isFlourishing && 'Ausgezeichnete Verfassung!'}
            {!isDanger && !isLow && !isFlourishing && 'Guter Zustand'}
          </p>
        </div>
      )}
    </div>
  );
}
