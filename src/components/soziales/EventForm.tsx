'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';
import type { SocialEvent, SocialEventType } from '@/lib/database.types';
import type { Contact } from '@/lib/types/contacts';

interface EventFormProps {
  event?: SocialEvent | null;
  contacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
}

export interface EventFormData {
  title: string;
  description?: string | null;
  event_type?: SocialEventType | null;
  occurred_at: string;
  duration_minutes?: number | null;
  location?: string | null;
  participants: string[];
  notes?: string | null;
}

const EVENT_TYPES: { value: SocialEventType; label: string; icon: string }[] = [
  { value: 'party', label: 'Party', icon: '🎉' },
  { value: 'dinner', label: 'Dinner', icon: '🍽️' },
  { value: 'trip', label: 'Ausflug', icon: '🗺️' },
  { value: 'activity', label: 'Aktivität', icon: '⚽' },
  { value: 'meetup', label: 'Treffen', icon: '☕' },
  { value: 'call', label: 'Telefonat', icon: '📞' },
  { value: 'other', label: 'Sonstiges', icon: '📌' },
];

// Helper function to convert ISO datetime to datetime-local format
const isoToDatetimeLocal = (iso: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function EventForm({ event, contacts, isOpen, onClose, onSubmit }: EventFormProps) {
  const [formData, setFormData] = useState<Omit<EventFormData, 'participants'>>({
    title: '',
    description: null,
    event_type: 'meetup',
    occurred_at: '',
    duration_minutes: null,
    location: null,
    notes: null,
  });

  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        event_type: event.event_type || 'meetup',
        occurred_at: event.occurred_at ? isoToDatetimeLocal(event.occurred_at) : '',
        duration_minutes: event.duration_minutes,
        location: event.location,
        notes: event.notes,
      });
      setSelectedParticipants(new Set(event.participants || []));
    } else {
      setFormData({
        title: '',
        description: null,
        event_type: 'meetup',
        occurred_at: '',
        duration_minutes: null,
        location: null,
        notes: null,
      });
      setSelectedParticipants(new Set());
    }
    setError(null);
  }, [event, isOpen]);

  const toggleParticipant = (contactId: string) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    if (!formData.occurred_at) {
      setError('Datum/Zeit ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData: EventFormData = {
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
        participants: Array.from(selectedParticipants),
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

  // Group contacts by category
  const familyContacts = contacts.filter(c => c.category === 'family');
  const friendContacts = contacts.filter(c => c.category === 'friend');

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
            <PartyPopper className="w-5 h-5 text-purple-400" />
            {event ? 'Event bearbeiten' : 'Neues Event'}
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
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="z.B. Geburtstag, Abendessen, Wanderung"
              required
            />
          </div>

          {/* Event Type & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Event-Typ</label>
              <select
                value={formData.event_type || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as SocialEventType || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Datum/Zeit *</label>
              <input
                type="datetime-local"
                value={formData.occurred_at}
                onChange={(e) => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Location & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Ort</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="z.B. Zuhause, Restaurant"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Dauer (Min.)</label>
              <input
                type="number"
                min={0}
                step={15}
                value={formData.duration_minutes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="z.B. 120"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Was war besonders an diesem Event?"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm text-white/60 mb-2">
              Teilnehmer ({selectedParticipants.size} ausgewählt)
            </label>
            <div className="bg-white/5 rounded-lg p-3 max-h-48 overflow-y-auto">
              {familyContacts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-pink-400 font-medium mb-2">Familie</div>
                  <div className="space-y-1">
                    {familyContacts.map(contact => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 p-2 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.has(contact.id)}
                          onChange={() => toggleParticipant(contact.id)}
                          className="w-4 h-4 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm">{contact.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {friendContacts.length > 0 && (
                <div>
                  <div className="text-xs text-cyan-400 font-medium mb-2">Freunde</div>
                  <div className="space-y-1">
                    {friendContacts.map(contact => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 p-2 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.has(contact.id)}
                          onChange={() => toggleParticipant(contact.id)}
                          className="w-4 h-4 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm">{contact.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {contacts.length === 0 && (
                <div className="text-center text-white/30 text-sm py-4">
                  Keine Kontakte vorhanden
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={2}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Zusätzliche Notizen..."
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
              {loading ? 'Speichern...' : event ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
