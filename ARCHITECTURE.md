# Projekt L - Two-Tier Architecture

## Übersicht

Das Projekt L Gamification-System verwendet eine **Zwei-Ebenen-Architektur** für XP-Tracking:

1. **Factions** (7 feste Lebensbereiche)
2. **Skill Domains** (10-25 custom Skills/Kategorien)

## Factions (Lebensbereiche)

7 feste Factions bilden die oberste Ebene:

| ID | Name DE | Name EN | Icon | Farbe | Beschreibung |
|----|---------|---------|------|-------|--------------|
| `karriere` | Karriere | Career | 💼 | #3B82F6 | Berufliche Entwicklung |
| `hobbys` | Hobbys | Hobbies | 🎨 | #8B5CF6 | Freizeit und Interessen |
| `koerper` | Körper | Body | 🏃 | #10B981 | Fitness und körperliches Wohlbefinden |
| `geist` | Geist | Mind | 🧠 | #8B5CF6 | Mentale Gesundheit und Achtsamkeit |
| `finanzen` | Finanzen | Finance | 💰 | #14B8A6 | Finanzielle Stabilität |
| `soziales` | Soziales | Social | 👥 | #EC4899 | Familie, Freunde und soziale Kontakte |
| `weisheit` | Weisheit | Wisdom | 📚 | #F59E0B | Bildung und Wissensaufbau |

## Skill Domains

Skill Domains sind custom Kategorien (z.B. "Coding", "Labor", "Design", "Fitness", "Finanzen" etc.).
Jede Domain wird über `skill_domains.faction_key` zu einer Default-Faction gemappt.

## XP-Flow

Der XP-Flow folgt diesem Pfad:

```
Experience (logged)
  ↓
Skill (hierarchisch, 1-5 Ebenen)
  ↓
Domain (custom, mit default faction_key)
  ↓
Faction(s) (via skill_faction_mapping mit weights)
```

### Hybrid-Mapping

Das System unterstützt **Hybrid-Mapping**:

1. **Default-Mapping**: Skills erben das Faction-Mapping von ihrer Domain
2. **Custom-Override**: Skills können custom Mappings haben (auch multi-faction mit Gewichtung)

## Datenbank-Schema

### Neue Tabellen

#### `skill_faction_mapping`

```sql
CREATE TABLE skill_faction_mapping (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES skills(id),
  faction_id TEXT REFERENCES factions(id),
  weight DECIMAL(3,2) DEFAULT 1.0,  -- 0.0-1.0
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Constraint**: Weights pro Skill müssen zu 1.0 summieren (±1% Toleranz)

### Bestehende Tabellen (erweitert)

- `experiences.faction_id` - Optional: Override für manuelle Faction-Auswahl
- `experiences.faction_override` - Boolean Flag
- `skill_domains.faction_key` - Default Faction für Domain

## Funktionen

### 1. XP-Verteilung

```sql
distribute_xp_to_factions(
  p_user_id UUID,
  p_skill_id UUID,
  p_xp_amount INTEGER,
  p_faction_override TEXT DEFAULT NULL
)
```

Verteilt XP automatisch von einem Skill zu den gemappten Factions.
Respektiert `weight`-Werte bei Multi-Faction-Mappings.

### 2. Faction-Mappings abrufen

```sql
get_skill_faction_mappings(p_skill_id UUID)
RETURNS TABLE(
  faction_id TEXT,
  faction_name TEXT,
  faction_icon TEXT,
  weight DECIMAL,
  is_default BOOLEAN
)
```

Zeigt alle Faction-Mappings für einen Skill.

### 3. Custom Mapping setzen

```sql
set_skill_faction_mapping(
  p_skill_id UUID,
  p_faction_id TEXT,
  p_weight DECIMAL DEFAULT 1.0
)
```

Erstellt/updated custom Faction-Mapping für einen Skill.

**Beispiele**:

```sql
-- Single-Faction (100%)
SELECT set_skill_faction_mapping('skill-uuid', 'karriere', 1.0);

-- Multi-Faction (split)
SELECT set_skill_faction_mapping('skill-uuid', 'karriere', 0.7);
SELECT set_skill_faction_mapping('skill-uuid', 'hobbys', 0.3);
```

## Automatische XP-Verteilung

Ein Trigger (`experience_xp_distribution`) läuft automatisch bei jedem Experience-Insert:

```sql
INSERT INTO experiences (user_id, skill_id, description, xp_gained)
VALUES ('user-uuid', 'skill-uuid', 'Task completed', 100);
-- → XP wird automatisch an Factions verteilt
```

Mit Faction-Override:

```sql
INSERT INTO experiences (user_id, skill_id, description, xp_gained, faction_id)
VALUES ('user-uuid', 'skill-uuid', 'Special task', 100, 'karriere');
-- → XP geht NUR an 'karriere', ignoriert Mappings
```

## Implementierung

### Migration

Die Architektur wurde in `20260109_001_two_tier_architecture.sql` implementiert.

**Features**:
- ✅ `skill_faction_mapping` Tabelle
- ✅ Default-Mappings aus `skill_domains.faction_key`
- ✅ Automatische XP-Verteilung via Trigger
- ✅ Weight-Validierung (Constraint Trigger)
- ✅ Helper-Funktionen für UI/API

### TypeScript Integration

Neue Types wurden generiert (`database.types.ts`):

```typescript
import { Tables, TablesInsert } from '@/lib/database.types'

