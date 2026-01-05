'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, X } from 'lucide-react';
import type { CareerGoal, CareerGoalStatus } from '@/lib/database.types';

interface CareerGoalFormProps {
  goal?: CareerGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CareerGoalFormData) => Promise<void>;
}

export interface CareerGoalFormData {
  title: string;
  description?: string | null;
  target_date?: string | null;
  progress?: number;
  status?: CareerGoalStatus;
}

export default function CareerGoalForm({ goal, isOpen, onClose, onSubmit }: CareerGoalFormProps) {
  const [formData, setFormData] = useState<CareerGoalFormData>({
    title: '',
    description: null,
    target_date: null,
    progress: 0,
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        description: goal.description,
        target_date: goal.target_date,
        progress: goal.progress,
        status: goal.status,
      });
    } else {
      setFormData({
        title: '',
        description: null,
        target_date: null,
        progress: 0,
        status: 'active',
      });
    }
    setError(null);
  }, [goal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }
    if (formData.progress !== undefined && (formData.progress < 0 || formData.progress > 100)) {
      setError('Fortschritt muss zwischen 0 und 100 liegen');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            {goal ? 'Ziel bearbeiten' : 'Neues Ziel'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Titel *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              placeholder="z.B. Senior Developer werden"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none resize-none"
              placeholder="Details zum Ziel..."
            />
          </div>

          {/* Progress Slider */}
          <div>
            <label className="block text-sm text-white/60 mb-1">
              Fortschritt: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress || 0}
              onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Zieldatum</label>
            <input
              type="date"
              value={formData.target_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value || null }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Status (only in edit mode) */}
          {goal && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CareerGoalStatus }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                <option value="active">Aktiv</option>
                <option value="achieved">Erreicht</option>
                <option value="abandoned">Aufgegeben</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : goal ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
