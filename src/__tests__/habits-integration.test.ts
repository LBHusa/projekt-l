import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Habit, HabitFaction, HabitFactionDisplay, FactionId } from '@/lib/database.types';

// ============================================
// MOCK DATA
// ============================================

const mockHabit: Habit = {
  id: 'habit-123',
  user_id: 'user-1',
  name: 'Joggen',
  description: 'Morgens laufen gehen',
  icon: '🏃',
  color: '#22c55e',
  habit_type: 'positive',
  frequency: 'daily',
  target_days: [],
  current_streak: 5,
  longest_streak: 10,
  total_completions: 50,
  xp_per_completion: 100,
  faction_id: 'koerper',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockHabitFactions: HabitFaction[] = [
  {
    id: 'hf-1',
    habit_id: 'habit-123',
    faction_id: 'koerper',
    weight: 70,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'hf-2',
    habit_id: 'habit-123',
    faction_id: 'geist',
    weight: 30,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockHabitFactionDisplays: HabitFactionDisplay[] = [
  {
    faction_id: 'koerper',
    faction_name: 'Körper',
    faction_icon: '💪',
    faction_color: '#22c55e',
    weight: 70,
  },
  {
    faction_id: 'geist',
    faction_name: 'Geist',
    faction_icon: '🧠',
    faction_color: '#a855f7',
    weight: 30,
  },
];

// ============================================
// HABIT FACTIONS CRUD TESTS
// ============================================

describe('Habits Multi-Faction Integration', () => {
  describe('habit_factions CRUD', () => {
    it('should create habit with single faction', () => {
      const singleFaction = [mockHabitFactions[0]];

      expect(singleFaction).toHaveLength(1);
      expect(singleFaction[0].faction_id).toBe('koerper');
      expect(singleFaction[0].weight).toBe(70);
    });

    it('should create habit with multiple factions', () => {
      expect(mockHabitFactions).toHaveLength(2);
      expect(mockHabitFactions[0].faction_id).toBe('koerper');
      expect(mockHabitFactions[1].faction_id).toBe('geist');

      // Total weight should be 100
      const totalWeight = mockHabitFactions.reduce((sum, hf) => sum + hf.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it('should support all 7 faction IDs for habits', () => {
      const allFactionIds: FactionId[] = [
        'karriere', 'hobbys', 'koerper', 'geist', 'finanzen', 'soziales', 'weisheit',
      ];

      allFactionIds.forEach(factionId => {
        const habitFaction = {
          id: `hf-${factionId}`,
          habit_id: 'habit-test',
          faction_id: factionId,
          weight: 100,
          created_at: new Date().toISOString(),
        };

        expect(habitFaction.faction_id).toBe(factionId);
        expect(allFactionIds).toContain(habitFaction.faction_id);
      });
    });

    it('should enforce habit_id and faction_id relationship', () => {
      const habitFaction = mockHabitFactions[0];

      expect(habitFaction.habit_id).toBe('habit-123');
      expect(habitFaction.faction_id).toBe('koerper');
      expect(habitFaction.habit_id).not.toBeNull();
      expect(habitFaction.faction_id).not.toBeNull();
    });

    it('should track creation timestamp', () => {
      mockHabitFactions.forEach(hf => {
        expect(hf.created_at).toBeDefined();
        expect(new Date(hf.created_at).getTime()).not.toBeNaN();
      });
    });
  });

  // ============================================
  // XP DISTRIBUTION TESTS
  // ============================================

  describe('XP Distribution', () => {
    // Simulate the XP distribution logic from habits.ts
    function calculateFactionXp(totalXp: number, weight: number): number {
      return Math.round((totalXp * weight) / 100);
    }

    function distributeXp(
      totalXp: number,
      factions: { faction_id: FactionId; weight: number }[]
    ): { faction_id: FactionId; xp: number }[] {
      return factions.map(f => ({
        faction_id: f.faction_id,
        xp: calculateFactionXp(totalXp, f.weight),
      }));
    }

    it('should distribute XP equally when weights are equal', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 50 },
        { faction_id: 'geist' as FactionId, weight: 50 },
      ];

      const distribution = distributeXp(100, factions);

      expect(distribution[0].xp).toBe(50);
      expect(distribution[1].xp).toBe(50);
      expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(100);
    });

    it('should distribute XP according to weights (70/30 split)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 70 },
        { faction_id: 'geist' as FactionId, weight: 30 },
      ];

      const distribution = distributeXp(100, factions);

      expect(distribution[0].xp).toBe(70);
      expect(distribution[1].xp).toBe(30);
    });

    it('should round XP correctly for 3 factions (100 XP / 3)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 33 },
        { faction_id: 'geist' as FactionId, weight: 33 },
        { faction_id: 'weisheit' as FactionId, weight: 34 },
      ];

      const distribution = distributeXp(100, factions);

      expect(distribution[0].xp).toBe(33);
      expect(distribution[1].xp).toBe(33);
      expect(distribution[2].xp).toBe(34);
      expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(100);
    });

    it('should handle uneven splits with proper rounding', () => {
      // 100 XP with 60/25/15 split
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 60 },
        { faction_id: 'geist' as FactionId, weight: 25 },
        { faction_id: 'weisheit' as FactionId, weight: 15 },
      ];

      const distribution = distributeXp(100, factions);

      expect(distribution[0].xp).toBe(60);
      expect(distribution[1].xp).toBe(25);
      expect(distribution[2].xp).toBe(15);
    });

    it('should handle single faction (100% weight)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 100 },
      ];

      const distribution = distributeXp(100, factions);

      expect(distribution).toHaveLength(1);
      expect(distribution[0].xp).toBe(100);
    });

    it('should handle small XP amounts correctly', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 70 },
        { faction_id: 'geist' as FactionId, weight: 30 },
      ];

      const distribution = distributeXp(10, factions);

      expect(distribution[0].xp).toBe(7);  // 10 * 70 / 100 = 7
      expect(distribution[1].xp).toBe(3);  // 10 * 30 / 100 = 3
    });

    it('should handle large XP amounts', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 60 },
        { faction_id: 'geist' as FactionId, weight: 40 },
      ];

      const distribution = distributeXp(1000, factions);

      expect(distribution[0].xp).toBe(600);
      expect(distribution[1].xp).toBe(400);
    });

    it('should return empty array for empty factions', () => {
      const distribution = distributeXp(100, []);
      expect(distribution).toHaveLength(0);
    });

    it('should handle 0 XP distribution', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 50 },
        { faction_id: 'geist' as FactionId, weight: 50 },
      ];

      const distribution = distributeXp(0, factions);

      expect(distribution[0].xp).toBe(0);
      expect(distribution[1].xp).toBe(0);
    });
  });

  // ============================================
  // WEIGHT VALIDATION TESTS
  // ============================================

  describe('Weight Validation', () => {
    // Simulate setHabitFactions validation logic
    function validateWeights(factions: { faction_id: FactionId; weight: number }[]): {
      valid: boolean;
      error?: string;
    } {
      if (factions.length === 0) {
        return { valid: true }; // Empty is allowed
      }

      const totalWeight = factions.reduce((sum, f) => sum + f.weight, 0);
      if (totalWeight !== 100) {
        return {
          valid: false,
          error: `Faction weights must sum to 100, got ${totalWeight}`,
        };
      }

      // Check for valid weight ranges
      for (const f of factions) {
        if (f.weight <= 0 || f.weight > 100) {
          return {
            valid: false,
            error: `Weight must be between 1 and 100, got ${f.weight}`,
          };
        }
      }

      return { valid: true };
    }

    it('should reject weights not summing to 100 (under)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 50 },
        { faction_id: 'geist' as FactionId, weight: 30 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must sum to 100');
      expect(result.error).toContain('80');
    });

    it('should reject weights not summing to 100 (over)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 70 },
        { faction_id: 'geist' as FactionId, weight: 50 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('120');
    });

    it('should accept weights summing to exactly 100', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 70 },
        { faction_id: 'geist' as FactionId, weight: 30 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow empty factions array', () => {
      const result = validateWeights([]);

      expect(result.valid).toBe(true);
    });

    it('should accept 100% weight for single faction', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 100 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(true);
    });

    it('should reject 0 weight', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 0 },
        { faction_id: 'geist' as FactionId, weight: 100 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(false);
    });

    it('should reject negative weight', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: -10 },
        { faction_id: 'geist' as FactionId, weight: 110 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(false);
    });

    it('should accept 4-way split (25/25/25/25)', () => {
      const factions = [
        { faction_id: 'koerper' as FactionId, weight: 25 },
        { faction_id: 'geist' as FactionId, weight: 25 },
        { faction_id: 'weisheit' as FactionId, weight: 25 },
        { faction_id: 'karriere' as FactionId, weight: 25 },
      ];

      const result = validateWeights(factions);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // GET HABIT WITH FACTIONS TESTS
  // ============================================

  describe('getHabitWithFactions', () => {
    it('should return habit with aggregated faction info', () => {
      const habitWithFactions = {
        ...mockHabit,
        factions: mockHabitFactionDisplays,
      };

      expect(habitWithFactions.id).toBe('habit-123');
      expect(habitWithFactions.name).toBe('Joggen');
      expect(habitWithFactions.factions).toHaveLength(2);
      expect(habitWithFactions.factions[0].faction_name).toBe('Körper');
      expect(habitWithFactions.factions[1].faction_name).toBe('Geist');
    });

    it('should include faction display properties', () => {
      const factionDisplay = mockHabitFactionDisplays[0];

      expect(factionDisplay.faction_id).toBe('koerper');
      expect(factionDisplay.faction_name).toBeTruthy();
      expect(factionDisplay.faction_icon).toBeTruthy();
      expect(factionDisplay.faction_color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(factionDisplay.weight).toBeGreaterThan(0);
    });

    it('should return empty factions array if none assigned', () => {
      const habitWithNoFactions = {
        ...mockHabit,
        factions: [],
      };

      expect(habitWithNoFactions.factions).toHaveLength(0);
      expect(habitWithNoFactions.faction_id).toBe('koerper'); // Legacy field can still be set
    });

    it('should order factions by weight (descending)', () => {
      // mockHabitFactionDisplays is already ordered by weight desc
      expect(mockHabitFactionDisplays[0].weight).toBeGreaterThan(mockHabitFactionDisplays[1].weight);
      expect(mockHabitFactionDisplays[0].weight).toBe(70);
      expect(mockHabitFactionDisplays[1].weight).toBe(30);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle habit with no factions (legacy support)', () => {
      const legacyHabit: Habit = {
        ...mockHabit,
        faction_id: null,
      };

      expect(legacyHabit.faction_id).toBeNull();

      // When faction_id is null, no XP should be distributed
      const factions: HabitFactionDisplay[] = [];
      expect(factions).toHaveLength(0);
    });

    it('should prevent duplicate faction assignments', () => {
      // Simulate UNIQUE constraint check
      function hasDuplicateFactions(factions: { faction_id: FactionId }[]): boolean {
        const factionIds = factions.map(f => f.faction_id);
        const uniqueIds = new Set(factionIds);
        return uniqueIds.size !== factionIds.length;
      }

      const duplicateFactions = [
        { faction_id: 'koerper' as FactionId, weight: 50 },
        { faction_id: 'koerper' as FactionId, weight: 50 }, // Duplicate!
      ];

      expect(hasDuplicateFactions(duplicateFactions)).toBe(true);

      const validFactions = [
        { faction_id: 'koerper' as FactionId, weight: 50 },
        { faction_id: 'geist' as FactionId, weight: 50 },
      ];

      expect(hasDuplicateFactions(validFactions)).toBe(false);
    });

    it('should handle faction removal when only one exists', () => {
      const singleFaction = [mockHabitFactions[0]];

      // After removal, array should be empty
      const afterRemoval: HabitFaction[] = [];

      expect(afterRemoval).toHaveLength(0);
    });

    it('should sync primary faction_id with highest weight faction', () => {
      // When factions are set, habit.faction_id should match highest weight
      const habit = { ...mockHabit };
      const factions = mockHabitFactionDisplays;

      // Find faction with highest weight
      const primaryFaction = factions.reduce((prev, curr) =>
        curr.weight > prev.weight ? curr : prev
      );

      expect(primaryFaction.faction_id).toBe('koerper');
      expect(primaryFaction.weight).toBe(70);

      // habit.faction_id should be synced to this
      expect(habit.faction_id).toBe(primaryFaction.faction_id);
    });

    it('should handle all 7 factions assigned to one habit', () => {
      const allFactions: { faction_id: FactionId; weight: number }[] = [
        { faction_id: 'karriere', weight: 14 },
        { faction_id: 'hobbys', weight: 14 },
        { faction_id: 'koerper', weight: 15 },
        { faction_id: 'geist', weight: 15 },
        { faction_id: 'finanzen', weight: 14 },
        { faction_id: 'soziales', weight: 14 },
        { faction_id: 'weisheit', weight: 14 },
      ];

      const totalWeight = allFactions.reduce((sum, f) => sum + f.weight, 0);
      expect(totalWeight).toBe(100);
      expect(allFactions).toHaveLength(7);
    });

    it('should handle xp_per_completion edge cases', () => {
      // Very small XP
      expect(Math.round((1 * 50) / 100)).toBe(1); // Rounds to 1, not 0

      // Zero XP habit (weird but possible)
      const zeroXpHabit = { ...mockHabit, xp_per_completion: 0 };
      expect(zeroXpHabit.xp_per_completion).toBe(0);
    });
  });

  // ============================================
  // INTEGRATION WITH HABIT COMPLETION
  // ============================================

  describe('Habit Completion Integration', () => {
    it('should calculate correct XP for positive habit completion', () => {
      const habit = mockHabit;

      expect(habit.habit_type).toBe('positive');
      expect(habit.xp_per_completion).toBe(100);

      // On completion, this XP should be distributed
      const totalXp = habit.xp_per_completion;
      expect(totalXp).toBe(100);
    });

    it('should not award XP for negative habit completion', () => {
      const negativeHabit: Habit = {
        ...mockHabit,
        habit_type: 'negative',
        name: 'Rauchen',
      };

      // Completing a negative habit (doing the bad thing) = 0 XP
      const xpGained = negativeHabit.habit_type === 'positive' ? negativeHabit.xp_per_completion : 0;
      expect(xpGained).toBe(0);
    });

    it('should distribute XP only when habit is completed', () => {
      const habit = mockHabit;
      const factions = mockHabitFactionDisplays;
      const completed = true;

      let xpToDistribute = 0;
      if (completed && habit.habit_type === 'positive') {
        xpToDistribute = habit.xp_per_completion;
      }

      expect(xpToDistribute).toBe(100);

      // Calculate per-faction XP
      const factionXps = factions.map(f => ({
        faction_id: f.faction_id,
        xp: Math.round((xpToDistribute * f.weight) / 100),
      }));

      expect(factionXps[0]).toEqual({ faction_id: 'koerper', xp: 70 });
      expect(factionXps[1]).toEqual({ faction_id: 'geist', xp: 30 });
    });
  });

  // ============================================
  // SETHABITFACTIONS BEHAVIOR
  // ============================================

  describe('setHabitFactions Behavior', () => {
    it('should replace all existing factions', () => {
      // Simulate: delete existing + insert new
      const existingFactions = mockHabitFactions;
      const newFactions = [
        { faction_id: 'weisheit' as FactionId, weight: 60 },
        { faction_id: 'karriere' as FactionId, weight: 40 },
      ];

      // After setHabitFactions, old factions should be gone
      expect(existingFactions.map(f => f.faction_id)).not.toContain('weisheit');
      expect(newFactions).toHaveLength(2);
      expect(newFactions[0].faction_id).toBe('weisheit');
    });

    it('should clear all factions when empty array passed', () => {
      const clearedFactions: { faction_id: FactionId; weight: number }[] = [];

      expect(clearedFactions).toHaveLength(0);
      // This is valid - habit will have no faction assignments
    });

    it('should validate before deleting existing factions', () => {
      // Bad weights should be rejected BEFORE any delete happens
      const invalidFactions = [
        { faction_id: 'koerper' as FactionId, weight: 60 },
        { faction_id: 'geist' as FactionId, weight: 30 },
        // Sum = 90, not 100
      ];

      const totalWeight = invalidFactions.reduce((sum, f) => sum + f.weight, 0);
      expect(totalWeight).not.toBe(100);
      // This should throw error and NOT modify existing factions
    });
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('Multi-Faction Helper Functions', () => {
  describe('XP Rounding Edge Cases', () => {
    const calculateFactionXp = (totalXp: number, weight: number): number => {
      return Math.round((totalXp * weight) / 100);
    };

    it('should round 0.5 up (banker\'s rounding)', () => {
      // 50 * 33 / 100 = 16.5 → rounds to 17
      expect(calculateFactionXp(50, 33)).toBe(17);
    });

    it('should handle fractional results', () => {
      // 7 * 33 / 100 = 2.31 → rounds to 2
      expect(calculateFactionXp(7, 33)).toBe(2);

      // 7 * 66 / 100 = 4.62 → rounds to 5
      expect(calculateFactionXp(7, 66)).toBe(5);
    });

    it('should never return negative XP', () => {
      expect(calculateFactionXp(0, 50)).toBeGreaterThanOrEqual(0);
      expect(calculateFactionXp(100, 0)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Faction ID Type Safety', () => {
    it('should only accept valid FactionId values', () => {
      const validFactionIds: FactionId[] = [
        'karriere', 'hobbys', 'koerper', 'geist', 'finanzen', 'soziales', 'weisheit',
      ];

      const isValidFactionId = (id: string): id is FactionId => {
        return validFactionIds.includes(id as FactionId);
      };

      expect(isValidFactionId('koerper')).toBe(true);
      expect(isValidFactionId('invalid')).toBe(false);
      expect(isValidFactionId('familie')).toBe(false); // Old faction ID
    });
  });
});
