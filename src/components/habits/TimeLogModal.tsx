'use client';

import { useState } from 'react';
import { X, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import type { HabitWithLogs } from '@/lib/database.types';

interface TimeLogModalProps {
  habit: HabitWithLogs;
  onSubmit: (data: TimeLogData) => Promise<void>;
  onCancel: () => void;
}

export interface TimeLogData {
  habitId: string;
  duration_minutes: number;
  trigger?: string;
  context?: string;
}

export default function TimeLogModal({ habit, onSubmit, onCancel }: TimeLogModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(15);
  const [trigger, setTrigger] = useState('');
  const [context, setContext] = useState('');

  const totalMinutes = hours * 60 + minutes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalMinutes <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        habitId: habit.id,
        duration_minutes: totalMinutes,
        trigger: trigger.trim() || undefined,
        context: context.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-400" />
              Zeit loggen
            </h2>
            <p className="text-sm text-adaptive-muted mt-0.5">{habit.name}</p>
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
          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Dauer *
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-adaptive-muted mb-1">Stunden</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={e => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-center text-2xl font-bold"
                />
              </div>
              <div className="flex items-center text-2xl font-bold text-adaptive-muted pt-6">:</div>
              <div className="flex-1">
                <label className="block text-xs text-adaptive-muted mb-1">Minuten</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutes}
                  onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-center text-2xl font-bold"
                />
              </div>
            </div>
            <div className="mt-2 text-sm text-adaptive-muted text-center">
              Gesamt: <span className="font-medium text-white">{totalMinutes}</span> Minuten
            </div>

            {/* Quick Select */}
            <div className="flex gap-2 mt-3">
              {[15, 30, 60, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setHours(Math.floor(mins / 60));
                    setMinutes(mins % 60);
                  }}
                  className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Auslöser (optional)
            </label>
            <input
              type="text"
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              placeholder="z.B. Langeweile, Stress, Notification"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              maxLength={100}
            />
            <p className="text-xs text-adaptive-dim mt-1">
              Was hat diese Aktivität ausgelöst?
            </p>
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Kontext (optional)
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="z.B. Zuhause, im Bett, nach der Arbeit"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-adaptive-dim mt-1">
              Wo/Wann ist es passiert?
            </p>
          </div>

          {/* Mental Stats Warning */}
          {habit.affects_mental_stats && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-orange-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Mental Stats Einfluss</div>
                  <div className="text-xs text-orange-300/80 mt-1">
                    {habit.mental_stress_impact !== 0 && (
                      <div>Stress: {habit.mental_stress_impact > 0 ? '+' : ''}{habit.mental_stress_impact}</div>
                    )}
                    {habit.mental_focus_impact !== 0 && (
                      <div>Fokus: {habit.mental_focus_impact > 0 ? '+' : ''}{habit.mental_focus_impact}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || totalMinutes <= 0}
              className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white"
            >
              {isSubmitting ? 'Logge...' : 'Zeit loggen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
