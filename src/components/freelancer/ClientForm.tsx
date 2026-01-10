'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User } from 'lucide-react';
import type { FreelanceClient } from '@/lib/database.types';

export interface ClientFormData {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  company_info?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

interface ClientFormProps {
  client?: FreelanceClient | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
}

export function ClientForm({ client, isOpen, onClose, onSubmit }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    contact_email: null,
    contact_phone: null,
    company_info: null,
    notes: null,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone,
        company_info: client.company_info,
        notes: client.notes,
        is_active: client.is_active,
      });
    } else {
      setFormData({
        name: '',
        contact_email: null,
        contact_phone: null,
        company_info: null,
        notes: null,
        is_active: true,
      });
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting client:', error);
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)] p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold">
                {client ? 'Kunde bearbeiten' : 'Neuer Kunde'}
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
            {/* Name */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Name * <span className="text-white/50">(erforderlich)</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                E-Mail
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value || null })}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value || null })}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Company Info */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Firma/Organisation
              </label>
              <input
                type="text"
                value={formData.company_info || ''}
                onChange={(e) => setFormData({ ...formData, company_info: e.target.value || null })}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Notizen
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--orb-border)] text-white focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active || false}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--orb-border)] bg-[var(--background-tertiary)] text-amber-500 focus:ring-amber-500/50"
              />
              <label htmlFor="is_active" className="text-sm text-white/70">
                Aktiver Kunde
              </label>
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
