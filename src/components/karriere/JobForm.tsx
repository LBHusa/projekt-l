'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, X } from 'lucide-react';
import type { JobHistory, EmploymentType } from '@/lib/database.types';

interface JobFormProps {
  job?: JobHistory | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
}

export interface JobFormData {
  company: string;
  position: string;
  employment_type: EmploymentType;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  location?: string | null;
}

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Vollzeit' },
  { value: 'part_time', label: 'Teilzeit' },
  { value: 'freelance', label: 'Freiberuflich' },
  { value: 'contract', label: 'Vertrag' },
  { value: 'internship', label: 'Praktikum' },
];

export default function JobForm({ job, isOpen, onClose, onSubmit }: JobFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    company: '',
    position: '',
    employment_type: 'full_time',
    start_date: '',
    end_date: null,
    is_current: false,
    description: null,
    location: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      setFormData({
        company: job.company,
        position: job.position,
        employment_type: job.employment_type,
        start_date: job.start_date,
        end_date: job.end_date,
        is_current: job.is_current,
        description: job.description,
        location: job.location,
      });
    } else {
      setFormData({
        company: '',
        position: '',
        employment_type: 'full_time',
        start_date: '',
        end_date: null,
        is_current: false,
        description: null,
        location: null,
      });
    }
    setError(null);
  }, [job, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) {
      setError('Firma ist erforderlich');
      return;
    }
    if (!formData.position.trim()) {
      setError('Position ist erforderlich');
      return;
    }
    if (!formData.start_date) {
      setError('Startdatum ist erforderlich');
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
            <Briefcase className="w-5 h-5 text-amber-400" />
            {job ? 'Job bearbeiten' : 'Neuer Job'}
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

          {/* Company */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Firma *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              placeholder="z.B. Google, Microsoft"
              required
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Position *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              placeholder="z.B. Senior Developer"
              required
            />
          </div>

          {/* Employment Type & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Anstellungsart</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData(prev => ({ ...prev, employment_type: e.target.value as EmploymentType }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                {EMPLOYMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Standort</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
                placeholder="z.B. Berlin"
              />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Startdatum *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Enddatum</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
                disabled={formData.is_current}
              />
            </div>
          </div>

          {/* Is Current */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_current"
              checked={formData.is_current || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                is_current: e.target.checked,
                end_date: e.target.checked ? null : prev.end_date
              }))}
              className="w-4 h-4 bg-white/10 border-white/20 rounded focus:ring-amber-500"
            />
            <label htmlFor="is_current" className="text-sm text-white/80">
              Aktueller Job
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none resize-none"
              placeholder="Tätigkeiten, Verantwortlichkeiten, Erfolge..."
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
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : job ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
