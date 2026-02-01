'use client';

// ============================================
// Habit Health Mapping Configuration Component
// Links workouts to habits for auto-completion
// Phase 01-03: Health Import -> Habit Auto-Complete
// ============================================

import { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import type { HabitHealthMapping } from '@/lib/types/health-import';

// Common workout types for selection dropdown
const WORKOUT_TYPES = [
  { value: 'running', label: 'Laufen / Joggen' },
  { value: 'walking', label: 'Spazieren' },
  { value: 'hiking', label: 'Wandern' },
  { value: 'cycling', label: 'Radfahren' },
  { value: 'swimming', label: 'Schwimmen' },
  { value: 'strength_training', label: 'Krafttraining' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'flexibility', label: 'Dehnen / Mobilitaet' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'cardio', label: 'Cardio (Allgemein)' },
  { value: 'rowing', label: 'Rudern' },
  { value: 'martial_arts', label: 'Kampfsport' },
  { value: 'boxing', label: 'Boxen' },
  { value: 'dance', label: 'Tanzen' },
  { value: 'core', label: 'Core Training' },
];

interface Habit {
  id: string;
  name: string;
  icon: string;
}

interface MappingWithHabit extends HabitHealthMapping {
  habits: Habit;
}

interface HabitHealthMappingConfigProps {
  className?: string;
}

export function HabitHealthMappingConfig({ className = '' }: HabitHealthMappingConfigProps) {
  const [mappings, setMappings] = useState<MappingWithHabit[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New mapping form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [minDuration, setMinDuration] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch mappings and habits in parallel
      const [mappingsRes, habitsRes] = await Promise.all([
        fetch('/api/habits/health-mapping'),
        fetch('/api/habits/list'),
      ]);

      if (!mappingsRes.ok || !habitsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const mappingsData = await mappingsRes.json();
      const habitsData = await habitsRes.json();

      setMappings(mappingsData.mappings || []);
      setHabits(habitsData.data || []);
    } catch (err) {
      setError('Konnte Daten nicht laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMapping() {
    if (!selectedHabit || !selectedWorkout) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/habits/health-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: selectedHabit,
          workoutType: selectedWorkout,
          minDurationMinutes: minDuration,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create mapping');
      }

      // Refresh data
      await fetchData();

      // Reset form
      setShowAddForm(false);
      setSelectedHabit('');
      setSelectedWorkout('');
      setMinDuration(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMapping(mappingId: string) {
    try {
      setError(null);
      const response = await fetch(`/api/habits/health-mapping?id=${mappingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete mapping');
      }

      setMappings(mappings.filter(m => m.id !== mappingId));
    } catch (err) {
      setError('Konnte Mapping nicht loeschen');
    }
  }

  if (loading) {
    return (
      <div className={`bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-adaptive-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-adaptive">
              Health Import Verknuepfungen
            </h2>
            <p className="text-sm text-adaptive-dim">
              Verknuepfe Workouts mit Habits fuer Auto-Vervollstaendigung
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Hinzufuegen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--orb-border)]">
          <h3 className="font-medium text-adaptive mb-4">Neue Verknuepfung</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-adaptive-muted mb-1">Habit</label>
              <select
                value={selectedHabit}
                onChange={(e) => setSelectedHabit(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg text-adaptive focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="">Waehle Habit...</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.icon} {habit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-adaptive-muted mb-1">Workout-Typ</label>
              <select
                value={selectedWorkout}
                onChange={(e) => setSelectedWorkout(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg text-adaptive focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="">Waehle Workout...</option>
                {WORKOUT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-adaptive-muted mb-1">Min. Dauer (Min)</label>
              <input
                type="number"
                value={minDuration}
                onChange={(e) => setMinDuration(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg text-adaptive focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddMapping}
              disabled={saving || !selectedHabit || !selectedWorkout}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Speichern
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSelectedHabit('');
                setSelectedWorkout('');
                setMinDuration(0);
              }}
              className="px-4 py-2 border border-[var(--orb-border)] rounded-lg text-adaptive-muted hover:bg-[var(--background-tertiary)] transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Mappings List */}
      {mappings.length === 0 ? (
        <div className="text-center py-8 text-adaptive-dim">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Keine Verknuepfungen konfiguriert</p>
          <p className="text-sm mt-1">Fuege eine hinzu, um Habits automatisch zu vervollstaendigen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-lg border border-[var(--orb-border)]"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{mapping.habits?.icon || '✅'}</span>
                <div>
                  <p className="font-medium text-adaptive">{mapping.habits?.name || 'Unbekannt'}</p>
                  <p className="text-sm text-adaptive-dim">
                    {WORKOUT_TYPES.find(t => t.value === mapping.health_workout_type)?.label || mapping.health_workout_type}
                    {mapping.min_duration_minutes > 0 && ` (min. ${mapping.min_duration_minutes} Min)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteMapping(mapping.id)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Verknuepfung loeschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Text */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>So funktioniert es:</strong> Wenn du ein Workout aus Apple Health importierst,
          das mit einem Habit verknuepft ist, wird dieser automatisch als erledigt markiert und du erhaeltst XP.
        </p>
      </div>
    </div>
  );
}

export default HabitHealthMappingConfig;
