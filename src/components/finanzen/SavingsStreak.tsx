'use client';

import { Flame, Calendar, Award, TrendingUp } from 'lucide-react';
import type { FinanceStreak } from '@/lib/database.types';

interface SavingsStreakProps {
  streaks: FinanceStreak[];
}

const STREAK_CONFIG: Record<string, {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}> = {
  positive_cashflow: {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Positiver Cashflow',
    description: 'Tage mit mehr Einnahmen als Ausgaben',
    color: '#10B981',
  },
  savings_contribution: {
    icon: <Flame className="w-5 h-5" />,
    title: 'Spar-Streak',
    description: 'Tage mit aktivem Sparen',
    color: '#F59E0B',
  },
  budget_kept: {
    icon: <Award className="w-5 h-5" />,
    title: 'Budget-Meister',
    description: 'Tage unter Budget geblieben',
    color: '#8B5CF6',
  },
  no_impulse_buy: {
    icon: <Calendar className="w-5 h-5" />,
    title: 'Keine Impulskaufe',
    description: 'Tage ohne ungeplante Ausgaben',
    color: '#3B82F6',
  },
};

function StreakCard({ streak }: { streak: FinanceStreak }) {
  const config = STREAK_CONFIG[streak.streak_type] || {
    icon: <Flame className="w-5 h-5" />,
    title: streak.streak_type,
    description: 'Streak',
    color: '#F59E0B',
  };

  const isActive = streak.current_streak > 0;
  const isRecord = streak.current_streak >= streak.longest_streak && streak.current_streak > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 border transition-all ${
        isActive
          ? 'bg-gradient-to-br from-orange-500/20 to-yellow-500/10 border-orange-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Flame Animation for Active Streaks */}
      {isActive && (
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-20">
          <Flame className="w-24 h-24 text-orange-500" />
        </div>
      )}

      {/* Record Badge */}
      {isRecord && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
            Rekord!
          </span>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2 rounded-lg ${isActive ? 'bg-orange-500/20' : 'bg-white/10'}`}
            style={{ color: isActive ? config.color : 'rgba(255,255,255,0.4)' }}
          >
            {config.icon}
          </div>
          <div>
            <h3 className={`font-medium ${isActive ? '' : 'text-white/50'}`}>{config.title}</h3>
            <p className="text-xs text-white/40">{config.description}</p>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className={`text-3xl font-bold ${isActive ? 'text-orange-400' : 'text-white/30'}`}>
              {streak.current_streak}
            </p>
            <p className="text-xs text-white/40">
              {streak.current_streak === 1 ? 'Tag' : 'Tage'}
            </p>
          </div>

          {streak.longest_streak > 0 && (
            <div className="text-right">
              <p className="text-xs text-white/40">Rekord</p>
              <p className="text-sm font-medium text-white/60">
                {streak.longest_streak} {streak.longest_streak === 1 ? 'Tag' : 'Tage'}
              </p>
            </div>
          )}
        </div>

        {/* Streak Progress Dots */}
        {isActive && streak.current_streak <= 7 && (
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < streak.current_streak
                    ? 'bg-orange-500'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SavingsStreak({ streaks }: SavingsStreakProps) {
  const activeStreaks = streaks.filter(s => s.current_streak > 0);
  const totalStreakDays = streaks.reduce((sum, s) => sum + s.current_streak, 0);

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold">Streaks</h2>
        </div>
        {totalStreakDays > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">{totalStreakDays} aktiv</span>
          </div>
        )}
      </div>

      {streaks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {streaks.map((streak) => (
            <StreakCard key={streak.id} streak={streak} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white/40">
          <Flame className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Streaks</p>
          <p className="text-sm mt-1">Starte deinen ersten Spar-Streak!</p>
        </div>
      )}

      {/* Tips */}
      {activeStreaks.length === 0 && streaks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Tipp: Spare heute etwas Geld um deinen Streak zu starten!
          </p>
        </div>
      )}

      {activeStreaks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Halte deine Streaks aktiv fur Bonus-XP!
          </p>
        </div>
      )}
    </div>
  );
}
