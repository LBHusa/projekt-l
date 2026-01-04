'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Habit, HabitType, HabitFrequency, FactionId } from '@/lib/database.types';
import { HABIT_ICONS, HABIT_COLORS, FACTIONS, DAYS } from '@/lib/ui/constants';

interface HabitFormProps {
  habit?: Habit | null;
  onSubmit: (data: HabitFormData) => Promise<void>;
  onCancel: () => void;
}

export interface HabitFormData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  habit_type: HabitType;
  frequency: HabitFrequency;
  target_days: string[];
  xp_per_completion: number;
  factions?: { faction_id: FactionId; weight: number }[];
}

export default function HabitForm({ habit, onSubmit, onCancel }: HabitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<HabitFormData>({
    name: habit?.name || '',
    description: habit?.description || '',
    icon: habit?.icon || '✅',
    color: habit?.color || '#10B981',
    habit_type: habit?.habit_type || 'positive',
    frequency: habit?.frequency || 'daily',
    target_days: habit?.target_days || [],
    xp_per_completion: habit?.xp_per_completion || 10,
    factions: habit?.faction_id
      ? [{ faction_id: habit.faction_id, weight: 100 }]
      : undefined,
  });

  const [selectedFactions, setSelectedFactions] = useState<Set<FactionId>>(
    new Set(formData.factions?.map(f => f.faction_id) || [])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (!isWeightValid()) {
      alert('Gewichtung muss insgesamt 100% ergeben');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[HabitForm] Submitting with formData.factions:', formData.factions);
      console.log('[HabitForm] Full formData:', formData);
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaction = (factionId: FactionId) => {
    const newSelected = new Set(selectedFactions);

    if (newSelected.has(factionId)) {
      newSelected.delete(factionId);
    } else {
      newSelected.add(factionId);
    }

    setSelectedFactions(newSelected);

    if (newSelected.size === 0) {
      setFormData(prev => ({ ...prev, factions: undefined }));
    } else {
      const evenWeight = Math.floor(100 / newSelected.size);
      const remainder = 100 - (evenWeight * newSelected.size);

      const newFactions = Array.from(newSelected).map((fid, idx) => ({
        faction_id: fid,
        weight: evenWeight + (idx === 0 ? remainder : 0),
      }));

      setFormData(prev => ({ ...prev, factions: newFactions }));
    }
  };

  const updateFactionWeight = (factionId: FactionId, newWeight: number) => {
    if (!formData.factions) return;

    newWeight = Math.max(0, Math.min(100, newWeight));

    const otherFactions = formData.factions.filter(f => f.faction_id !== factionId);

    if (otherFactions.length === 0) {
      setFormData(prev => ({
        ...prev,
        factions: [{ faction_id: factionId, weight: 100 }],
      }));
      return;
    }

    const remainingWeight = 100 - newWeight;
    const currentOtherTotal = otherFactions.reduce((sum, f) => sum + f.weight, 0);

    const updatedOthers = otherFactions.map(f => {
      if (currentOtherTotal === 0) {
        return { ...f, weight: Math.floor(remainingWeight / otherFactions.length) };
      }
      return {
        ...f,
        weight: Math.round((f.weight / currentOtherTotal) * remainingWeight)
      };
    });

    const totalOthers = updatedOthers.reduce((sum, f) => sum + f.weight, 0);
    if (totalOthers !== remainingWeight && updatedOthers.length > 0) {
      updatedOthers[updatedOthers.length - 1].weight += (remainingWeight - totalOthers);
    }

    setFormData(prev => ({
      ...prev,
      factions: [
        { faction_id: factionId, weight: newWeight },
        ...updatedOthers,
      ],
    }));
  };

  const getTotalWeight = (): number => {
    return formData.factions?.reduce((sum, f) => sum + f.weight, 0) || 0;
  };

  const isWeightValid = (): boolean => {
    if (!formData.factions || formData.factions.length === 0) return true;
    return getTotalWeight() === 100;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <h2 className="text-lg font-bold">
            {habit ? 'Habit bearbeiten' : 'Neuer Habit'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
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
              placeholder="z.B. Meditation"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Typ</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, habit_type: 'positive' }))}
                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                  formData.habit_type === 'positive'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                Positiv (aufbauen)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, habit_type: 'negative' }))}
                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                  formData.habit_type === 'negative'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                Negativ (vermeiden)
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
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
            <label className="block text-sm font-medium mb-1.5">Farbe</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--background-secondary)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Häufigkeit</label>
            <select
              value={formData.frequency}
              onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as HabitFrequency }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="specific_days">Bestimmte Tage</option>
            </select>
          </div>

          {/* Target Days (only for specific_days) */}
          {formData.frequency === 'specific_days' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Tage auswählen</label>
              <div className="flex gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.target_days.includes(day.key)
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Faction Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Lebensbereiche {selectedFactions.size > 0 && `(${selectedFactions.size} ausgewählt)`}
            </label>

            {/* Faction Checkboxes */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {FACTIONS.map(faction => {
                const isSelected = selectedFactions.has(faction.id);
                return (
                  <button
                    key={faction.id}
                    type="button"
                    onClick={() => toggleFaction(faction.id)}
                    className={`py-2 px-2 rounded-lg text-xs transition-all ${
                      isSelected
                        ? 'bg-white/20 ring-1 ring-white/50'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {faction.icon} {faction.name}
                  </button>
                );
              })}
            </div>

            {/* Weight Sliders (nur wenn Factions selected) */}
            {selectedFactions.size > 0 && (
              <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                  <span>Gewichtung pro Bereich</span>
                  <span className={getTotalWeight() === 100 ? 'text-green-400' : 'text-red-400'}>
                    Gesamt: {getTotalWeight()}%
                  </span>
                </div>

                {formData.factions?.map(faction => {
                  const factionMeta = FACTIONS.find(f => f.id === faction.faction_id);
                  return (
                    <div key={faction.faction_id}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm flex items-center gap-1.5">
                          <span>{factionMeta?.icon}</span>
                          <span>{factionMeta?.name}</span>
                        </label>
                        <span className="text-sm font-medium">{faction.weight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={faction.weight}
                        onChange={e => updateFactionWeight(faction.faction_id, parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  );
                })}

                {!isWeightValid() && (
                  <div className="text-xs text-red-400 flex items-center gap-1 mt-2">
                    <span>⚠️</span>
                    <span>Gewichtung muss insgesamt 100% ergeben</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-white/40 mt-2">
              {selectedFactions.size === 0
                ? 'Optional: Ordne den Habit einem oder mehreren Lebensbereichen zu'
                : 'XP wird nach Gewichtung auf die Bereiche verteilt'}
            </p>
          </div>

          {/* XP per completion (only for positive habits) */}
          {formData.habit_type === 'positive' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
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
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>5 XP</span>
                <span>50 XP</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !isWeightValid()}
              className="flex-1 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : habit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
