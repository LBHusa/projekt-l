'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { HobbyProject, HobbyProjectStatus } from '@/lib/database.types';
import { HOBBY_CATEGORIES } from '@/lib/data/hobbys';

const PROJECT_ICONS = ['🎨', '🎵', '🎮', '🔨', '⚽', '💻', '🍳', '🌱', '📷', '✍️', '🎸', '🎬', '📚', '🧩', '✨'];

const STATUS_OPTIONS: { id: HobbyProjectStatus; name: string; color: string }[] = [
  { id: 'active', name: 'Aktiv', color: 'text-green-400 bg-green-400/20' },
  { id: 'paused', name: 'Pausiert', color: 'text-yellow-400 bg-yellow-400/20' },
  { id: 'completed', name: 'Abgeschlossen', color: 'text-blue-400 bg-blue-400/20' },
  { id: 'abandoned', name: 'Aufgegeben', color: 'text-gray-400 bg-gray-400/20' },
];

interface HobbyProjectFormProps {
  project?: HobbyProject | null;
  onSubmit: (data: HobbyProjectFormData) => Promise<void>;
  onCancel: () => void;
}

export interface HobbyProjectFormData {
  name: string;
  description?: string | null;
  category?: string | null;
  icon: string;
  status: HobbyProjectStatus;
  progress: number;
  started_at?: string | null;
}

export default function HobbyProjectForm({ project, onSubmit, onCancel }: HobbyProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<HobbyProjectFormData>({
    name: project?.name || '',
    description: project?.description || '',
    category: project?.category || null,
    icon: project?.icon || '🎨',
    status: project?.status || 'active',
    progress: project?.progress || 0,
    started_at: project?.started_at || new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <h2 className="text-lg font-bold">
            {project ? 'Projekt bearbeiten' : 'Neues Projekt'}
          </h2>
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
              placeholder="z.B. Gitarre lernen"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Worum geht es in diesem Projekt?"
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Kategorie</label>
            <div className="grid grid-cols-4 gap-2">
              {HOBBY_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                  className={`py-2 px-2 rounded-lg text-xs transition-all flex flex-col items-center gap-1 ${
                    formData.category === category.id
                      ? 'bg-white/20 ring-1 ring-white/50'
                      : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_ICONS.map(icon => (
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

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: status.id }))}
                  className={`py-2 px-3 rounded-lg text-sm transition-all ${
                    formData.status === status.id
                      ? status.color
                      : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                  }`}
                >
                  {status.name}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Fortschritt: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={e => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
              className="w-full accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-xs text-adaptive-dim mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Startdatum</label>
            <input
              type="date"
              value={formData.started_at?.split('T')[0] || ''}
              onChange={e => setFormData(prev => ({ ...prev, started_at: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
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
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : project ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
