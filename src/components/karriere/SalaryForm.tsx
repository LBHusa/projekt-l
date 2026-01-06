'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, X } from 'lucide-react';
import type { JobHistory, SalaryPeriod, SalaryEntry } from '@/lib/database.types';

interface SalaryFormProps {
  jobs: JobHistory[];
  salary?: SalaryEntry | null;
  defaultJobId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SalaryFormData) => Promise<void>;
}

export interface SalaryFormData {
  job_id: string;
  amount: number;
  currency?: string;
  period?: SalaryPeriod;
  effective_date: string;
  notes?: string | null;
}

const CURRENCIES = [
  { value: 'EUR', label: '€ EUR' },
  { value: 'USD', label: '$ USD' },
  { value: 'CHF', label: 'CHF' },
  { value: 'GBP', label: '£ GBP' },
];

const SALARY_PERIODS: { value: SalaryPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'hourly', label: 'Stündlich' },
];

export default function SalaryForm({ jobs, salary, defaultJobId, isOpen, onClose, onSubmit }: SalaryFormProps) {
  const [formData, setFormData] = useState<SalaryFormData>({
    job_id: defaultJobId || '',
    amount: 0,
    currency: 'EUR',
    period: 'monthly',
    effective_date: new Date().toISOString().split('T')[0],
    notes: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salary) {
      // Editing existing salary
      setFormData({
        job_id: salary.job_id || defaultJobId || (jobs[0]?.id || ''),
        amount: salary.amount,
        currency: salary.currency || 'EUR',
        period: (salary.period as SalaryPeriod) || 'monthly',
        effective_date: salary.effective_date,
        notes: salary.notes,
      });
    } else {
      // Creating new salary
      setFormData({
        job_id: defaultJobId || (jobs[0]?.id || ''),
        amount: 0,
        currency: 'EUR',
        period: 'monthly',
        effective_date: new Date().toISOString().split('T')[0],
        notes: null,
      });
    }
    setError(null);
  }, [salary, defaultJobId, jobs, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_id) {
      setError('Job ist erforderlich');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Betrag muss größer als 0 sein');
      return;
    }
    if (!formData.effective_date) {
      setError('Gültig ab ist erforderlich');
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
            <DollarSign className="w-5 h-5 text-amber-400" />
            {salary ? 'Gehalt bearbeiten' : 'Gehalt eintragen'}
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

          {/* Job Selection */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Job *</label>
            <select
              value={formData.job_id}
              onChange={(e) => setFormData(prev => ({ ...prev, job_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              required
            >
              {jobs.length === 0 ? (
                <option value="">Keine Jobs vorhanden</option>
              ) : (
                jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.position} @ {job.company}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Betrag *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value ? parseFloat(e.target.value) : 0 }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
                placeholder="z.B. 5000"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Währung</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.value} value={curr.value}>{curr.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Period & Effective Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Periode</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as SalaryPeriod }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                {SALARY_PERIODS.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Gültig ab *</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-amber-500 focus:outline-none resize-none"
              placeholder="Zusätzliche Informationen zum Gehalt..."
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
              disabled={loading || jobs.length === 0}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : (salary ? 'Speichern' : 'Hinzufügen')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
