'use client';

import { Star } from 'lucide-react';

interface NetWorthLevelProps {
  level: number;
  showProgress?: boolean;
}

const LEVEL_TIERS = [
  { min: 1, max: 10, name: 'Anfanger', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  { min: 11, max: 20, name: 'Sparer', color: 'text-green-400', bg: 'bg-green-500/20' },
  { min: 21, max: 30, name: 'Investor', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { min: 31, max: 40, name: 'Vermogend', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { min: 41, max: 50, name: 'Wohlhabend', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { min: 51, max: 60, name: 'Reich', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { min: 61, max: 70, name: 'Millionar', color: 'text-rose-400', bg: 'bg-rose-500/20' },
  { min: 71, max: 80, name: 'Elite', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { min: 81, max: 90, name: 'Tycoon', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { min: 91, max: 100, name: 'Legende', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
];

function getTier(level: number) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0];
}

export function NetWorthLevel({ level, showProgress = false }: NetWorthLevelProps) {
  const tier = getTier(level);
  const progressInTier = ((level - tier.min) / (tier.max - tier.min + 1)) * 100;

  return (
    <div className={`${tier.bg} rounded-lg px-3 py-2 text-center min-w-[80px]`}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Star className={`w-4 h-4 ${tier.color}`} />
        <span className={`font-bold ${tier.color}`}>Lv.{level}</span>
      </div>
      <p className={`text-xs ${tier.color}`}>{tier.name}</p>
      {showProgress && (
        <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${tier.bg.replace('/20', '/60')} rounded-full transition-all`}
            style={{ width: `${progressInTier}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Milestone badges for achievements
export const NET_WORTH_MILESTONES = [
  { amount: 1000, icon: '🌱', title: 'Erstes Tausend', xp: 50 },
  { amount: 5000, icon: '🌿', title: 'Spar-Sprössling', xp: 100 },
  { amount: 10000, icon: '🌳', title: '10K Club', xp: 200 },
  { amount: 25000, icon: '💎', title: 'Vermögensaufbauer', xp: 300 },
  { amount: 50000, icon: '🏆', title: 'Halbe 100K', xp: 400 },
  { amount: 100000, icon: '👑', title: 'Sechs Stellen', xp: 500 },
  { amount: 250000, icon: '🚀', title: 'Viertelmillion', xp: 750 },
  { amount: 500000, icon: '🌟', title: 'Halbe Million', xp: 1000 },
  { amount: 1000000, icon: '💰', title: 'Millionar', xp: 2000 },
];
