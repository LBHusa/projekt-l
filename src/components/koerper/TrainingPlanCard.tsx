'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import type { TrainingPlan } from '@/lib/database.types';
import {
  getActivePlan,
  getTodaysWorkout,
  DAY_ORDER,
  DAY_OF_WEEK_CONFIG,
  TRAINING_GOAL_CONFIG,
  type DayWorkout,
  type WeeklySchedule,
} from '@/lib/data/trainingplan';

interface TrainingPlanCardProps {
  onCreatePlan: () => void;
}

export default function TrainingPlanCard({ onCreatePlan }: TrainingPlanCardProps) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<DayWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const activePlan = await getActivePlan();
    const todayWorkout = await getTodaysWorkout();

    setPlan(activePlan);
    setTodaysWorkout(todayWorkout || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Trainingsplan</h2>
        </div>
        <div className="text-center py-6 text-white/40">Laden...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Trainingsplan</h2>
        </div>

        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/60 mb-1">Kein aktiver Trainingsplan</p>
          <p className="text-sm text-white/40 mb-4">
            Erstelle einen Plan oder wähle ein Template
          </p>
          <button
            onClick={onCreatePlan}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Plan erstellen
          </button>
        </div>
      </div>
    );
  }

  const schedule = plan.schedule as WeeklySchedule;
  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayKey = DAY_ORDER[dayIndex];

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="font-semibold">{plan.name}</h2>
            {plan.goal && (
              <span className="text-xs text-blue-400">
                {TRAINING_GOAL_CONFIG[plan.goal].icon}{' '}
                {TRAINING_GOAL_CONFIG[plan.goal].label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onCreatePlan}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Today's Workout Highlight */}
      {todaysWorkout.length > 0 && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="text-xs text-blue-400 mb-1">Heute ({DAY_OF_WEEK_CONFIG[todayKey].label})</div>
          {todaysWorkout.map((workout, idx) => (
            <div key={idx} className="font-medium">
              {workout.name}
              {workout.duration && (
                <span className="text-sm text-white/50 ml-2">
                  {workout.duration} Min
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Weekly Overview */}
      <div className="space-y-2">
        {DAY_ORDER.map((dayKey) => {
          const dayWorkouts = schedule[dayKey] || [];
          const isToday = dayKey === todayKey;

          return (
            <div
              key={dayKey}
              className={`flex items-start gap-3 p-2 rounded-lg ${
                isToday ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'
              }`}
            >
              <div
                className={`text-xs font-medium w-6 pt-1 ${
                  isToday ? 'text-blue-400' : 'text-white/50'
                }`}
              >
                {DAY_OF_WEEK_CONFIG[dayKey].short}
              </div>

              <div className="flex-1 min-w-0">
                {dayWorkouts.length > 0 ? (
                  <div className="space-y-1">
                    {dayWorkouts.map((workout, idx) => (
                      <div key={idx} className="text-sm">
                        <span className={isToday ? 'text-white' : 'text-white/70'}>
                          {workout.name}
                        </span>
                        {workout.duration && (
                          <span className="text-xs text-white/40 ml-2">
                            {workout.duration}min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-white/30">Ruhetag</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan.description && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/50">{plan.description}</p>
        </div>
      )}
    </div>
  );
}
