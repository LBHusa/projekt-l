'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { factionLevelProgress } from '@/lib/data/factions';
import type { FactionWithStats } from '@/lib/database.types';

interface FactionPageHeaderProps {
  faction: FactionWithStats;
}

export default function FactionPageHeader({ faction }: FactionPageHeaderProps) {
  const level = faction.stats?.level || 1;
  const totalXp = faction.stats?.total_xp || 0;
  const progress = factionLevelProgress(totalXp);

  return (
    <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 sticky top-0 z-10 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Link
            href="/"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>

          {/* Faction Icon & Title */}
          <motion.div
            className="flex items-center gap-4 flex-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${faction.color}30` }}
            >
              {faction.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-3">
                {faction.name_de}
                <span
                  className="text-sm font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${faction.color}30`, color: faction.color }}
                >
                  Level {level}
                </span>
              </h1>

              {/* XP Progress Bar */}
              <div className="mt-2 max-w-md">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{totalXp.toLocaleString()} XP</span>
                  <span>{progress}% zum nächsten Level</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: faction.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
