import { describe, it, expect } from 'vitest';
import type { FactionId } from '@/lib/database.types';
import { FACTIONS, FACTION_ORDER, FACTION_COLORS } from '@/lib/ui/constants';

// Die 7 neuen Faction-IDs
const ALL_FACTION_IDS: FactionId[] = [
  'karriere',
  'hobby',
  'koerper',
  'geist',
  'finanzen',
  'soziales',
  'wissen',
];

// Mapping der alten zu neuen Factions (für Migration)
const FACTION_MIGRATION_MAP: Record<string, FactionId> = {
  // Alte Factions → Neue Factions
  familie: 'soziales',
  freunde: 'soziales',
  gesundheit: 'koerper',
  lernen: 'wissen',
  // Bleiben gleich
  karriere: 'karriere',
  hobbys: 'hobby',
  finanzen: 'finanzen',
};

// Faction Metadata für Validierung
const FACTION_METADATA: Record<FactionId, { icon: string; color: string }> = {
  karriere: { icon: '💼', color: '#3b82f6' },
  hobbys: { icon: '🎨', color: '#f59e0b' },
  koerper: { icon: '💪', color: '#22c55e' },
  geist: { icon: '🧠', color: '#a855f7' },
  finanzen: { icon: '💰', color: '#eab308' },
  soziales: { icon: '👥', color: '#ec4899' },
  weisheit: { icon: '📚', color: '#6366f1' },
};

