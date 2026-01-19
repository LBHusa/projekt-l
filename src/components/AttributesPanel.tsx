'use client';

import { motion } from 'framer-motion';
import AttributeBar from './AttributeBar';
import type { UserAttributes } from '@/lib/database.types';

interface AttributesPanelProps {
  attributes: UserAttributes;
}

// Attribute configuration with colors and German names
const ATTRIBUTE_CONFIG = {
  str: { label: 'STR', fullName: 'Stärke', color: 'var(--attr-str)' },
  dex: { label: 'DEX', fullName: 'Geschicklichkeit', color: 'var(--attr-dex)' },
  int: { label: 'INT', fullName: 'Intelligenz', color: 'var(--attr-int)' },
  cha: { label: 'CHA', fullName: 'Charisma', color: 'var(--attr-cha)' },
  wis: { label: 'WIS', fullName: 'Weisheit', color: 'var(--attr-wis)' },
  vit: { label: 'VIT', fullName: 'Vitalität', color: 'var(--attr-vit)' },
} as const;

// Order for display (2x3 grid)
const ATTRIBUTE_ORDER: (keyof UserAttributes)[] = ['str', 'dex', 'int', 'cha', 'wis', 'vit'];

export default function AttributesPanel({ attributes }: AttributesPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      <h3 className="text-sm font-medium text-adaptive-muted mb-4 uppercase tracking-wider">
        Attribute
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {ATTRIBUTE_ORDER.map((key, index) => {
          const config = ATTRIBUTE_CONFIG[key];
          const value = attributes[key];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <AttributeBar
                label={config.label}
                fullName={config.fullName}
                value={value}
                color={config.color}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
