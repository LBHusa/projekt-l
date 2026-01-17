'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import type { FactionWithStats } from '@/lib/database.types';
import { factionLevelProgress, MAX_FACTION_LEVEL } from '@/lib/data/factions';

interface LifeBalanceRadarProps {
  factions: FactionWithStats[];
}

// Order for radar display (clockwise from top)
const FACTION_ORDER = [
  'karriere',
  'hobby',
  'gesundheit',
  'finanzen',
  'freunde',
  'lernen',
  'familie',
];

export default function LifeBalanceRadar({ factions }: LifeBalanceRadarProps) {
  // Map factions to data in correct order
  const data = FACTION_ORDER.map((factionId) => {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) {
      return {
        subject: factionId,
        value: 1, // Minimum level 1
        level: 1,
        xp: 0,
        fullMark: MAX_FACTION_LEVEL,
      };
    }

    const level = faction.stats?.level || 1;
    const xp = faction.stats?.total_xp || 0;

    return {
      subject: `${faction.icon} ${faction.name_de}`,
      value: level, // Use raw level (1-20)
      level,
      xp,
      progress: factionLevelProgress(xp),
      fullMark: MAX_FACTION_LEVEL,
    };
  });

  // Calculate average level
  const avgLevel = factions.length > 0
    ? Math.round(factions.reduce((sum, f) => sum + (f.stats?.level || 1), 0) / factions.length)
    : 1;

  // Calculate total XP across all factions
  const totalXp = factions.reduce((sum, f) => sum + (f.stats?.total_xp || 0), 0);

  // Check if all factions are above level 3 (Balance Bonus)
  const hasBalanceBonus = factions.every(f => (f.stats?.level || 1) >= 3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Lebensbalance
        </h3>
        <div className="flex items-center gap-2">
          {hasBalanceBonus && (
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
              Balance-Bonus aktiv
            </span>
          )}
          <span className="text-sm font-bold" style={{ color: 'var(--radar-stroke)' }}>
            Lvl {avgLevel}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--radar-grid)" strokeWidth={1.5} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(255, 255, 255, 0.9)', fontSize: 13, fontWeight: 500 }}
          />
          <Radar
            name="Balance"
            dataKey="value"
            stroke="var(--radar-stroke)"
            fill="var(--radar-fill)"
            fillOpacity={0.75}
            strokeWidth={3}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--orb-border)',
              borderRadius: '8px',
              color: 'white',
            }}
            formatter={(value, name, props) => {
              const item = props.payload;
              return [
                `Level ${item.level} (${item.xp.toLocaleString()} XP)`,
                item.subject
              ];
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Total XP Display */}
      <div className="text-center mt-2 text-white/40 text-xs">
        Gesamt: {totalXp.toLocaleString()} XP
      </div>
    </motion.div>
  );
}
