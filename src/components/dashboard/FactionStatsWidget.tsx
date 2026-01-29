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
      <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider mb-4">
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
              className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-l-3 gap-2 sm:gap-0"
              style={{ borderLeftColor: faction.color }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Top row on mobile / Left on desktop: Icon + Name + Level */}
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto sm:min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{faction.icon}</span>
                  <span className="text-adaptive font-medium truncate">{faction.name_de}</span>
                </div>
                <span
                  className="px-2 py-1 rounded-md text-sm font-semibold shrink-0"
                  style={{
                    backgroundColor: `${faction.color}20`,
                    color: faction.color,
                  }}
                >
                  Lvl {level}
                </span>
              </div>

              {/* Bottom row on mobile / Right on desktop: XP stats */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <span className="text-adaptive-muted text-sm">
                  {totalXp.toLocaleString()} XP
                </span>
                <div className={`flex items-center gap-2 ${weeklyXp > 0 ? 'text-green-400' : 'text-adaptive-dim'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {weeklyXp > 0 ? `+${weeklyXp.toLocaleString()}` : '+0'} XP
                  </span>
                  <ChevronRight className="w-4 h-4 text-adaptive-dim" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
