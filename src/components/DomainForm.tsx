'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface DomainFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (domain: DomainFormData) => void;
  onDelete?: () => void;
  initialData?: Partial<DomainFormData>;
  mode: 'create' | 'edit';
}

export interface DomainFormData {
  name: string;
  icon: string;
  color: string;
  description: string;
}

const commonIcons = ['💻', '🔬', '🎨', '💪', '💰', '📚', '🎯', '🧠', '🌍', '🎮', '🎵', '📷'];
const colorOptions = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export default function DomainForm({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  mode,
}: DomainFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || '🎯');
  const [color, setColor] = useState(initialData?.color || '#6366f1');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || '🎯');
      setColor(initialData?.color || '#6366f1');
      setDescription(initialData?.description || '');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        icon,
        color,
        description: description.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving domain:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting domain:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Neuer Bereich' : 'Bereich bearbeiten'}
      size="md"
    >
      <div className="space-y-6">
        {/* Preview */}
        <div className="flex justify-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)]"
            style={{
              boxShadow: `
                0 0 30px ${color}50,
                0 0 60px ${color}30,
                inset 0 0 40px ${color}15
              `,
            }}
          >
            <span className="text-5xl">{icon}</span>
          </div>
        </div>

        {/* Icon Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Icon</label>
          <div className="flex flex-wrap gap-2">
            {commonIcons.map((emoji) => (
              <motion.button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-colors ${
                  icon === emoji
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--orb-border)] bg-[var(--background)] hover:border-[var(--accent-primary)]'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {emoji}
              </motion.button>
            ))}
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(-2))}
              className="w-10 h-10 text-center text-xl bg-[var(--background)] border border-[var(--orb-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)]"
              placeholder="📝"
              maxLength={2}
            />
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Farbe</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <motion.button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c
                    ? 'border-white scale-110'
                    : 'border-transparent hover:border-white/50'
                }`}
                style={{ backgroundColor: c }}
                whileHover={{ scale: color === c ? 1.1 : 1.15 }}
                whileTap={{ scale: 0.95 }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Coding, Labor, Design..."
            className="w-full bg-[var(--background)] border border-[var(--orb-border)] rounded-lg p-3 focus:outline-none focus:border-[var(--accent-primary)]"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Worum geht es in diesem Bereich?"
            className="w-full bg-[var(--background)] border border-[var(--orb-border)] rounded-lg p-3 focus:outline-none focus:border-[var(--accent-primary)] resize-none"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {mode === 'edit' && onDelete && (
            <>
              {showDeleteConfirm ? (
                <div className="flex-1 flex gap-2">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-lg font-medium border border-[var(--orb-border)] hover:bg-[var(--background)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-red-500 text-white disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              )}
            </>
          )}

          {!showDeleteConfirm && (
            <motion.button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: color }}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              <Save className="w-5 h-5" />
              {isSubmitting
                ? 'Wird gespeichert...'
                : mode === 'create'
                ? 'Bereich erstellen'
                : 'Speichern'}
            </motion.button>
          )}
        </div>
      </div>
    </Modal>
  );
}
