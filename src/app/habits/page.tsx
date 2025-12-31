'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Plus, Flame, Target, TrendingUp, Calendar } from 'lucide-react';
import { HabitCard, HabitForm, HabitStreak } from '@/components/habits';
import type { HabitFormData } from '@/components/habits';
import {
  getHabitsWithLogs,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  getHabitStats,
  type HabitStats,
} from '@/lib/data/habits';
import type { HabitWithLogs } from '@/lib/database.types';

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

  const loadData = async () => {
    try {
      const [habitsData, statsData] = await Promise.all([
        getHabitsWithLogs(),
        getHabitStats(),
      ]);
      setHabits(habitsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleComplete = async (habitId: string, completed: boolean) => {
    try {
      await logHabitCompletion(habitId, completed);
      await loadData();
    } catch (err) {
      console.error('Error completing habit:', err);
    }
  };

  const handleCreate = async (data: HabitFormData) => {
    try {
      await createHabit(data);
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Error creating habit:', err);
    }
  };

  const handleUpdate = async (data: HabitFormData) => {
    if (!editingHabit) return;
    try {
      await updateHabit(editingHabit.id, data);
      setEditingHabit(null);
      await loadData();
    } catch (err) {
      console.error('Error updating habit:', err);
    }
  };

  const handleDelete = async (habitId: string) => {
    if (!confirm('Habit wirklich löschen?')) return;
    try {
      await deleteHabit(habitId);
      await loadData();
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  const filteredHabits = habits.filter(habit => {
    if (filter === 'all') return true;
    return habit.habit_type === filter;
  });

  const positiveHabits = filteredHabits.filter(h => h.habit_type === 'positive');
  const negativeHabits = filteredHabits.filter(h => h.habit_type === 'negative');

  const todayCompleted = positiveHabits.filter(h => h.completedToday).length;
  const todayTotal = positiveHabits.length;
  const completionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] animate-pulse mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Lade Habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-400" />
                  Habits
                </h1>
                <p className="text-sm text-white/50">
                  {todayCompleted}/{todayTotal} heute erledigt
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Neuer Habit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">Heute</span>
              </div>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <div className="text-xs text-white/40">{todayCompleted} von {todayTotal}</div>
            </div>

            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm">Streaks</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalStreaks}</div>
              <div className="text-xs text-white/40">Aktive Tage</div>
            </div>

            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm">Rekord</span>
              </div>
              <div className="text-2xl font-bold">{stats.longestStreak}</div>
              <div className="text-xs text-white/40">Längster Streak</div>
            </div>

            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Gesamt</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalCompletions}</div>
              <div className="text-xs text-white/40">Abgeschlossen</div>
            </div>
          </motion.div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'positive', 'negative'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f === 'all' && 'Alle'}
              {f === 'positive' && 'Positive'}
              {f === 'negative' && 'Zu vermeiden'}
            </button>
          ))}
        </div>

        {/* Habits List */}
        {filteredHabits.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-lg font-medium mb-2">Noch keine Habits</h3>
            <p className="text-white/50 mb-6">
              Erstelle deinen ersten Habit und baue positive Gewohnheiten auf!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Ersten Habit erstellen
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Positive Habits */}
            {positiveHabits.length > 0 && (filter === 'all' || filter === 'positive') && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-green-400">Aufbauen</span>
                  <span className="text-sm font-normal text-white/40">
                    ({positiveHabits.filter(h => h.completedToday).length}/{positiveHabits.length})
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {positiveHabits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <HabitCard
                        habit={habit}
                        onComplete={handleComplete}
                        onEdit={setEditingHabit}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Negative Habits */}
            {negativeHabits.length > 0 && (filter === 'all' || filter === 'negative') && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-red-400">Vermeiden</span>
                  <span className="text-sm font-normal text-white/40">
                    ({negativeHabits.length} Habits)
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {negativeHabits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <HabitCard
                        habit={habit}
                        onComplete={handleComplete}
                        onEdit={setEditingHabit}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Form Modal */}
      {showForm && (
        <HabitForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Form Modal */}
      {editingHabit && (
        <HabitForm
          habit={editingHabit}
          onSubmit={handleUpdate}
          onCancel={() => setEditingHabit(null)}
        />
      )}
    </div>
  );
}
