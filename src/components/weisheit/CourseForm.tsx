'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, X } from 'lucide-react';
import type { Course, CourseStatus } from '@/lib/database.types';

interface CourseFormProps {
  course?: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFormData) => Promise<void>;
}

export interface CourseFormData {
  title: string;
  platform: string | null;
  instructor: string | null;
  url: string | null;
  total_hours: number | null;
  status: CourseStatus;
  notes: string | null;
  certificate_url: string | null;
}

const platforms = [
  'Udemy',
  'Coursera',
  'LinkedIn Learning',
  'Pluralsight',
  'YouTube',
  'edX',
  'Skillshare',
  'Frontend Masters',
  'Egghead.io',
  'Andere',
];

export default function CourseForm({ course, isOpen, onClose, onSubmit }: CourseFormProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    platform: null,
    instructor: null,
    url: null,
    total_hours: null,
    status: 'planned',
    notes: null,
    certificate_url: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        platform: course.platform,
        instructor: course.instructor,
        url: course.url,
        total_hours: course.total_hours,
        status: course.status,
        notes: course.notes,
        certificate_url: course.certificate_url,
      });
    } else {
      setFormData({
        title: '',
        platform: null,
        instructor: null,
        url: null,
        total_hours: null,
        status: 'planned',
        notes: null,
        certificate_url: null,
      });
    }
    setError(null);
  }, [course, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
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
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            {course ? 'Kurs bearbeiten' : 'Neuer Kurs'}
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
            <label className="block text-sm text-white/60 mb-1">Kurstitel *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="z.B. React Masterclass"
              required
            />
          </div>

          {/* Platform & Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Plattform</label>
              <select
                value={formData.platform || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Auswählen...</option>
                {platforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Dauer (Std.)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={formData.total_hours || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, total_hours: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="z.B. 12"
              />
            </div>
          </div>

          {/* Instructor */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Dozent/Instructor</label>
            <input
              type="text"
              value={formData.instructor || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value || null }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="Name des Dozenten"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Kurs-URL</label>
            <input
              type="url"
              value={formData.url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value || null }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CourseStatus }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              <option value="planned">Geplant</option>
              <option value="in_progress">In Arbeit</option>
              <option value="completed">Abgeschlossen</option>
              <option value="abandoned">Abgebrochen</option>
            </select>
          </div>

          {/* Certificate URL (only for completed courses) */}
          {formData.status === 'completed' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Zertifikat-URL</label>
              <input
                type="url"
                value={formData.certificate_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_url: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Notizen zum Kurs..."
            />
          </div>

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
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : course ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
