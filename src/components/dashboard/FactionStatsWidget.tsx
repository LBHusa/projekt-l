'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight } from 'lucide-react';
import type { FactionWithStats, FactionId } from '@/lib/database.types';

interface FactionStatsWidgetProps {
  factions: FactionWithStats[];
}

export default function FactionStatsWidget({ factions }: FactionStatsWidgetProps) {
  const router = useRouter();

  const handleFactionClick = (factionId: FactionId) => {
    router.push(`/${factionId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6"
    >
      <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
        Fraktionen
      </h3>

      <div className="space-y-2">
        {factions.map((faction, index) => {
          const level = faction.stats?.level || 1;
          const totalXp = faction.stats?.total_xp || 0;
          const weeklyXp = faction.stats?.weekly_xp || 0;

          return (
            <motion.button
              key={faction.id}
              onClick={() => handleFactionClick(faction.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-l-3"
              style={{ borderLeftColor: faction.color }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Left: Icon + Name */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="text-2xl">{faction.icon}</span>
                <span className="text-white font-medium">{faction.name_de}</span>
              </div>

              {/* Center: Level + XP */}
              <div className="flex items-center gap-3 flex-1">
                <span
                  className="px-2 py-1 rounded-md text-sm font-semibold"
                  style={{
                    backgroundColor: `${faction.color}20`,
                    color: faction.color,
                  }}
                >
                  Lvl {level}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/60 text-sm">
                  {totalXp.toLocaleString()} XP
                </span>
              </div>

              {/* Right: Weekly Progress */}
              <div className={`flex items-center gap-2 ${weeklyXp > 0 ? 'text-green-400' : 'text-white/40'}`}>
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {weeklyXp > 0 ? `+${weeklyXp.toLocaleString()}` : '+0'} XP
                </span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
