'use client';

import { useState } from 'react';
import { X, Dumbbell } from 'lucide-react';
import type { Workout, WorkoutType, WorkoutIntensity } from '@/lib/database.types';
import { WORKOUT_TYPE_CONFIG, type WorkoutFormData } from '@/lib/data/koerper';

interface WorkoutFormProps {
  workout?: Workout | null;
  onSubmit: (data: WorkoutFormData) => Promise<void>;
  onCancel: () => void;
}

const INTENSITY_OPTIONS: { value: WorkoutIntensity; label: string; color: string }[] = [
  { value: 'low', label: 'Leicht', color: 'text-green-400' },
  { value: 'medium', label: 'Mittel', color: 'text-yellow-400' },
  { value: 'high', label: 'Intensiv', color: 'text-red-400' },
];

export default function WorkoutForm({ workout, onSubmit, onCancel }: WorkoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to today's date/time
  const now = new Date();
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [formData, setFormData] = useState<WorkoutFormData>({
    name: workout?.name || '',
    workout_type: workout?.workout_type || 'strength',
    duration_minutes: workout?.duration_minutes || undefined,
    calories_burned: workout?.calories_burned || undefined,
    intensity: workout?.intensity || undefined,
    occurred_at: workout?.occurred_at ? new Date(workout.occurred_at).toISOString().slice(0, 16) : defaultDateTime,
    notes: workout?.notes || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const workoutTypes = Object.entries(WORKOUT_TYPE_CONFIG) as [WorkoutType, typeof WORKOUT_TYPE_CONFIG[WorkoutType]][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold">
              {workout ? 'Workout bearbeiten' : 'Workout loggen'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-adaptive-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="z.B. Oberkörper Training"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            />
          </div>

          {/* Workout Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Typ</label>
            <div className="grid grid-cols-4 gap-2">
              {workoutTypes.map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, workout_type: type }))}
                  className={`py-2 px-2 rounded-lg border text-center transition-all ${
                    formData.workout_type === type
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl block mb-0.5">{config.icon}</span>
                  <span className={`text-xs ${formData.workout_type === type ? config.color : 'text-adaptive-muted'}`}>
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration and Calories - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Dauer (Min)</label>
              <input
                type="number"
                value={formData.duration_minutes || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  duration_minutes: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="45"
                min="1"
                max="480"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Kalorien</label>
              <input
                type="number"
                value={formData.calories_burned || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  calories_burned: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="300"
                min="0"
                max="5000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Intensität</label>
            <div className="flex gap-2">
              {INTENSITY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    intensity: prev.intensity === option.value ? undefined : option.value
                  }))}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                    formData.intensity === option.value
                      ? `bg-white/10 border-white/30 ${option.color}`
                      : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Datum & Uhrzeit</label>
            <input
              type="datetime-local"
              value={formData.occurred_at}
              onChange={e => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
              placeholder="Optional: Zusätzliche Infos zum Training..."
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
            />
          </div>

          {/* XP Preview */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-adaptive-muted">Geschätzte XP</span>
              <span className="text-green-400 font-bold">
                +{calculatePreviewXP(formData)} XP
              </span>
            </div>
            <p className="text-xs text-adaptive-dim mt-1">
              Basierend auf Dauer und Intensität
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : workout ? 'Speichern' : 'Loggen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Preview XP calculation (matches koerper.ts logic)
 */
function calculatePreviewXP(data: WorkoutFormData): number {
  let baseXP = 15;

  if (data.duration_minutes) {
    if (data.duration_minutes >= 60) baseXP += 20;
    else if (data.duration_minutes >= 30) baseXP += 10;
    else if (data.duration_minutes >= 15) baseXP += 5;
  }

  if (data.intensity === 'high') baseXP += 10;
  else if (data.intensity === 'medium') baseXP += 5;

  if (['hiit', 'strength'].includes(data.workout_type)) baseXP += 5;

  return baseXP;
}
