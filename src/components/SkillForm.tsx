'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface SkillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (skill: SkillFormData) => void;
  onDelete?: () => void;
  initialData?: Partial<SkillFormData>;
  domainColor?: string;
  mode: 'create' | 'edit';
}

export interface SkillFormData {
  name: string;
  icon: string;
  description: string;
}

const commonIcons = ['⭐', '🔥', '💡', '🎯', '🚀', '💻', '📚', '🧪', '🎨', '⚡', '🔧', '📊'];

export default function SkillForm({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  domainColor = '#6366f1',
  mode,
}: SkillFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || '⭐');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || '⭐');
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
        description: description.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving skill:', error);
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
      console.error('Error deleting skill:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Neuer Skill' : 'Skill bearbeiten'}
      size="md"
    >
      <div className="space-y-6">
        {/* Preview */}
        <div className="flex justify-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)]"
            style={{
              boxShadow: `
                0 0 20px ${domainColor}40,
                0 0 40px ${domainColor}20,
                inset 0 0 30px ${domainColor}10
              `,
            }}
          >
            <span className="text-4xl">{icon}</span>
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

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Python, React, PCR..."
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
            placeholder="Was ist dieser Skill? Wofür wird er verwendet?"
            className="w-full bg-[var(--background)] border border-[var(--orb-border)] rounded-lg p-3 focus:outline-none focus:border-[var(--accent-primary)] resize-none"
            rows={3}
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
                    Wirklich löschen
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
              style={{ backgroundColor: domainColor }}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              <Save className="w-5 h-5" />
              {isSubmitting
                ? 'Wird gespeichert...'
                : mode === 'create'
                ? 'Skill erstellen'
                : 'Speichern'}
            </motion.button>
          )}
        </div>
      </div>
    </Modal>
  );
}
