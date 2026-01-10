'use client';

import { useState, useEffect } from 'react';
import { Flame, Calendar, Award } from 'lucide-react';
import { getWorkoutSessions } from '@/lib/data/trainingslog';
import type { WorkoutSession } from '@/lib/database.types';

export default function WorkoutStreakCard() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [thisWeek, setThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const sessions = await getWorkoutSessions(90);

    const currentStreak = calculateCurrentStreak(sessions);
    const longest = calculateLongestStreak(sessions);
    const weekCount = calculateThisWeek(sessions);

    setStreak(currentStreak);
    setLongestStreak(longest);
    setThisWeek(weekCount);
    setLoading(false);
  };

  const calculateCurrentStreak = (sessions: WorkoutSession[]): number => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique workout dates
    const workoutDates = new Set(
      sessions.map(s => {
        const date = new Date(s.started_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    let currentStreak = 0;
    const checkDate = new Date(today);

    // Check today first
    if (workoutDates.has(checkDate.getTime())) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days going back
    while (workoutDates.has(checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
  };

  const calculateLongestStreak = (sessions: WorkoutSession[]): number => {
    if (sessions.length === 0) return 0;

    const workoutDates = Array.from(
      new Set(
        sessions.map(s => {
          const date = new Date(s.started_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      )
    ).sort((a, b) => a - b);

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < workoutDates.length; i++) {
      const diff = (workoutDates[i] - workoutDates[i - 1]) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  };

  const calculateThisWeek = (sessions: WorkoutSession[]): number => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    return sessions.filter(s => {
      const sessionDate = new Date(s.started_at);
      return sessionDate >= monday;
    }).length;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold">Workout Streak</h2>
        </div>
        <div className="text-center py-6 text-white/40">Laden...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-orange-400" />
        <h2 className="font-semibold">Workout Streak</h2>
      </div>

      {/* Current Streak - Main Focus */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Flame className={`w-8 h-8 ${streak > 0 ? 'text-orange-400' : 'text-white/20'}`} />
          <div className="text-5xl font-bold text-orange-400">
            {streak}
          </div>
        </div>
        <p className="text-sm text-white/60">
          {streak === 0
            ? 'Kein aktiver Streak'
            : streak === 1
            ? 'Tag in Folge'
            : 'Tage in Folge'}
        </p>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-white/50">Diese Woche</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{thisWeek}</div>
          <div className="text-xs text-white/40 mt-1">Workouts</div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-white/50">Bester Streak</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{longestStreak}</div>
          <div className="text-xs text-white/40 mt-1">Tage</div>
        </div>
      </div>

      {/* Motivational Message */}
      {streak === 0 && (
        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg text-center">
          <p className="text-xs text-orange-400">
            💪 Starte jetzt dein Training und beginne einen neuen Streak!
          </p>
        </div>
      )}

      {streak >= 7 && (
        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg text-center">
          <p className="text-xs text-orange-400">
            🔥 Wow! Eine ganze Woche am Stück! Weiter so!
          </p>
        </div>
      )}

      {streak >= 30 && (
        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg text-center">
          <p className="text-xs text-orange-400">
            🏆 LEGENDÄR! 30 Tage Streak ist eine Meisterleistung!
          </p>
        </div>
      )}
    </div>
  );
}
