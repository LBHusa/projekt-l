import { describe, it, expect } from 'vitest';
import {
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  progressToNextLevel,
  addXp,
  formatXp,
  getLevelTier,
} from '@/lib/xp';

describe('XP System', () => {
  describe('xpForLevel', () => {
    it('returns 0 for level 0 or negative', () => {
      expect(xpForLevel(0)).toBe(0);
      expect(xpForLevel(-1)).toBe(0);
      expect(xpForLevel(-100)).toBe(0);
    });

    it('calculates XP correctly using 100 * level^1.5 formula', () => {
      // Level 1: 100 * 1^1.5 = 100
      expect(xpForLevel(1)).toBe(100);

      // Level 2: 100 * 2^1.5 ≈ 282
      expect(xpForLevel(2)).toBe(282);

      // Level 10: 100 * 10^1.5 ≈ 3162
      expect(xpForLevel(10)).toBe(3162);

      // Level 25: 100 * 25^1.5 = 12,500
      expect(xpForLevel(25)).toBe(12500);

      // Level 100: 100 * 100^1.5 = 100,000
      expect(xpForLevel(100)).toBe(100000);
    });

    it('always returns an integer (floored)', () => {
      for (let level = 1; level <= 50; level++) {
        const xp = xpForLevel(level);
        expect(Number.isInteger(xp)).toBe(true);
      }
    });
  });

  describe('totalXpForLevel', () => {
    it('returns 0 for level 0', () => {
      expect(totalXpForLevel(0)).toBe(0);
    });

    it('returns XP for level 1 only when level is 1', () => {
      expect(totalXpForLevel(1)).toBe(xpForLevel(1));
    });

    it('sums XP correctly for multiple levels', () => {
      // Level 3 = xpForLevel(1) + xpForLevel(2) + xpForLevel(3)
      const expected = xpForLevel(1) + xpForLevel(2) + xpForLevel(3);
      expect(totalXpForLevel(3)).toBe(expected);
    });

    it('is cumulative (each level adds more)', () => {
      let prevTotal = 0;
      for (let level = 1; level <= 10; level++) {
        const total = totalXpForLevel(level);
        expect(total).toBeGreaterThan(prevTotal);
        prevTotal = total;
      }
    });
  });

  describe('levelFromXp', () => {
    it('returns 1 for 0 XP', () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it('returns 1 for negative XP', () => {
      expect(levelFromXp(-100)).toBe(1);
    });

    it('calculates level correctly', () => {
      // Just under level 2 threshold
      expect(levelFromXp(99)).toBe(1);

      // Exactly at level 2 threshold
      expect(levelFromXp(100)).toBe(1);

      // Just over level 2 threshold (100 + 282 = 382)
      expect(levelFromXp(382)).toBe(2);
    });

    it('handles high XP values', () => {
      const highXp = totalXpForLevel(50);
      expect(levelFromXp(highXp)).toBe(50);
    });
  });

  describe('progressToNextLevel', () => {
    it('returns 0% for 0 XP at any level', () => {
      expect(progressToNextLevel(1, 0)).toBe(0);
      expect(progressToNextLevel(5, 0)).toBe(0);
    });

    it('returns 50% when halfway to next level', () => {
      const xpNeeded = xpForLevel(2); // XP needed for level 2
      const halfXp = xpNeeded / 2;
      expect(progressToNextLevel(1, halfXp)).toBe(50);
    });

    it('caps at 100%', () => {
      const xpNeeded = xpForLevel(2);
      expect(progressToNextLevel(1, xpNeeded * 2)).toBe(100);
    });

    it('never returns negative', () => {
      expect(progressToNextLevel(1, -100)).toBe(0);
    });
  });

  describe('addXp', () => {
    it('adds XP without level up', () => {
      const result = addXp(1, 0, 50);
      expect(result.newLevel).toBe(1);
      expect(result.newXp).toBe(50);
      expect(result.leveledUp).toBe(false);
      expect(result.levelsGained).toBe(0);
    });

    it('handles level up correctly', () => {
      // At level 1 with 0 XP, add enough to level up
      // Level 2 requires xpForLevel(2) = 282 XP
      const result = addXp(1, 0, 300);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
      expect(result.newXp).toBe(300 - xpForLevel(2)); // Remaining XP
    });

    it('handles multiple level ups', () => {
      // Add massive XP to trigger multiple level ups
      const result = addXp(1, 0, 10000);
      expect(result.newLevel).toBeGreaterThan(3);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBeGreaterThan(1);
    });

    it('preserves overflow XP correctly', () => {
      const xpToLevel2 = xpForLevel(2);
      const overflow = 10;
      const result = addXp(1, 0, xpToLevel2 + overflow);
      expect(result.newXp).toBe(overflow);
    });
  });

  describe('formatXp', () => {
    it('formats small numbers as-is', () => {
      expect(formatXp(0)).toBe('0');
      expect(formatXp(100)).toBe('100');
      expect(formatXp(999)).toBe('999');
    });

    it('formats thousands with K suffix', () => {
      expect(formatXp(1000)).toBe('1.0K');
      expect(formatXp(1500)).toBe('1.5K');
      expect(formatXp(12500)).toBe('12.5K');
      expect(formatXp(999999)).toBe('1000.0K');
    });

    it('formats millions with M suffix', () => {
      expect(formatXp(1000000)).toBe('1.0M');
      expect(formatXp(2500000)).toBe('2.5M');
    });
  });

  describe('getLevelTier', () => {
    it('returns Beginner for levels 1-24', () => {
      expect(getLevelTier(1).name).toBe('Beginner');
      expect(getLevelTier(24).name).toBe('Beginner');
    });

    it('returns Advanced for levels 25-49', () => {
      expect(getLevelTier(25).name).toBe('Advanced');
      expect(getLevelTier(49).name).toBe('Advanced');
    });

    it('returns Expert for levels 50-74', () => {
      expect(getLevelTier(50).name).toBe('Expert');
      expect(getLevelTier(74).name).toBe('Expert');
    });

    it('returns Master for levels 75-99', () => {
      expect(getLevelTier(75).name).toBe('Master');
      expect(getLevelTier(99).name).toBe('Master');
    });

    it('returns Legendary for level 100+', () => {
      expect(getLevelTier(100).name).toBe('Legendary');
      expect(getLevelTier(999).name).toBe('Legendary');
    });

    it('includes correct color CSS variables', () => {
      expect(getLevelTier(1).color).toBe('var(--level-bronze)');
      expect(getLevelTier(25).color).toBe('var(--level-silver)');
      expect(getLevelTier(50).color).toBe('var(--level-gold)');
      expect(getLevelTier(75).color).toBe('var(--level-platinum)');
      expect(getLevelTier(100).color).toBe('var(--level-diamond)');
    });
  });
});
