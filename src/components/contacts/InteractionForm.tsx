'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Clock, MapPin, Users } from 'lucide-react';
import type {
  InteractionFormData,
  InteractionType,
  InteractionQuality,
  Contact,
} from '@/lib/types/contacts';
import {
  INTERACTION_TYPE_META,
  QUALITY_META,
  calculateInteractionXp,
  getDisplayName,
} from '@/lib/types/contacts';

interface InteractionFormProps {
  contact: Contact;
  onSubmit: (data: InteractionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function InteractionForm({
  contact,
  onSubmit,
  onCancel,
  isLoading = false,
}: InteractionFormProps) {
  const [formData, setFormData] = useState<InteractionFormData>({
    contact_id: contact.id,
    interaction_type: 'meeting',
    quality: 'good',
    duration_minutes: undefined,
    title: '',
    description: '',
    location: '',
    participants: [],
  });

  // Berechne XP-Vorschau
  const previewXp = calculateInteractionXp(
    formData.interaction_type,
    formData.quality,
    formData.duration_minutes
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Neue Interaktion</h2>
            <p className="text-sm text-white/60">mit {getDisplayName(contact)}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Interaktionstyp */}
          <div>
            <label className="text-sm text-white/60 block mb-2">Art der Interaktion</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(INTERACTION_TYPE_META) as [InteractionType, typeof INTERACTION_TYPE_META[InteractionType]][]).map(
                ([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, interaction_type: type })}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      formData.interaction_type === type
                        ? 'bg-purple-500/20 border border-purple-500'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                    title={meta.labelDe}
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <span className="text-[10px] text-white/60 truncate w-full text-center">
                      {meta.labelDe}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Qualität */}
          <div>
            <label className="text-sm text-white/60 block mb-2">Qualität</label>
            <div className="flex gap-2">
              {(Object.entries(QUALITY_META) as [InteractionQuality, typeof QUALITY_META[InteractionQuality]][]).map(
                ([quality, meta]) => (
                  <button
                    key={quality}
                    type="button"
                    onClick={() => setFormData({ ...formData, quality })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      formData.quality === quality
                        ? 'text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    style={{
                      backgroundColor:
                        formData.quality === quality ? meta.color + '40' : undefined,
                      borderColor: formData.quality === quality ? meta.color : 'transparent',
                      borderWidth: '1px',
                    }}
                  >
                    {meta.labelDe}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Dauer */}
          <div>
            <label className="text-sm text-white/60 block mb-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Dauer (Minuten)
            </label>
            <input
              type="number"
              placeholder="Optional"
              min="1"
              max="480"
              value={formData.duration_minutes || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Titel & Beschreibung */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Titel (optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
            <textarea
              placeholder="Beschreibung (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Ort */}
          <div>
            <label className="text-sm text-white/60 block mb-2">
              <MapPin className="w-3 h-3 inline mr-1" />
              Ort (optional)
            </label>
            <input
              type="text"
              placeholder="z.B. Cafe, Zuhause..."
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* XP Preview */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 flex items-center justify-between">
            <span className="text-white/60 text-sm">XP-Gewinn</span>
            <span className="text-xl font-bold text-purple-400">+{previewXp} XP</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isLoading ? 'Speichert...' : 'Eintragen'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
