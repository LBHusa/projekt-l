'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface HabitStreakProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'sm' | 'md' | 'lg';
  showLongest?: boolean;
}

export default function HabitStreak({
  currentStreak,
  longestStreak,
  size = 'md',
  showLongest = false,
}: HabitStreakProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const isOnFire = currentStreak >= 3;
  const isBurning = currentStreak >= 7;
  const isInferno = currentStreak >= 30;

  const getFlameColor = () => {
    if (isInferno) return 'text-purple-400';
    if (isBurning) return 'text-orange-400';
    if (isOnFire) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <motion.div
        className={`flex items-center gap-1 ${getFlameColor()}`}
        animate={isOnFire ? { scale: [1, 1.1, 1] } : undefined}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <Flame className={iconSizes[size]} />
        <span className="font-bold">{currentStreak}</span>
      </motion.div>

      {showLongest && longestStreak > currentStreak && (
        <span className="text-white/40">
          (Rekord: {longestStreak})
        </span>
      )}

      {isInferno && (
        <span className="text-purple-400 text-xs">INFERNO!</span>
      )}
      {isBurning && !isInferno && (
        <span className="text-orange-400 text-xs">On Fire!</span>
      )}
    </div>
  );
}
