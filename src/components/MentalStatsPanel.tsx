'use client';

import { motion } from 'framer-motion';
import type { MentalStats } from '@/lib/database.types';

interface MentalStatsPanelProps {
  stats: MentalStats;
}

interface MentalStatConfig {
  label: string;
  icon: string;
  color: string;
  inverted?: boolean; // true = lower is better (like stress)
}

const MENTAL_CONFIG: Record<keyof MentalStats, MentalStatConfig> = {
  stimmung: { label: 'Stimmung', icon: '😊', color: 'var(--mental-stimmung)' },
  motivation: { label: 'Motivation', icon: '🔥', color: 'var(--mental-motivation)' },
  stress: { label: 'Stress', icon: '😰', color: 'var(--mental-stress)', inverted: true },
  fokus: { label: 'Fokus', icon: '🎯', color: 'var(--mental-fokus)' },
  kreativitaet: { label: 'Kreativität', icon: '💡', color: 'var(--mental-kreativitaet)' },
  soziale_batterie: { label: 'Soz. Batterie', icon: '🔋', color: 'var(--mental-soziale-batterie)' },
};

// Order for display
const MENTAL_ORDER: (keyof MentalStats)[] = [
  'stimmung',
  'motivation',
  'stress',
  'fokus',
  'kreativitaet',
  'soziale_batterie',
];

function getStatusLabel(value: number, inverted: boolean = false): string {
  const effectiveValue = inverted ? 100 - value : value;
  if (effectiveValue >= 80) return 'Exzellent';
  if (effectiveValue >= 60) return 'Gut';
  if (effectiveValue >= 40) return 'Okay';
  if (effectiveValue >= 20) return 'Niedrig';
  return 'Kritisch';
}

export default function MentalStatsPanel({ stats }: MentalStatsPanelProps) {
  // Calculate overall mental health (stress is inverted)
  const overallHealth = Math.round(
    (stats.stimmung +
      stats.motivation +
      (100 - stats.stress) + // Invert stress
      stats.fokus +
      stats.kreativitaet +
      stats.soziale_batterie) /
      6
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          🧠 Seele & Kopf
        </h3>
        <span
          className="text-sm font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `rgba(139, 92, 246, 0.2)`,
            color: 'var(--accent-secondary)',
          }}
        >
          {overallHealth}%
        </span>
      </div>

      <div className="space-y-3">
        {MENTAL_ORDER.map((key, index) => {
          const config = MENTAL_CONFIG[key];
          const value = stats[key];
          const percentage = (value / 100) * 100;
          const statusLabel = getStatusLabel(value, config.inverted);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{config.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">{config.label}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {statusLabel}
                      </span>
                      <span className="font-bold tabular-nums" style={{ color: config.color }}>
                        {value}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: config.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * index }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mental tip based on lowest stat */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <MentalTip stats={stats} />
      </div>
    </motion.div>
  );
}

function MentalTip({ stats }: { stats: MentalStats }) {
  // Find the stat that needs most attention (lowest, or highest for stress)
  const adjustedStats: Record<keyof MentalStats, number> = {
    stimmung: stats.stimmung,
    motivation: stats.motivation,
    stress: 100 - stats.stress, // Invert for comparison
    fokus: stats.fokus,
    kreativitaet: stats.kreativitaet,
    soziale_batterie: stats.soziale_batterie,
  };

  let lowestStat: keyof MentalStats = 'stimmung';
  let lowestValue = adjustedStats.stimmung;

  (Object.keys(adjustedStats) as (keyof MentalStats)[]).forEach((key) => {
    if (adjustedStats[key] < lowestValue) {
      lowestValue = adjustedStats[key];
      lowestStat = key;
    }
  });

  const tips: Record<keyof MentalStats, string> = {
    stimmung: 'Gönn dir etwas Schönes heute',
    motivation: 'Setze dir ein kleines erreichbares Ziel',
    stress: 'Nimm dir Zeit zum Durchatmen',
    fokus: 'Eliminiere Ablenkungen für 25 Minuten',
    kreativitaet: 'Probiere etwas Neues aus',
    soziale_batterie: 'Plane Zeit mit Freunden ein',
  };

  return (
    <p className="text-xs text-white/50 italic">
      💡 Tipp: {tips[lowestStat]}
    </p>
  );
}
