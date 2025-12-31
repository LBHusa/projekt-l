'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Activity, Scale, Flame, Timer, TrendingUp, Plus } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import type { FactionWithStats, Workout, BodyMetric, WorkoutType } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const WORKOUT_TYPE_CONFIG: Record<WorkoutType, { label: string; icon: string; color: string }> = {
  strength: { label: 'Kraft', icon: '💪', color: 'text-red-400' },
  cardio: { label: 'Cardio', icon: '🏃', color: 'text-blue-400' },
  flexibility: { label: 'Flexibilitat', icon: '🧘', color: 'text-purple-400' },
  sports: { label: 'Sport', icon: '⚽', color: 'text-green-400' },
  hiit: { label: 'HIIT', icon: '🔥', color: 'text-orange-400' },
  yoga: { label: 'Yoga', icon: '🧘‍♀️', color: 'text-pink-400' },
  other: { label: 'Andere', icon: '🎯', color: 'text-gray-400' },
};

export default function GesundheitPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient();

        const [factionData, factionStats] = await Promise.all([
          getFaction('gesundheit'),
          getUserFactionStat('gesundheit'),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        // Load recent workouts (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .gte('occurred_at', thirtyDaysAgo.toISOString())
          .order('occurred_at', { ascending: false });

        if (workoutsError && workoutsError.code !== 'PGRST116') {
          console.error('Error fetching workouts:', workoutsError);
        }

        setWorkouts(workoutsData || []);

        // Load latest body metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from('body_metrics')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('measured_at', { ascending: false })
          .limit(10);

        if (metricsError && metricsError.code !== 'PGRST116') {
          console.error('Error fetching metrics:', metricsError);
        }

        setMetrics(metricsData || []);
      } catch (err) {
        console.error('Error loading gesundheit data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white/50">Lade Gesundheits-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Gesundheit-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const thisMonth = workouts.length;
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
  const latestWeight = metrics.find(m => m.metric_type === 'weight');

  const additionalStats = [
    {
      label: 'Workouts (30 Tage)',
      value: thisMonth,
      icon: <Dumbbell className="w-4 h-4" />,
      color: 'text-green-400',
    },
    {
      label: 'Trainingszeit',
      value: `${Math.round(totalMinutes / 60)}h`,
      icon: <Timer className="w-4 h-4" />,
      color: 'text-blue-400',
    },
  ];

  if (totalCalories > 0) {
    additionalStats.push({
      label: 'Kalorien',
      value: totalCalories.toLocaleString('de-DE'),
      icon: <Flame className="w-4 h-4" />,
      color: 'text-orange-400',
    });
  }

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <Dumbbell className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">{thisMonth}</div>
            <div className="text-sm text-white/50">Workouts</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <Timer className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{totalMinutes}</div>
            <div className="text-sm text-white/50">Minuten</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-400">{totalCalories}</div>
            <div className="text-sm text-white/50">Kalorien</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <Scale className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">
              {latestWeight ? `${latestWeight.value} ${latestWeight.unit}` : '-'}
            </div>
            <div className="text-sm text-white/50">Gewicht</div>
          </div>
        </motion.div>

        {/* Recent Workouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold">Letzte Workouts</h2>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors"
              onClick={() => {/* TODO: Open create modal */}}
            >
              <Plus className="w-4 h-4" />
              Workout loggen
            </button>
          </div>

          {workouts.length > 0 ? (
            <div className="space-y-3">
              {workouts.slice(0, 5).map((workout) => {
                const config = WORKOUT_TYPE_CONFIG[workout.workout_type] || WORKOUT_TYPE_CONFIG.other;
                return (
                  <div
                    key={workout.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <h3 className="font-medium">{workout.name}</h3>
                          <span className={`text-xs ${config.color}`}>{config.label}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-white/40">
                        {new Date(workout.occurred_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                      {workout.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {workout.duration_minutes} Min
                        </span>
                      )}
                      {workout.calories_burned && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {workout.calories_burned} kcal
                        </span>
                      )}
                      {workout.xp_gained > 0 && (
                        <span className="text-green-400">+{workout.xp_gained} XP</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Workouts geloggt</p>
              <p className="text-sm mt-1">Starte dein erstes Training!</p>
            </div>
          )}
        </motion.div>

        {/* Body Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold">Korperwerte</h2>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
              onClick={() => {/* TODO: Open create modal */}}
            >
              <Plus className="w-4 h-4" />
              Wert eintragen
            </button>
          </div>

          {metrics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Get latest value for each metric type */}
              {['weight', 'body_fat', 'muscle_mass', 'bmi'].map(type => {
                const metric = metrics.find(m => m.metric_type === type);
                if (!metric) return null;

                const labels: Record<string, string> = {
                  weight: 'Gewicht',
                  body_fat: 'Korperfett',
                  muscle_mass: 'Muskelmasse',
                  bmi: 'BMI',
                };

                return (
                  <div key={type} className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">
                      {metric.value} {metric.unit}
                    </div>
                    <div className="text-xs text-white/40">{labels[type]}</div>
                    <div className="text-xs text-white/30 mt-1">
                      {new Date(metric.measured_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-white/40">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Noch keine Korperwerte erfasst</p>
            </div>
          )}
        </motion.div>

        {/* Training Plan Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">Trainingsplan</h2>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              Phase 3
            </span>
          </div>
          <div className="text-center py-6 text-white/40">
            <p>Trainingsplane kommen in Phase 3</p>
            <p className="text-sm mt-1">Erstelle Wochenplane und verfolge deinen Fortschritt</p>
          </div>
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="gesundheit"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}
