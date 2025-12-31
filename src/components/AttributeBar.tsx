'use client';

import { motion } from 'framer-motion';

interface AttributeBarProps {
  label: string;       // "STR", "DEX", etc.
  fullName: string;    // "Stärke", "Geschicklichkeit", etc.
  value: number;       // 0-100
  color: string;       // CSS color value
  maxValue?: number;   // Default 100
}

export default function AttributeBar({
  label,
  fullName,
  value,
  color,
  maxValue = 100,
}: AttributeBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));

  return (
    <div className="group" title={`${fullName}: ${value}/${maxValue}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
          <span className="text-xs text-white/40 hidden group-hover:inline transition-opacity">
            {fullName}
          </span>
        </div>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>

      <div className="attribute-bar">
        <motion.div
          className="attribute-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
