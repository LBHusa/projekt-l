import { describe, it, expect } from 'vitest';
import {
  getDisplayName,
  calculateXpForNextLevel,
  calculateInteractionXp,
  getCategoryFromType,
  RELATIONSHIP_TYPE_META,
  INTERACTION_TYPE_META,
  QUALITY_MULTIPLIER,
} from '@/lib/types/contacts';
import type { Contact, RelationshipType, InteractionType, InteractionQuality } from '@/lib/types/contacts';

describe('Contact Types and Helpers', () => {
  describe('getDisplayName', () => {
    const baseContact: Partial<Contact> = {
      id: '1',
      user_id: '1',
      first_name: 'John',
      last_name: null,
      nickname: null,
    };

    it('returns nickname when available', () => {
      const contact = { ...baseContact, nickname: 'Johnny' } as Contact;
      expect(getDisplayName(contact)).toBe('Johnny');
    });

    it('returns full name when no nickname and last name exists', () => {
      const contact = { ...baseContact, last_name: 'Doe' } as Contact;
      expect(getDisplayName(contact)).toBe('John Doe');
    });

    it('returns first name only when no nickname or last name', () => {
      const contact = baseContact as Contact;
      expect(getDisplayName(contact)).toBe('John');
    });

    it('prefers nickname over full name', () => {
      const contact = {
        ...baseContact,
        last_name: 'Doe',
        nickname: 'JD',
      } as Contact;
      expect(getDisplayName(contact)).toBe('JD');
    });
  });

  describe('calculateXpForNextLevel', () => {
    it('calculates XP correctly using 100 * level^1.5 formula', () => {
      // Level 1: ceil(100 * 1^1.5) = 100
      expect(calculateXpForNextLevel(1)).toBe(100);

      // Level 2: ceil(100 * 2^1.5) = ceil(282.84) = 283
      expect(calculateXpForNextLevel(2)).toBe(283);

      // Level 5: ceil(100 * 5^1.5) = ceil(1118.03) = 1119
      expect(calculateXpForNextLevel(5)).toBe(1119);

      // Level 10: ceil(100 * 10^1.5) = ceil(3162.27) = 3163
      expect(calculateXpForNextLevel(10)).toBe(3163);
    });

    it('always returns a positive integer', () => {
      for (let level = 1; level <= 50; level++) {
        const xp = calculateXpForNextLevel(level);
        expect(xp).toBeGreaterThan(0);
        expect(Number.isInteger(xp)).toBe(true);
      }
    });

    it('XP requirement increases with level', () => {
      let prevXp = 0;
      for (let level = 1; level <= 20; level++) {
        const xp = calculateXpForNextLevel(level);
        expect(xp).toBeGreaterThan(prevXp);
        prevXp = xp;
      }
    });
  });

  describe('calculateInteractionXp', () => {
    it('calculates base XP correctly', () => {
      const xp = calculateInteractionXp('call', 'neutral');
      // call baseXp = 15, neutral multiplier = 1.0
      expect(xp).toBe(15);
    });

    it('applies quality multiplier correctly', () => {
      // Poor quality (0.5x)
      expect(calculateInteractionXp('call', 'poor')).toBe(8); // 15 * 0.5 = 7.5 → 8

      // Good quality (1.5x)
      expect(calculateInteractionXp('call', 'good')).toBe(23); // 15 * 1.5 = 22.5 → 23

      // Great quality (2.0x)
      expect(calculateInteractionXp('call', 'great')).toBe(30); // 15 * 2.0 = 30

      // Exceptional quality (3.0x)
      expect(calculateInteractionXp('call', 'exceptional')).toBe(45); // 15 * 3.0 = 45
    });

    it('applies duration bonus correctly', () => {
      // 30 minutes = 1 + 30/120 = 1.25x
      const xp30min = calculateInteractionXp('meeting', 'neutral', 30);
      expect(xp30min).toBe(50); // 40 * 1.25 = 50

      // 60 minutes = 1 + 60/120 = 1.5x
      const xp60min = calculateInteractionXp('meeting', 'neutral', 60);
      expect(xp60min).toBe(60); // 40 * 1.5 = 60

      // 120 minutes = 1 + 120/120 = 2.0x
      const xp120min = calculateInteractionXp('meeting', 'neutral', 120);
      expect(xp120min).toBe(80); // 40 * 2.0 = 80
    });

    it('caps duration bonus at 2x', () => {
      // 240 minutes should still be capped at 2x
      const xp240min = calculateInteractionXp('meeting', 'neutral', 240);
      expect(xp240min).toBe(80); // 40 * 2.0 = 80 (capped)
    });

    it('combines quality and duration multipliers', () => {
      // 60 minutes (1.5x) + great quality (2.0x) = 3.0x total
      const xp = calculateInteractionXp('meeting', 'great', 60);
      expect(xp).toBe(120); // 40 * 2.0 * 1.5 = 120
    });

    it('works for all interaction types', () => {
      const interactionTypes: InteractionType[] = [
        'call',
        'video_call',
        'message',
        'meeting',
        'activity',
        'event',
        'gift',
        'support',
        'quality_time',
        'other',
      ];

      for (const type of interactionTypes) {
        const xp = calculateInteractionXp(type, 'neutral');
        expect(xp).toBe(INTERACTION_TYPE_META[type].baseXp);
      }
    });
  });

  describe('getCategoryFromType', () => {
    it('returns family for family relationship types', () => {
      const familyTypes: RelationshipType[] = [
        'partner',
        'spouse',
        'child',
        'parent',
        'grandparent',
        'sibling',
        'sibling_in_law',
        'parent_in_law',
        'child_in_law',
        'cousin',
        'aunt_uncle',
        'niece_nephew',
        'step_parent',
        'step_child',
        'step_sibling',
      ];

      for (const type of familyTypes) {
        expect(getCategoryFromType(type)).toBe('family');
      }
    });

    it('returns friend for friend relationship types', () => {
      const friendTypes: RelationshipType[] = ['close_friend', 'friend', 'acquaintance'];

      for (const type of friendTypes) {
        expect(getCategoryFromType(type)).toBe('friend');
      }
    });

    it('returns professional for professional relationship types', () => {
      const professionalTypes: RelationshipType[] = ['colleague', 'mentor', 'mentee'];

      for (const type of professionalTypes) {
        expect(getCategoryFromType(type)).toBe('professional');
      }
    });

    it('returns other for other relationship types', () => {
      const otherTypes: RelationshipType[] = ['neighbor', 'other'];

      for (const type of otherTypes) {
        expect(getCategoryFromType(type)).toBe('other');
      }
    });
  });

  describe('RELATIONSHIP_TYPE_META', () => {
    it('has metadata for all relationship types', () => {
      const allTypes: RelationshipType[] = [
        'partner',
        'spouse',
        'child',
        'parent',
        'grandparent',
        'sibling',
        'sibling_in_law',
        'parent_in_law',
        'child_in_law',
        'cousin',
        'aunt_uncle',
        'niece_nephew',
        'step_parent',
        'step_child',
        'step_sibling',
        'close_friend',
        'friend',
        'acquaintance',
        'colleague',
        'mentor',
        'mentee',
        'neighbor',
        'other',
      ];

      for (const type of allTypes) {
        expect(RELATIONSHIP_TYPE_META[type]).toBeDefined();
        expect(RELATIONSHIP_TYPE_META[type].label).toBeTruthy();
        expect(RELATIONSHIP_TYPE_META[type].labelDe).toBeTruthy();
        expect(RELATIONSHIP_TYPE_META[type].icon).toBeTruthy();
        expect(RELATIONSHIP_TYPE_META[type].category).toBeTruthy();
      }
    });
  });

  describe('INTERACTION_TYPE_META', () => {
    it('has metadata for all interaction types', () => {
      const allTypes: InteractionType[] = [
        'call',
        'video_call',
        'message',
        'meeting',
        'activity',
        'event',
        'gift',
        'support',
        'quality_time',
        'other',
      ];

      for (const type of allTypes) {
        expect(INTERACTION_TYPE_META[type]).toBeDefined();
        expect(INTERACTION_TYPE_META[type].baseXp).toBeGreaterThan(0);
        expect(INTERACTION_TYPE_META[type].label).toBeTruthy();
        expect(INTERACTION_TYPE_META[type].labelDe).toBeTruthy();
        expect(INTERACTION_TYPE_META[type].icon).toBeTruthy();
      }
    });

    it('has reasonable XP values', () => {
      // Message should be lowest
      expect(INTERACTION_TYPE_META['message'].baseXp).toBeLessThan(
        INTERACTION_TYPE_META['call'].baseXp
      );

      // Events should give more XP than messages
      expect(INTERACTION_TYPE_META['event'].baseXp).toBeGreaterThan(
        INTERACTION_TYPE_META['message'].baseXp
      );
    });
  });

  describe('QUALITY_MULTIPLIER', () => {
    it('has correct multiplier values', () => {
      expect(QUALITY_MULTIPLIER.poor).toBe(0.5);
      expect(QUALITY_MULTIPLIER.neutral).toBe(1.0);
      expect(QUALITY_MULTIPLIER.good).toBe(1.5);
      expect(QUALITY_MULTIPLIER.great).toBe(2.0);
      expect(QUALITY_MULTIPLIER.exceptional).toBe(3.0);
    });

    it('multipliers increase with quality', () => {
      const qualities: InteractionQuality[] = ['poor', 'neutral', 'good', 'great', 'exceptional'];
      let prevMultiplier = 0;

      for (const quality of qualities) {
        expect(QUALITY_MULTIPLIER[quality]).toBeGreaterThan(prevMultiplier);
        prevMultiplier = QUALITY_MULTIPLIER[quality];
      }
    });
  });
});