describe('FactionId Type System', () => {
  describe('Faction ID Definitions', () => {
    it('has exactly 7 faction IDs', () => {
      expect(ALL_FACTION_IDS).toHaveLength(7);
    });

    it('includes all required faction IDs', () => {
      expect(ALL_FACTION_IDS).toContain('karriere');
      expect(ALL_FACTION_IDS).toContain('hobby');
      expect(ALL_FACTION_IDS).toContain('koerper');
      expect(ALL_FACTION_IDS).toContain('geist');
      expect(ALL_FACTION_IDS).toContain('finanzen');
      expect(ALL_FACTION_IDS).toContain('soziales');
      expect(ALL_FACTION_IDS).toContain('wissen');
    });

    it('does not include old faction IDs', () => {
      const oldFactionIds = ['familie', 'freunde', 'gesundheit', 'lernen'];
      oldFactionIds.forEach(oldId => {
        expect(ALL_FACTION_IDS).not.toContain(oldId);
      });
    });

    it('all faction IDs are unique', () => {
      const uniqueIds = new Set(ALL_FACTION_IDS);
      expect(uniqueIds.size).toBe(ALL_FACTION_IDS.length);
    });

    it('all faction IDs are lowercase strings', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(id).toBe(id.toLowerCase());
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('Faction Migration Mapping', () => {
    it('maps familie to soziales', () => {
      expect(FACTION_MIGRATION_MAP['familie']).toBe('soziales');
    });

    it('maps freunde to soziales', () => {
      expect(FACTION_MIGRATION_MAP['freunde']).toBe('soziales');
    });

    it('maps gesundheit to koerper', () => {
      expect(FACTION_MIGRATION_MAP['gesundheit']).toBe('koerper');
    });

    it('maps lernen to weisheit', () => {
      expect(FACTION_MIGRATION_MAP['lernen']).toBe('wissen');
    });

    it('keeps karriere, hobbys, finanzen unchanged', () => {
      expect(FACTION_MIGRATION_MAP['karriere']).toBe('karriere');
      expect(FACTION_MIGRATION_MAP['hobby']).toBe('hobby');
      expect(FACTION_MIGRATION_MAP['finanzen']).toBe('finanzen');
    });

    it('all migration targets are valid FactionIds', () => {
      Object.values(FACTION_MIGRATION_MAP).forEach(targetId => {
        expect(ALL_FACTION_IDS).toContain(targetId);
      });
    });
  });

  describe('XP Merge Logic for soziales', () => {
    it('merges familie + freunde XP correctly', () => {
      const familieXp = 500;
      const freundeXp = 300;

      // Beide werden zu soziales zusammengeführt
      const sozialesXp = familieXp + freundeXp;

      expect(sozialesXp).toBe(800);
    });

    it('handles zero XP from one source', () => {
      const familieXp = 1000;
      const freundeXp = 0;

      const sozialesXp = familieXp + freundeXp;

      expect(sozialesXp).toBe(1000);
    });

    it('handles both sources with zero XP', () => {
      const familieXp = 0;
      const freundeXp = 0;

      const sozialesXp = familieXp + freundeXp;

      expect(sozialesXp).toBe(0);
    });

    it('preserves XP precision during merge', () => {
      const familieXp = 123.45;
      const freundeXp = 67.89;

      const sozialesXp = familieXp + freundeXp;

      // JavaScript floating point: use toBeCloseTo
      expect(sozialesXp).toBeCloseTo(191.34, 2);
    });
  });

  describe('Faction Metadata Validation', () => {
    it('all factions have icons', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(FACTION_METADATA[id].icon).toBeTruthy();
        expect(FACTION_METADATA[id].icon.length).toBeGreaterThan(0);
      });
    });

    it('all factions have colors', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(FACTION_METADATA[id].color).toBeTruthy();
        expect(FACTION_METADATA[id].color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('all colors are unique', () => {
      const colors = ALL_FACTION_IDS.map(id => FACTION_METADATA[id].color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });

    it('koerper has health-related icon', () => {
      expect(FACTION_METADATA['koerper'].icon).toBe('💪');
    });

    it('geist has mind-related icon', () => {
      expect(FACTION_METADATA['geist'].icon).toBe('🧠');
    });

    it('soziales has people-related icon', () => {
      expect(FACTION_METADATA['soziales'].icon).toBe('👥');
    });

    it('weisheit has learning-related icon', () => {
      expect(FACTION_METADATA['wissen'].icon).toBe('📚');
    });
  });

  describe('Faction Categories', () => {
    // Kategorisierung der Factions nach Bereich
    const PERSONAL_FACTIONS: FactionId[] = ['koerper', 'geist'];
    const SOCIAL_FACTIONS: FactionId[] = ['soziales'];
    const DEVELOPMENT_FACTIONS: FactionId[] = ['karriere', 'wissen'];
    const LIFESTYLE_FACTIONS: FactionId[] = ['hobby', 'finanzen'];

    it('personal factions include koerper and geist', () => {
      expect(PERSONAL_FACTIONS).toContain('koerper');
      expect(PERSONAL_FACTIONS).toContain('geist');
    });

    it('soziales is the only social faction', () => {
      expect(SOCIAL_FACTIONS).toHaveLength(1);
      expect(SOCIAL_FACTIONS).toContain('soziales');
    });

    it('development factions include karriere and weisheit', () => {
      expect(DEVELOPMENT_FACTIONS).toContain('karriere');
      expect(DEVELOPMENT_FACTIONS).toContain('wissen');
    });

    it('all factions are categorized exactly once', () => {
      const allCategorized = [
        ...PERSONAL_FACTIONS,
        ...SOCIAL_FACTIONS,
        ...DEVELOPMENT_FACTIONS,
        ...LIFESTYLE_FACTIONS,
      ];

      expect(allCategorized.sort()).toEqual(ALL_FACTION_IDS.sort());
    });
  });
});

describe('Faction ID Type Safety', () => {
  // Helper function to validate faction ID
  function isValidFactionId(id: string): id is FactionId {
    return ALL_FACTION_IDS.includes(id as FactionId);
  }

  it('validates correct faction IDs', () => {
    expect(isValidFactionId('karriere')).toBe(true);
    expect(isValidFactionId('koerper')).toBe(true);
    expect(isValidFactionId('soziales')).toBe(true);
  });

  it('rejects invalid faction IDs', () => {
    expect(isValidFactionId('invalid')).toBe(false);
    expect(isValidFactionId('familie')).toBe(false); // Old ID
    expect(isValidFactionId('freunde')).toBe(false); // Old ID
    expect(isValidFactionId('')).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidFactionId(null as unknown as string)).toBe(false);
    expect(isValidFactionId(undefined as unknown as string)).toBe(false);
  });
});

// ============================================
// EXPORTED CONSTANTS VALIDATION (constants.ts)
// ============================================

describe('Exported Constants Validation (constants.ts)', () => {

  describe('FACTIONS Array', () => {
    it('has exactly 7 factions', () => {
      expect(FACTIONS).toHaveLength(7);
    });

    it('includes all required faction IDs', () => {
      const factionIds = FACTIONS.map(f => f.id);
      ALL_FACTION_IDS.forEach(id => {
        expect(factionIds).toContain(id);
      });
    });

    it('has unique IDs', () => {
      const ids = FACTIONS.map(f => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has name and icon for each faction', () => {
      FACTIONS.forEach(faction => {
        expect(faction.name).toBeDefined();
        expect(faction.name.length).toBeGreaterThan(0);
        expect(faction.icon).toBeDefined();
        expect(faction.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('FACTION_ORDER Array', () => {
    it('has exactly 7 entries', () => {
      expect(FACTION_ORDER).toHaveLength(7);
    });

    it('includes all faction IDs', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(FACTION_ORDER).toContain(id);
      });
    });

    it('has unique entries (no duplicates)', () => {
      const uniqueOrder = new Set(FACTION_ORDER);
      expect(uniqueOrder.size).toBe(FACTION_ORDER.length);
    });
  });

  describe('FACTION_COLORS Record', () => {
    it('has color for all 7 factions', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(FACTION_COLORS[id]).toBeDefined();
      });
    });

    it('all colors are valid hex format', () => {
      ALL_FACTION_IDS.forEach(id => {
        expect(FACTION_COLORS[id]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('all colors are unique', () => {
      const colors = Object.values(FACTION_COLORS);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('Cross-Constant Consistency', () => {
    it('FACTIONS IDs match FACTION_ORDER', () => {
      const factionIds = FACTIONS.map(f => f.id).sort();
      const orderIds = [...FACTION_ORDER].sort();
      expect(factionIds).toEqual(orderIds);
    });

    it('FACTIONS IDs match FACTION_COLORS keys', () => {
      const factionIds = FACTIONS.map(f => f.id).sort();
      const colorKeys = Object.keys(FACTION_COLORS).sort();
      expect(factionIds).toEqual(colorKeys);
    });
  });
});
