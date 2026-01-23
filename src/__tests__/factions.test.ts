import { describe, it, expect } from 'vitest';
import {
  calculateFactionLevel,
  xpForFactionLevel,
  factionLevelProgress,
  totalXpForFactionLevel,
} from '@/lib/data/factions';

describe('Faction Level System', () => {
  describe('xpForFactionLevel', () => {
    it('returns 0 for level 0 or negative', () => {
      expect(xpForFactionLevel(0)).toBe(0);
      expect(xpForFactionLevel(-1)).toBe(0);
    });

    it('uses floor(100 * level^1.5) formula', () => {
      // Level 1: 100 * 1^1.5 = 100
      expect(xpForFactionLevel(1)).toBe(100);

      // Level 2: 100 * 2^1.5 ≈ 282
      expect(xpForFactionLevel(2)).toBe(282);

      // Level 5: 100 * 5^1.5 ≈ 1118
      expect(xpForFactionLevel(5)).toBe(1118);

      // Level 10: 100 * 10^1.5 ≈ 3162
      expect(xpForFactionLevel(10)).toBe(3162);

      // Level 25: 100 * 25^1.5 = 12,500
      expect(xpForFactionLevel(25)).toBe(12500);
    });
  });

  describe('totalXpForFactionLevel', () => {
    it('returns 0 for level 0', () => {
      expect(totalXpForFactionLevel(0)).toBe(0);
    });

    it('returns XP for level 1 only when level is 1', () => {
      expect(totalXpForFactionLevel(1)).toBe(100);
    });

    it('sums XP correctly for multiple levels', () => {
      // Level 3 = xpForLevel(1) + xpForLevel(2) + xpForLevel(3)
      // = 100 + 282 + 519 = 901
      const expected = xpForFactionLevel(1) + xpForFactionLevel(2) + xpForFactionLevel(3);
      expect(totalXpForFactionLevel(3)).toBe(expected);
    });
  });

  describe('calculateFactionLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateFactionLevel(0)).toBe(1);
    });

    it('returns level 1 for negative XP', () => {
      expect(calculateFactionLevel(-100)).toBe(1);
    });

    it('calculates level correctly using iterative formula', () => {
      // Need 100 XP to complete level 1
      // Level 1: 0-99 XP
      expect(calculateFactionLevel(0)).toBe(1);
      expect(calculateFactionLevel(99)).toBe(1);

      // At 100 XP, completed level 1 (100 XP)
      expect(calculateFactionLevel(100)).toBe(1);

      // Level 2 requires 100 + 282 = 382 accumulated XP
      expect(calculateFactionLevel(381)).toBe(1);
      expect(calculateFactionLevel(382)).toBe(2);
      expect(calculateFactionLevel(383)).toBe(2);

      // Level 3 requires 100 + 282 + 519 = 901 accumulated XP
      expect(calculateFactionLevel(900)).toBe(2);
      expect(calculateFactionLevel(901)).toBe(3);
    });

    it('handles high XP values', () => {
      const totalXp = totalXpForFactionLevel(10);
      expect(calculateFactionLevel(totalXp)).toBe(10);
    });

    it('never returns less than 1', () => {
      for (let i = -100; i <= 100; i += 10) {
        expect(calculateFactionLevel(i)).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('factionLevelProgress', () => {
    it('returns 0 for 0 XP', () => {
      expect(factionLevelProgress(0)).toBe(0);
    });

    it('calculates progress correctly within a level', () => {
      // At level 1 (totalXp < 382), threshold is totalXpForFactionLevel(1) = 100
      // So XP in level = totalXp - 100, progress against xpForLevel(2) = 282
      // At 200 totalXp: (200-100) / 282 = 100/282 ≈ 35%
      const progress200 = factionLevelProgress(200);
      expect(progress200).toBeGreaterThan(30);
      expect(progress200).toBeLessThan(40);

      // At level 2 (382+ XP), threshold is totalXpForFactionLevel(2) = 382
      // XP in level = totalXp - 382, progress against xpForLevel(3) = 519
      // At 382 XP: (382-382) / 519 = 0%
      expect(factionLevelProgress(382)).toBe(0);

      // At 640 XP: (640-382) / 519 = 258/519 ≈ 50%
      const progress640 = factionLevelProgress(640);
      expect(progress640).toBeGreaterThan(45);
      expect(progress640).toBeLessThan(55);
    });

    it('caps at 100%', () => {
      // Even if XP calculation is somehow off, never exceed 100%
      const result = factionLevelProgress(10000000);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('never goes below 0', () => {
      expect(factionLevelProgress(-100)).toBe(0);
    });
  });
});

describe('Level Formulas Consistency', () => {
  it('faction levels scale with 1.5 exponent', () => {
    // Each level requires 100 * level^1.5 XP
    // This means higher levels require more than linear but less than quadratic XP
    const level5Xp = xpForFactionLevel(5);
    const level10Xp = xpForFactionLevel(10);

    // Level 10 should require ~2.83x the XP of level 5 (10^1.5 / 5^1.5 ≈ 2.83)
    const ratio = level10Xp / level5Xp;
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.2);
  });

  it('XP requirements grow predictably', () => {
    // Verify first few levels
    expect(xpForFactionLevel(1)).toBe(100);
    expect(xpForFactionLevel(2)).toBe(282);
    // Level 3: floor(100 * 3^1.5) = floor(519.615) = 519
    expect(xpForFactionLevel(3)).toBe(519);
  });

  it('level calculation is consistent with XP requirements', () => {
    // For each level, totalXpForLevel should result in that level
    for (let level = 1; level <= 10; level++) {
      const totalXp = totalXpForFactionLevel(level);
      expect(calculateFactionLevel(totalXp)).toBe(level);
    }
  });
});
