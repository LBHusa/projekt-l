'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, User, Heart, Calendar, MessageSquare } from 'lucide-react';
import type { ContactFormData, RelationshipType, RelationshipCategory } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, CATEGORY_META } from '@/lib/types/contacts';

interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    relationship_type: initialData?.relationship_type || 'friend',
    birthday: initialData?.birthday || '',
    anniversary: initialData?.anniversary || '',
    met_date: initialData?.met_date || '',
    met_context: initialData?.met_context || '',
    notes: initialData?.notes || '',
    shared_interests: initialData?.shared_interests || [],
    trust_level: initialData?.trust_level || 50,
    is_favorite: initialData?.is_favorite || false,
  });

  const [interestsInput, setInterestsInput] = useState(
    initialData?.shared_interests?.join(', ') || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse interests
    const interests = interestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    onSubmit({
      ...formData,
      shared_interests: interests,
    });
  };

  // Gruppiere Beziehungstypen nach Kategorie
  const typesByCategory: Record<RelationshipCategory, RelationshipType[]> = {
    family: [],
    friend: [],
    professional: [],
    other: [],
  };

  (Object.entries(RELATIONSHIP_TYPE_META) as [RelationshipType, typeof RELATIONSHIP_TYPE_META[RelationshipType]][]).forEach(
    ([type, meta]) => {
      typesByCategory[meta.category].push(type);
    }
  );

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
        className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-adaptive">
            {initialData?.first_name ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 text-adaptive-dim hover:text-adaptive transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adaptive-muted">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Basis-Informationen</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Vorname *"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30"
              />
              <input
                type="text"
                placeholder="Nachname"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30"
              />
            </div>

            <input
              type="text"
              placeholder="Spitzname (optional)"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Beziehungstyp */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adaptive-muted">
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">Beziehungstyp</span>
            </div>

            <select
              value={formData.relationship_type}
              onChange={(e) =>
                setFormData({ ...formData, relationship_type: e.target.value as RelationshipType })
              }
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive focus:outline-none focus:border-white/30"
            >
              {(Object.entries(typesByCategory) as [RelationshipCategory, RelationshipType[]][]).map(
                ([category, types]) => (
                  <optgroup key={category} label={CATEGORY_META[category].labelDe}>
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {RELATIONSHIP_TYPE_META[type].icon} {RELATIONSHIP_TYPE_META[type].labelDe}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          {/* Wichtige Daten */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adaptive-muted">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Wichtige Daten</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-adaptive-dim block mb-1">Geburtstag</label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-adaptive-dim block mb-1">Jahrestag</label>
                <input
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-adaptive-dim block mb-1">Kennengelernt am</label>
                <input
                  type="date"
                  value={formData.met_date}
                  onChange={(e) => setFormData({ ...formData, met_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-adaptive-dim block mb-1">Wo/Wie kennengelernt</label>
                <input
                  type="text"
                  placeholder="z.B. Arbeit, Party..."
                  value={formData.met_context}
                  onChange={(e) => setFormData({ ...formData, met_context: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
          </div>

          {/* Interessen & Notizen */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adaptive-muted">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Zusatzinfos</span>
            </div>

            <input
              type="text"
              placeholder="Gemeinsame Interessen (kommagetrennt)"
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30"
            />

            <textarea
              placeholder="Notizen..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive placeholder:text-adaptive-dim focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Trust Level & Favorite */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-adaptive-dim block mb-1">
                Vertrauens-Level: {formData.trust_level}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.trust_level}
                onChange={(e) =>
                  setFormData({ ...formData, trust_level: parseInt(e.target.value) })
                }
                className="w-full accent-purple-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-adaptive-muted">Favorit</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.first_name}
              className="flex-1 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
