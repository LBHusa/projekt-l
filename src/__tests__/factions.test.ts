import { describe, it, expect } from 'vitest';
import {
  calculateFactionLevel,
  xpForFactionLevel,
  factionLevelProgress,
} from '@/lib/data/factions';

describe('Faction Level System', () => {
  describe('calculateFactionLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateFactionLevel(0)).toBe(1);
    });

    it('returns level 1 for negative XP', () => {
      expect(calculateFactionLevel(-100)).toBe(1);
    });

    it('uses floor(sqrt(xp/100)) formula correctly', () => {
      // Level 1: 0-99 XP (sqrt(99/100) = 0.99 → floor = 0 → max(1,0) = 1)
      expect(calculateFactionLevel(0)).toBe(1);
      expect(calculateFactionLevel(99)).toBe(1);

      // Level 1: 100 XP (sqrt(100/100) = 1 → floor = 1)
      expect(calculateFactionLevel(100)).toBe(1);

      // Level 2: 400 XP (sqrt(400/100) = 2 → floor = 2)
      expect(calculateFactionLevel(400)).toBe(2);

      // Level 3: 900 XP (sqrt(900/100) = 3 → floor = 3)
      expect(calculateFactionLevel(900)).toBe(3);

      // Level 5: 2,500 XP (sqrt(2500/100) = 5 → floor = 5)
      expect(calculateFactionLevel(2500)).toBe(5);

      // Level 10: 10,000 XP (sqrt(10000/100) = 10 → floor = 10)
      expect(calculateFactionLevel(10000)).toBe(10);

      // Level 50: 250,000 XP
      expect(calculateFactionLevel(250000)).toBe(50);
    });

    it('handles boundary cases correctly', () => {
      // Just below level 2 threshold (399 XP)
      expect(calculateFactionLevel(399)).toBe(1);

      // Exactly at level 2 threshold (400 XP)
      expect(calculateFactionLevel(400)).toBe(2);

      // Just above level 2 threshold
      expect(calculateFactionLevel(401)).toBe(2);
    });

    it('never returns less than 1', () => {
      for (let i = -100; i <= 100; i += 10) {
        expect(calculateFactionLevel(i)).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('xpForFactionLevel', () => {
    it('uses level^2 * 100 formula', () => {
      // Level 1: 1^2 * 100 = 100
      expect(xpForFactionLevel(1)).toBe(100);

      // Level 2: 2^2 * 100 = 400
      expect(xpForFactionLevel(2)).toBe(400);

      // Level 5: 5^2 * 100 = 2,500
      expect(xpForFactionLevel(5)).toBe(2500);

      // Level 10: 10^2 * 100 = 10,000
      expect(xpForFactionLevel(10)).toBe(10000);

      // Level 50: 50^2 * 100 = 250,000
      expect(xpForFactionLevel(50)).toBe(250000);
    });

    it('is inverse of calculateFactionLevel', () => {
      for (let level = 1; level <= 20; level++) {
        const xp = xpForFactionLevel(level);
        expect(calculateFactionLevel(xp)).toBe(level);
      }
    });
  });

  describe('factionLevelProgress', () => {
    it('returns 0 for exactly at level threshold', () => {
      // At exactly 400 XP (level 2 threshold), progress should be 0%
      expect(factionLevelProgress(400)).toBe(0);
    });

    it('calculates progress correctly within a level', () => {
      // Level 2 starts at 400 XP, level 3 at 900 XP
      // So 500 XP needed for level 3, range is 400-900

      // At 550 XP: (550-400) / (900-400) = 150/500 = 30%
      expect(factionLevelProgress(550)).toBe(30);

      // At 650 XP: (650-400) / (900-400) = 250/500 = 50%
      expect(factionLevelProgress(650)).toBe(50);

      // At 850 XP: (850-400) / (900-400) = 450/500 = 90%
      expect(factionLevelProgress(850)).toBe(90);
    });

    it('caps at 100%', () => {
      // Even if XP calculation is somehow off, never exceed 100%
      const result = factionLevelProgress(10000000);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('handles level 1 correctly', () => {
      // Level 1: 0-399 XP, Level 2 at 400 XP
      // XP needed: 400 - 100 = 300 (from threshold to next)
      // Actually: Level 1 threshold is 100, Level 2 is 400
      // So at 200 XP: (200-100) / (400-100) = 100/300 ≈ 33%
      const progress = factionLevelProgress(200);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });
  });
});

describe('Level Formulas Consistency', () => {
  it('faction levels scale quadratically', () => {
    // Each level requires level^2 * 100 XP
    // This means higher levels require exponentially more XP
    const level5Xp = xpForFactionLevel(5);
    const level10Xp = xpForFactionLevel(10);

    // Level 10 should require 4x the XP of level 5 (10^2 / 5^2 = 4)
    expect(level10Xp / level5Xp).toBe(4);
  });

  it('XP requirements grow predictably', () => {
    const xpRequirements = [];
    for (let level = 1; level <= 10; level++) {
      xpRequirements.push(xpForFactionLevel(level));
    }

    // Each should be level^2 * 100
    expect(xpRequirements).toEqual([100, 400, 900, 1600, 2500, 3600, 4900, 6400, 8100, 10000]);
  });
});
