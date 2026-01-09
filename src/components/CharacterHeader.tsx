'use client';

import { motion } from 'framer-motion';

interface CharacterHeaderProps {
  username: string | null;
  avatarUrl: string | null;
  totalLevel: number;
  totalXp: number;
  xpForNextLevel?: number; // XP needed for next level (default: 1000)
}

export default function CharacterHeader({
  username,
  avatarUrl,
  totalLevel,
  totalXp,
  xpForNextLevel = 1000,
}: CharacterHeaderProps) {
  // Calculate XP progress
  const xpInCurrentLevel = totalXp % xpForNextLevel;
  const xpProgress = (xpInCurrentLevel / xpForNextLevel) * 100;

  // Get display name (fallback to "Abenteurer")
  const displayName = username || 'Abenteurer';

  // Get initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between gap-3 md:gap-6 p-4 bg-[var(--background-secondary)]/60 backdrop-blur-sm rounded-xl border border-[var(--orb-border)]"
    >
      {/* Left: Avatar + Name */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              }}
            >
              {initials}
            </div>
          )}

          {/* Level badge on avatar */}
          <div className="absolute -bottom-1 -right-1 bg-[var(--background)] rounded-full px-2 py-0.5 text-xs font-bold border border-[var(--orb-border)]">
            <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Lv.{totalLevel}
            </span>
          </div>
        </div>

        {/* Name + Title */}
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
            {displayName}
          </h1>
          <p className="text-sm text-white/50">
            Level {totalLevel} Abenteurer
          </p>
        </div>
      </div>

      {/* Right: XP Progress */}
      <div className="flex-1 max-w-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/60">Erfahrung</span>
          <span className="text-xs font-medium text-white/80">
            {xpInCurrentLevel.toLocaleString('de-DE')} / {xpForNextLevel.toLocaleString('de-DE')} XP
          </span>
        </div>

        <div className="xp-bar h-2.5">
          <motion.div
            className="xp-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/40">
            {Math.round(xpProgress)}% bis Level {totalLevel + 1}
          </span>
          <span className="text-[10px] text-white/40">
            Gesamt: {totalXp.toLocaleString('de-DE')} XP
          </span>
        </div>
      </div>
    </motion.div>
  );
}
