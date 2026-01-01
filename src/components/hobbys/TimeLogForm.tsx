'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import type { HobbyProject } from '@/lib/database.types';

interface TimeLogFormProps {
  projects: HobbyProject[];
  selectedProjectId?: string;
  onSubmit: (data: TimeLogFormData) => Promise<void>;
  onCancel: () => void;
}

export interface TimeLogFormData {
  project_id: string;
  duration_minutes: number;
  logged_at: string;
  notes?: string | null;
}

const QUICK_DURATIONS = [
  { label: '15 Min', minutes: 15 },
  { label: '30 Min', minutes: 30 },
  { label: '45 Min', minutes: 45 },
  { label: '1 Std', minutes: 60 },
  { label: '1.5 Std', minutes: 90 },
  { label: '2 Std', minutes: 120 },
  { label: '3 Std', minutes: 180 },
  { label: '4 Std', minutes: 240 },
];

export default function TimeLogForm({ projects, selectedProjectId, onSubmit, onCancel }: TimeLogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TimeLogFormData>({
    project_id: selectedProjectId || (projects[0]?.id || ''),
    duration_minutes: 60,
    logged_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || formData.duration_minutes <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        logged_at: new Date(formData.logged_at).toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} Std`;
    return `${hours} Std ${mins} Min`;
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Zeit loggen</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Projekt *</label>
            {projects.length === 0 ? (
              <p className="text-white/40 text-sm py-2">Keine aktiven Projekte vorhanden</p>
            ) : (
              <select
                value={formData.project_id}
                onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                required
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
            )}
            {selectedProject && (
              <p className="text-xs text-white/40 mt-1">
                Bisherige Zeit: {selectedProject.total_hours} Std
              </p>
            )}
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Dauer: {formatDuration(formData.duration_minutes)}
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {QUICK_DURATIONS.map(({ label, minutes }) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration_minutes: minutes }))}
                  className={`py-2 px-2 rounded-lg text-xs transition-all ${
                    formData.duration_minutes === minutes
                      ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="5"
              max="480"
              step="5"
              value={formData.duration_minutes}
              onChange={e => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>5 Min</span>
              <span>4 Std</span>
              <span>8 Std</span>
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Zeitpunkt</label>
            <input
              type="datetime-local"
              value={formData.logged_at}
              onChange={e => setFormData(prev => ({ ...prev, logged_at: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notizen (optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Was hast du gemacht?"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
            />
          </div>

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
              disabled={isSubmitting || !formData.project_id || formData.duration_minutes <= 0}
              className="flex-1 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : 'Zeit loggen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
