'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2 } from 'lucide-react';

interface ConnectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ConnectionFormData) => Promise<void>;
  skills: { id: string; name: string; icon: string }[];
  domainColor?: string;
}

export interface ConnectionFormData {
  skillAId: string;
  skillBId: string;
  connectionType: 'prerequisite' | 'synergy' | 'related';
  strength: number;
}

const connectionTypeLabels = {
  prerequisite: { label: 'Voraussetzung', description: 'Skill A ist Voraussetzung für Skill B', color: '#ef4444' },
  synergy: { label: 'Synergie', description: 'Skills verstärken sich gegenseitig', color: '#22c55e' },
  related: { label: 'Verwandt', description: 'Skills sind thematisch verwandt', color: '#6366f1' },
};

export default function ConnectionForm({
  isOpen,
  onClose,
  onSubmit,
  skills,
  domainColor = '#6366f1',
}: ConnectionFormProps) {
  const [skillAId, setSkillAId] = useState('');
  const [skillBId, setSkillBId] = useState('');
  const [connectionType, setConnectionType] = useState<'prerequisite' | 'synergy' | 'related'>('related');
  const [strength, setStrength] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setSkillAId('');
      setSkillBId('');
      setConnectionType('related');
      setStrength(5);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!skillAId || !skillBId) {
      setError('Bitte wähle zwei Skills aus');
      return;
    }

    if (skillAId === skillBId) {
      setError('Bitte wähle zwei verschiedene Skills');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        skillAId,
        skillBId,
        connectionType,
        strength,
      });
      onClose();
    } catch (err) {
      console.error('Error creating connection:', err);
      setError('Fehler beim Erstellen der Verbindung');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-[var(--background-secondary)] rounded-2xl p-6 w-full max-w-md mx-4 border border-[var(--orb-border)]"
            style={{
              boxShadow: `0 0 40px ${domainColor}20`,
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${domainColor}20` }}
                >
                  <Link2 className="w-5 h-5" style={{ color: domainColor }} />
                </div>
                <h2 className="text-xl font-bold">Verbindung erstellen</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--foreground-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Skill A */}
              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  Skill A
                </label>
                <select
                  value={skillAId}
                  onChange={(e) => setSkillAId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--orb-border)] focus:border-[var(--accent-primary)] outline-none transition-colors"
                >
                  <option value="">Skill auswählen...</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.icon} {skill.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Connection Type */}
              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  Verbindungstyp
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(connectionTypeLabels) as Array<keyof typeof connectionTypeLabels>).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setConnectionType(type)}
                      className={`p-3 rounded-lg border transition-all text-center ${
                        connectionType === type
                          ? 'border-2'
                          : 'border-[var(--orb-border)] hover:border-[var(--foreground-muted)]'
                      }`}
                      style={{
                        borderColor: connectionType === type ? connectionTypeLabels[type].color : undefined,
                        backgroundColor: connectionType === type ? `${connectionTypeLabels[type].color}10` : undefined,
                      }}
                    >
                      <div
                        className="text-sm font-medium"
                        style={{ color: connectionType === type ? connectionTypeLabels[type].color : undefined }}
                      >
                        {connectionTypeLabels[type].label}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-2">
                  {connectionTypeLabels[connectionType].description}
                </p>
              </div>

              {/* Skill B */}
              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  Skill B
                </label>
                <select
                  value={skillBId}
                  onChange={(e) => setSkillBId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--orb-border)] focus:border-[var(--accent-primary)] outline-none transition-colors"
                >
                  <option value="">Skill auswählen...</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.icon} {skill.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strength */}
              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  Stärke: {strength}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                  <span>Schwach</span>
                  <span>Stark</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-[var(--orb-border)] hover:bg-[var(--background)] transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading || !skillAId || !skillBId}
                  className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: domainColor }}
                >
                  {loading ? 'Erstellen...' : 'Verbinden'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
