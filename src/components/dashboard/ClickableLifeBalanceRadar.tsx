'use client';

import { useRouter } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import type { FactionWithStats, FactionId } from '@/lib/database.types';
import { factionLevelProgress } from '@/lib/data/factions';
import { FACTION_ORDER } from '@/lib/ui/constants';

interface ClickableLifeBalanceRadarProps {
  factions: FactionWithStats[];
}

export default function ClickableLifeBalanceRadar({ factions }: ClickableLifeBalanceRadarProps) {
  const router = useRouter();

  // Map factions to data in correct order
  const data = FACTION_ORDER.map((factionId) => {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) {
      return {
        subject: factionId,
        factionId,
        value: 0,
        level: 1,
        xp: 0,
        fullMark: 100,
        icon: '',
        color: '#666',
      };
    }

    const level = faction.stats?.level || 1;
    const xp = faction.stats?.total_xp || 0;
    const displayValue = Math.min(level * 10, 100);

    return {
      subject: `${faction.icon} ${faction.name_de}`,
      factionId: faction.id,
      value: displayValue,
      level,
      xp,
      progress: factionLevelProgress(xp),
      fullMark: 100,
      icon: faction.icon,
      color: faction.color,
    };
  });

  const avgLevel = factions.length > 0
    ? Math.round(factions.reduce((sum, f) => sum + (f.stats?.level || 1), 0) / factions.length)
    : 1;

  const totalXp = factions.reduce((sum, f) => sum + (f.stats?.total_xp || 0), 0);
  const hasBalanceBonus = factions.every(f => (f.stats?.level || 1) >= 3);

  const handleClick = (data: { factionId: FactionId }) => {
    if (data?.factionId) {
      router.push(`/${data.factionId}`);
    }
  };

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

      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="var(--radar-grid)" strokeWidth={1.5} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'rgba(255, 255, 255, 0.9)', fontSize: 13, fontWeight: 500 }}
              tickLine={false}
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

        {/* Clickable overlay buttons for each faction */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Center - clickable area for each faction */}
          {data.map((item, index) => {
            // Calculate position around the radar (7 items = ~51.4 degrees apart)
            const angle = (index * (360 / 7)) - 90; // Start from top
            const radius = 85; // Distance from center in %
            const x = 50 + radius * Math.cos((angle * Math.PI) / 180) * 0.4;
            const y = 50 + radius * Math.sin((angle * Math.PI) / 180) * 0.4;

            return (
              <button
                key={item.factionId}
                onClick={() => handleClick({ factionId: item.factionId as FactionId })}
                className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full
                           pointer-events-auto hover:bg-white/10 transition-colors cursor-pointer
                           flex items-center justify-center group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                title={`${item.subject} anzeigen`}
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-black/80 px-2 py-1 rounded whitespace-nowrap">
                  Öffnen
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
        {data.map((item) => (
          <button
            key={item.factionId}
            onClick={() => handleClick({ factionId: item.factionId as FactionId })}
            className="px-2 py-1 rounded-lg text-xs transition-all hover:bg-white/10 flex items-center gap-1"
            style={{ color: item.color }}
          >
            <span>{item.icon}</span>
            <span className="text-white/60">Lvl {item.level}</span>
          </button>
        ))}
      </div>

      {/* Total XP Display */}
      <div className="text-center mt-2 text-white/40 text-xs">
        Gesamt: {totalXp.toLocaleString()} XP
      </div>
    </motion.div>
  );
}
