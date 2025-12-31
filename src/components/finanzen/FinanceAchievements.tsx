'use client';

import { Trophy, Lock, Star } from 'lucide-react';
import type { FinanceAchievement } from '@/lib/database.types';
import { NET_WORTH_MILESTONES } from './NetWorthLevel';

interface FinanceAchievementsProps {
  achievements: FinanceAchievement[];
  netWorth?: number;
}

// All possible achievements
const ALL_ACHIEVEMENTS = [
  ...NET_WORTH_MILESTONES.map(m => ({
    key: `net_worth_${m.amount}`,
    type: 'net_worth_milestone' as const,
    title: m.title,
    description: `Erreiche ${m.amount.toLocaleString('de-DE')}€ Vermogen`,
    icon: m.icon,
    xp_reward: m.xp,
    threshold: m.amount,
  })),
  {
    key: 'savings_streak_7',
    type: 'savings_streak' as const,
    title: 'Wochensparer',
    description: '7 Tage positiver Cashflow',
    icon: '🔥',
    xp_reward: 50,
    threshold: 7,
  },
  {
    key: 'savings_streak_30',
    type: 'savings_streak' as const,
    title: 'Monatssparer',
    description: '30 Tage positiver Cashflow',
    icon: '🏆',
    xp_reward: 150,
    threshold: 30,
  },
  {
    key: 'first_goal',
    type: 'goal_reached' as const,
    title: 'Zielstrebig',
    description: 'Erstes Sparziel erreicht',
    icon: '🎯',
    xp_reward: 100,
  },
  {
    key: 'first_investment',
    type: 'first_investment' as const,
    title: 'Investor',
    description: 'Erste Investition getatigt',
    icon: '📈',
    xp_reward: 75,
  },
  {
    key: 'budget_master',
    type: 'budget_master' as const,
    title: 'Budget-Meister',
    description: 'Alle Budgets eingehalten',
    icon: '📊',
    xp_reward: 100,
  },
  {
    key: 'debt_free',
    type: 'debt_free' as const,
    title: 'Schuldenfrei',
    description: 'Keine Schulden mehr',
    icon: '🆓',
    xp_reward: 200,
  },
  {
    key: 'diversified',
    type: 'diversified' as const,
    title: 'Diversifiziert',
    description: '3+ verschiedene Asset-Typen',
    icon: '🌈',
    xp_reward: 75,
  },
];

export function FinanceAchievements({ achievements, netWorth = 0 }: FinanceAchievementsProps) {
  const unlockedKeys = new Set(achievements.map(a => a.achievement_key));

  // Determine which achievements are unlocked
  const achievementsWithStatus = ALL_ACHIEVEMENTS.map(a => {
    let unlocked = unlockedKeys.has(a.key);

    // Check net worth milestones
    if (a.type === 'net_worth_milestone' && !unlocked && a.threshold) {
      unlocked = netWorth >= a.threshold;
    }

    return { ...a, unlocked };
  });

  const unlockedAchievements = achievementsWithStatus.filter(a => a.unlocked);
  const lockedAchievements = achievementsWithStatus.filter(a => !a.unlocked);

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="font-semibold">Achievements</h2>
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
          {unlockedAchievements.length}/{ALL_ACHIEVEMENTS.length}
        </span>
      </div>

      {/* Unlocked */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-yellow-400 mb-2">Freigeschaltet</h3>
          <div className="flex flex-wrap gap-2">
            {unlockedAchievements.map(a => (
              <div
                key={a.key}
                className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
                title={a.description}
              >
                <span className="text-xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-yellow-400">+{a.xp_reward} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked - Show next few */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/40 mb-2">Nachste Ziele</h3>
          <div className="flex flex-wrap gap-2">
            {lockedAchievements.slice(0, 6).map(a => (
              <div
                key={a.key}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 opacity-50"
                title={a.description}
              >
                <Lock className="w-4 h-4 text-white/30" />
                <div>
                  <p className="text-sm text-white/50">{a.title}</p>
                  <p className="text-xs text-white/30">+{a.xp_reward} XP</p>
                </div>
              </div>
            ))}
            {lockedAchievements.length > 6 && (
              <div className="flex items-center text-xs text-white/30 px-2">
                +{lockedAchievements.length - 6} weitere
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