type SkillFactionMapping = Tables<'skill_faction_mapping'>
type FactionMapping = {
  faction_id: string
  faction_name: string
  faction_icon: string
  weight: number
  is_default: boolean
}
```

## Use Cases

### UC1: Experience loggen (Standard)

```typescript
// Experience wird geloggt
const { data, error } = await supabase
  .from('experiences')
  .insert({
    user_id: userId,
    skill_id: skillId,
    description: 'Completed coding task',
    xp_gained: 100,
  })

// → XP wird automatisch an Factions verteilt basierend auf skill_faction_mapping
```

### UC2: Experience mit Faction-Override

```typescript
// User wählt manuell eine Faction
const { data, error } = await supabase
  .from('experiences')
  .insert({
    user_id: userId,
    skill_id: skillId,
    description: 'Career milestone',
    xp_gained: 200,
    faction_id: 'karriere',  // Override
  })

// → XP geht NUR an 'karriere'
```

### UC3: Custom Skill-Mapping ändern

```typescript
// Ändere Mapping für einen Skill (70% Karriere, 30% Hobbys)
await supabase.rpc('set_skill_faction_mapping', {
  p_skill_id: skillId,
  p_faction_id: 'karriere',
  p_weight: 0.7
})

await supabase.rpc('set_skill_faction_mapping', {
  p_skill_id: skillId,
  p_faction_id: 'hobbys',
  p_weight: 0.3
})
```

### UC4: Faction-Mappings anzeigen

```typescript
// Zeige alle Mappings für einen Skill
const { data, error } = await supabase.rpc('get_skill_faction_mappings', {
  p_skill_id: skillId
})

// data = [
//   { faction_id: 'karriere', faction_name: 'Karriere', weight: 0.7, is_default: false },
//   { faction_id: 'hobbys', faction_name: 'Hobbys', weight: 0.3, is_default: false }
// ]
```

## Testing

### Manual Testing

```sql
-- 1. Check default mappings
SELECT s.name AS skill, f.name_de AS faction, sfm.weight, sfm.is_default
FROM skill_faction_mapping sfm
JOIN skills s ON sfm.skill_id = s.id
JOIN factions f ON sfm.faction_id = f.id
ORDER BY s.name;

-- 2. Test XP distribution
INSERT INTO experiences (user_id, skill_id, description, xp_gained)
VALUES ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Test XP', 100);

-- 3. Check faction XP
SELECT f.name_de, ufs.total_xp, ufs.level
FROM user_faction_stats ufs
JOIN factions f ON ufs.faction_id = f.id
WHERE ufs.user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY f.display_order;

-- 4. Test custom mapping
SELECT set_skill_faction_mapping(
  'c1000000-0000-0000-0000-000000000001'::uuid,
  'karriere',
  0.6
);

SELECT set_skill_faction_mapping(
  'c1000000-0000-0000-0000-000000000001'::uuid,
  'hobbys',
  0.4
);

-- 5. Verify weights sum to 1.0
SELECT
  s.name,
  SUM(sfm.weight) as total_weight
FROM skill_faction_mapping sfm
JOIN skills s ON sfm.skill_id = s.id
GROUP BY s.id, s.name
HAVING SUM(sfm.weight) < 0.99 OR SUM(sfm.weight) > 1.01;
```

## Next Steps

- [ ] UI für Skill-Faction-Mapping Editor
- [ ] Analytics Dashboard für Faction-Balance
- [ ] API-Endpoints für Mapping-Management
- [ ] E2E Tests mit Playwright
- [ ] Dokumentation für Frontend-Team

## Changelog

### 2026-01-09 - Initial Implementation
- Implemented two-tier architecture (Factions + Domains)
- Created `skill_faction_mapping` table
- Added hybrid-mapping support (default + custom)
- Implemented automatic XP distribution via trigger
- Added helper functions for UI integration
- Populated default mappings from existing `skill_domains.faction_key`
- Added weight validation constraint

---

**Status**: ✅ Database Migration Complete | 🔄 UI Integration Pending
