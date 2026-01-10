'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Briefcase } from 'lucide-react';
import type { FreelanceProject, FreelanceClient } from '@/lib/database.types';

export interface ProjectFormData {
  client_id?: string | null;
  name: string;
  description?: string | null;
  status?: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  currency?: string;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  tags?: string[] | null;
}

interface ProjectFormProps {
  project?: FreelanceProject | null;
  clients: FreelanceClient[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
}

export function ProjectForm({ project, clients, isOpen, onClose, onSubmit }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    client_id: null,
    name: '',
    description: null,
    status: 'planning',
    start_date: null,
    end_date: null,
    budget: null,
    currency: 'EUR',
    hourly_rate: null,
    estimated_hours: null,
    tags: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        client_id: project.client_id,
        name: project.name,
        description: project.description,
        status: project.status,
        start_date: project.start_date,
        end_date: project.end_date,
        budget: project.budget,
        currency: project.currency,
        hourly_rate: project.hourly_rate,
        estimated_hours: project.estimated_hours,
        tags: project.tags,
      });
    } else {
      setFormData({
        client_id: null,
        name: '',
        description: null,
        status: 'planning',
        start_date: null,
        end_date: null,
        budget: null,
        currency: 'EUR',
        hourly_rate: null,
        estimated_hours: null,
        tags: null,
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)] p-6 max-w-2xl w-full my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold">
                {project ? 'Projekt bearbeiten' : 'Neues Projekt'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Name */}
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Projektname * <span className="text-white/50">(erforderlich)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Kunde
                </label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Kein Kunde</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="planning">Planung</option>
                  <option value="active">Aktiv</option>
                  <option value="paused">Pausiert</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="cancelled">Abgebrochen</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Enddatum
                </label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Budget
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Stundensatz (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate || ''}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Geschätzte Stunden
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
