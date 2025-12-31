// Projekt L - XP und Level Berechnung

/**
 * Berechnet die benötigte XP für ein bestimmtes Level.
 * Formel: 100 * level^1.5 (exponentiell)
 *
 * Beispiele:
 * - Level 10:  3.162 XP
 * - Level 25: 12.500 XP
 * - Level 50: 35.355 XP
 * - Level 100: 100.000 XP
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Berechnet die Gesamt-XP für alle Level bis zu einem bestimmten Level.
 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Berechnet das Level basierend auf der Gesamt-XP.
 */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let accumulatedXp = 0;

  while (accumulatedXp + xpForLevel(level) <= totalXp) {
    accumulatedXp += xpForLevel(level);
    level++;
  }

  return level - 1 || 1;
}

/**
 * Berechnet den Fortschritt zum nächsten Level (0-100%).
 */
export function progressToNextLevel(level: number, currentXp: number): number {
  const xpNeeded = xpForLevel(level + 1);
  if (xpNeeded === 0) return 100;

  const progress = (currentXp / xpNeeded) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Berechnet XP und neues Level nach XP-Gewinn.
 * Gibt zurück: { newLevel, newXp, leveledUp, levelsGained }
 */
export function addXp(
  currentLevel: number,
  currentXp: number,
  xpGained: number
): {
  newLevel: number;
  newXp: number;
  leveledUp: boolean;
  levelsGained: number;
} {
  let newXp = currentXp + xpGained;
  let newLevel = currentLevel;
  let levelsGained = 0;

  // Level-Ups berechnen
  while (newXp >= xpForLevel(newLevel + 1)) {
    newXp -= xpForLevel(newLevel + 1);
    newLevel++;
    levelsGained++;
  }

  return {
    newLevel,
    newXp,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

/**
 * Formatiert XP-Werte für die Anzeige (z.B. "12.5K")
 */
export function formatXp(xp: number): string {
  if (xp >= 1_000_000) {
    return `${(xp / 1_000_000).toFixed(1)}M`;
  }
  if (xp >= 1_000) {
    return `${(xp / 1_000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Gibt die Level-Tier-Bezeichnung zurück.
 */
export function getLevelTier(level: number): {
  name: string;
  color: string;
} {
  if (level >= 100) {
    return { name: 'Legendary', color: 'var(--level-diamond)' };
  }
  if (level >= 75) {
    return { name: 'Master', color: 'var(--level-platinum)' };
  }
  if (level >= 50) {
    return { name: 'Expert', color: 'var(--level-gold)' };
  }
  if (level >= 25) {
    return { name: 'Advanced', color: 'var(--level-silver)' };
  }
  return { name: 'Beginner', color: 'var(--level-bronze)' };
}
