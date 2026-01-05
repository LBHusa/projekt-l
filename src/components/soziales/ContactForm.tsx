'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';
import type { Contact, ContactFormData, ContactInfo, RelationshipType } from '@/lib/types/contacts';

interface ContactFormProps {
  contact?: Contact | null;
  category: 'family' | 'friend';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<void>;
}

export default function ContactForm({ contact, category, isOpen, onClose, onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
    notes: '',
  });

  const [selectedCategory, setSelectedCategory] = useState<'family' | 'friend'>(category);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      // Edit mode: populate existing data
      setFormData({
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.contact_info?.email || '',
        phone: contact.contact_info?.phone || '',
        birthday: contact.birthday || '',
        notes: contact.notes || '',
      });
      setSelectedCategory(contact.relationship_category as 'family' | 'friend');
    } else {
      // Create mode: reset to empty
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        birthday: '',
        notes: '',
      });
      setSelectedCategory(category);
    }
    setError(null);
  }, [contact, category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.first_name.trim()) {
      setError('Vorname ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map category → relationship_type
      const relationship_type: RelationshipType =
        selectedCategory === 'family' ? 'parent' : 'friend';

      // Build contact_info JSONB structure
      const contact_info: ContactInfo = {};
      if (formData.email.trim()) contact_info.email = formData.email.trim();
      if (formData.phone.trim()) contact_info.phone = formData.phone.trim();

      const submitData: ContactFormData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || undefined,
        relationship_type,
        birthday: formData.birthday || undefined,
        notes: formData.notes.trim() || undefined,
        contact_info: Object.keys(contact_info).length > 0 ? contact_info : undefined,
      };

      await onSubmit(submitData);
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
        className="w-full max-w-2xl bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            {contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
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

          {/* First Name */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Vorname *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="z.B. Max"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Nachname</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="z.B. Mustermann"
            />
          </div>

          {/* Relationship Category Toggle */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Beziehung *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory('family')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'family'
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                👨‍👩‍👧‍👦 Familie
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('friend')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'friend'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                🤝 Freund
              </button>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="max@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="+49 123 456789"
              />
            </div>
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Geburtstag</label>
            <input
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Zusätzliche Informationen..."
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
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : contact ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
