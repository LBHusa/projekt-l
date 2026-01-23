'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';
import { HABIT_ICONS, HABIT_COLORS, FACTIONS, DAYS } from '@/lib/ui/constants';
import type { HabitType, HabitFrequency, FactionId } from '@/lib/database.types';

export default function NewHabitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '✅',
    color: '#10B981',
    habit_type: 'positive' as HabitType,
    frequency: 'daily' as HabitFrequency,
    target_days: [] as string[],
    xp_per_completion: 10,
    faction_id: '' as FactionId | '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    // Check for XSS characters
    if (/<|>/.test(formData.title)) {
      setError('Cannot contain < or > characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/habits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.title,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          isNegative: formData.habit_type === 'negative',
          frequency: formData.frequency,
          frequencyDays: formData.target_days,
          xpReward: formData.xp_per_completion,
          factions: formData.faction_id
            ? [{ factionId: formData.faction_id, weight: 100 }]
            : [{ factionId: 'karriere', weight: 100 }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const errorMessages = Object.values(data.details).flat().join(', ');
          setError(errorMessages || data.error);
        } else {
          setError(data.error || 'Fehler beim Erstellen');
        }
        return;
      }

      router.push('/habits');
    } catch (err) {
      console.error('Error creating habit:', err);
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      target_days: prev.target_days.includes(day)
        ? prev.target_days.filter(d => d !== day)
        : [...prev.target_days, day],
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/habits"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-400" />
                Neuer Habit
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="error-message p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400" role="alert">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Titel *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="z.B. Meditation"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Typ</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, habit_type: 'positive' }))}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                  formData.habit_type === 'positive'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                Positiv (aufbauen)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, habit_type: 'negative' }))}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                  formData.habit_type === 'negative'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                Negativ (vermeiden)
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-12 h-12 rounded-lg text-xl flex items-center justify-center transition-all ${
                    formData.icon === icon
                      ? 'bg-white/20 ring-2 ring-[var(--accent-primary)]'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Farbe</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--background)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Häufigkeit</label>
            <select
              value={formData.frequency}
              onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as HabitFrequency }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="specific_days">Bestimmte Tage</option>
            </select>
          </div>

          {/* Target Days */}
          {formData.frequency === 'specific_days' && (
            <div>
              <label className="block text-sm font-medium mb-2">Tage auswählen</label>
              <div className="flex gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.target_days.includes(day.key)
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Faction */}
          <div>
            <label className="block text-sm font-medium mb-2">Lebensbereich</label>
            <div className="grid grid-cols-4 gap-2">
              {FACTIONS.map(faction => (
                <button
                  key={faction.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, faction_id: faction.id }))}
                  className={`py-2 px-2 rounded-lg text-xs transition-all ${
                    formData.faction_id === faction.id
                      ? 'bg-white/20 ring-1 ring-white/50'
                      : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                  }`}
                >
                  {faction.icon} {faction.name}
                </button>
              ))}
            </div>
          </div>

          {/* XP per completion */}
          {formData.habit_type === 'positive' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                XP pro Abschluss: {formData.xp_per_completion}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={formData.xp_per_completion}
                onChange={e => setFormData(prev => ({ ...prev, xp_per_completion: parseInt(e.target.value) }))}
                className="w-full accent-[var(--accent-primary)]"
              />
              <div className="flex justify-between text-xs text-adaptive-dim mt-1">
                <span>5 XP</span>
                <span>50 XP</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/habits"
              className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 py-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Erstellen...' : 'Habit erstellen'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
