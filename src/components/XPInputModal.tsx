'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Zap } from 'lucide-react';
import Modal from './Modal';

interface XPInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string;
  skillIcon: string;
  skillColor: string;
  onSubmit: (xp: number, description: string) => void;
}

const quickXPOptions = [10, 25, 50, 100, 200, 500];

export default function XPInputModal({
  isOpen,
  onClose,
  skillName,
  skillIcon,
  skillColor,
  onSubmit,
}: XPInputModalProps) {
  const [xp, setXp] = useState(50);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (xp <= 0 || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(xp, description.trim());
      setXp(50);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error adding XP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustXP = (amount: number) => {
    setXp(Math.max(1, xp + amount));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="XP hinzufügen" size="md">
      <div className="space-y-6">
        {/* Skill Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--orb-border)]">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `${skillColor}20`,
              boxShadow: `0 0 15px ${skillColor}30`,
            }}
          >
            <span className="text-2xl">{skillIcon}</span>
          </div>
          <div>
            <div className="font-semibold">{skillName}</div>
            <div className="text-sm text-[var(--foreground-muted)]">
              Erfahrung hinzufügen
            </div>
          </div>
        </div>

        {/* XP Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">XP-Menge</label>
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => adjustXP(-10)}
              className="p-2 rounded-lg bg-[var(--background)] border border-[var(--orb-border)] hover:border-[var(--accent-primary)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Minus className="w-5 h-5" />
            </motion.button>

            <input
              type="number"
              value={xp}
              onChange={(e) => setXp(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center text-2xl font-bold bg-[var(--background)] border border-[var(--orb-border)] rounded-lg py-3 focus:outline-none focus:border-[var(--accent-primary)]"
              min={1}
            />

            <motion.button
              onClick={() => adjustXP(10)}
              className="p-2 rounded-lg bg-[var(--background)] border border-[var(--orb-border)] hover:border-[var(--accent-primary)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Quick XP Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {quickXPOptions.map((option) => (
              <motion.button
                key={option}
                onClick={() => setXp(option)}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  xp === option
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                    : 'bg-[var(--background)] border-[var(--orb-border)] hover:border-[var(--accent-primary)]'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                +{option}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Was hast du gemacht?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. API-Endpoint implementiert, Tutorial abgeschlossen..."
            className="w-full bg-[var(--background)] border border-[var(--orb-border)] rounded-lg p-3 focus:outline-none focus:border-[var(--accent-primary)] resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={xp <= 0 || !description.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: skillColor }}
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        >
          <Zap className="w-5 h-5" />
          {isSubmitting ? 'Wird hinzugefügt...' : `+${xp} XP hinzufügen`}
        </motion.button>
      </div>
    </Modal>
  );
}
