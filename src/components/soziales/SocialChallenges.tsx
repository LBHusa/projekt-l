'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import type { SocialEvent } from '@/lib/database.types';

interface SocialChallengesProps {
  events: SocialEvent[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  period: 'week' | 'month';
  icon: React.ReactNode;
  color: {
    bg: string;
    border: string;
    text: string;
    progress: string;
  };
}

/**
 * Get start of current week (Monday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get start of current month
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Count events in a given period
 */
function countEventsInPeriod(events: SocialEvent[], startDate: Date): number {
  return events.filter(event => {
    const eventDate = new Date(event.occurred_at);
    return eventDate >= startDate;
  }).length;
}

/**
 * Count unique participants in a given period
 */
function countUniqueParticipantsInPeriod(events: SocialEvent[], startDate: Date): number {
  const participantIds = new Set<string>();

  events
    .filter(event => new Date(event.occurred_at) >= startDate)
    .forEach(event => {
      event.participants?.forEach(id => participantIds.add(id));
    });

  return participantIds.size;
}

/**
 * Calculate total social time in a given period (in hours)
 */
function calculateSocialTimeInPeriod(events: SocialEvent[], startDate: Date): number {
  const totalMinutes = events
    .filter(event => new Date(event.occurred_at) >= startDate)
    .reduce((sum, event) => sum + (event.duration_minutes || 0), 0);

  return Math.round(totalMinutes / 60); // Convert to hours
}

/**
 * Generate social challenges based on current progress
 */
function generateChallenges(events: SocialEvent[]): Challenge[] {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const weeklyEvents = countEventsInPeriod(events, weekStart);
  const monthlyEvents = countEventsInPeriod(events, monthStart);
  const weeklyParticipants = countUniqueParticipantsInPeriod(events, weekStart);
  const monthlyParticipants = countUniqueParticipantsInPeriod(events, monthStart);
  const weeklySocialTime = calculateSocialTimeInPeriod(events, weekStart);

  return [
    {
      id: 'weekly-events',
      title: 'Wöchentliche Events',
      description: 'Treffe dich diese Woche mit 3 verschiedenen Personen',
      target: 3,
      current: weeklyEvents,
      period: 'week',
      icon: <Calendar className="w-5 h-5" />,
      color: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        progress: 'bg-blue-500',
      },
    },
    {
      id: 'weekly-unique-people',
      title: 'Soziale Vielfalt',
      description: 'Triff diese Woche 5 verschiedene Menschen',
      target: 5,
      current: weeklyParticipants,
      period: 'week',
      icon: <TrendingUp className="w-5 h-5" />,
      color: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        progress: 'bg-purple-500',
      },
    },
    {
      id: 'weekly-social-time',
      title: 'Quality Time',
      description: 'Verbringe 10 Stunden mit Freunden und Familie',
      target: 10,
      current: weeklySocialTime,
      period: 'week',
      icon: <Target className="w-5 h-5" />,
      color: {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        progress: 'bg-cyan-500',
      },
    },
    {
      id: 'monthly-events',
      title: 'Monatliches Social-Ziel',
      description: 'Organisiere 10 Events diesen Monat',
      target: 10,
      current: monthlyEvents,
      period: 'month',
      icon: <Award className="w-5 h-5" />,
      color: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        progress: 'bg-orange-500',
      },
    },
    {
      id: 'monthly-networking',
      title: 'Networking Champion',
      description: 'Treffe diesen Monat 15 verschiedene Menschen',
      target: 15,
      current: monthlyParticipants,
      period: 'month',
      icon: <TrendingUp className="w-5 h-5" />,
      color: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        progress: 'bg-green-500',
      },
    },
  ];
}

export default function SocialChallenges({ events }: SocialChallengesProps) {
  const challenges = useMemo(() => generateChallenges(events), [events]);

  // Filter: Show only active challenges (not completed or very close to completion)
  const activeChallenges = useMemo(() => {
    return challenges.filter(c => c.current < c.target);
  }, [challenges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mb-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-indigo-400" />
        <h2 className="font-semibold text-indigo-300">Soziale Challenges</h2>
        <span className="text-sm text-white/40">Wöchentliche & monatliche Ziele</span>
      </div>

      {/* Challenges Grid */}
      {activeChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeChallenges.map((challenge) => {
            const progress = Math.min((challenge.current / challenge.target) * 100, 100);
            const isCompleted = challenge.current >= challenge.target;

            return (
              <div
                key={challenge.id}
                className={`
                  relative overflow-hidden rounded-lg border p-4
                  ${challenge.color.bg} ${challenge.color.border}
                  ${isCompleted ? 'opacity-60' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={challenge.color.text}>
                      {challenge.icon}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm ${challenge.color.text}`}>
                        {challenge.title}
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        {challenge.period === 'week' ? '📅 Diese Woche' : '📆 Dieser Monat'}
                      </p>
                    </div>
                  </div>

                  {isCompleted && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-white/70 mb-3">
                  {challenge.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Fortschritt</span>
                    <span className={challenge.color.text}>
                      {challenge.current} / {challenge.target}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${challenge.color.progress} rounded-full`}
                    />
                  </div>
                </div>

                {/* Completion Badge */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                    ✓ Geschafft!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-white/60">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-400" />
          <p className="text-indigo-300 font-medium">Alle Challenges abgeschlossen! 🎉</p>
          <p className="text-sm mt-1">Fantastische soziale Woche/Monat!</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-white/40">
        💪 Tipp: Events tracken um Challenges abzuschließen und XP zu verdienen
      </div>
    </motion.div>
  );
}
