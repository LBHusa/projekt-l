# Supabase Migrations - Projekt L

## Migration: 20260109_001_two_tier_architecture.sql

### Summary

Implements the Two-Tier Architecture for XP distribution: Factions (7 fixed) + Skill Domains (custom).

### Changes

#### 1. New Table: `skill_faction_mapping`

Maps skills to one or multiple factions with weight distribution.

**Columns**:
- `skill_id` - FK to skills
- `faction_id` - FK to factions
- `weight` - Percentage of XP (0.0-1.0)
- `is_default` - TRUE if inherited from domain, FALSE if custom override

**Constraint**: Weights per skill must sum to 1.0 (±1% tolerance)

#### 2. New Functions

##### `distribute_xp_to_factions(user_id, skill_id, xp_amount, faction_override?)`

Distributes XP from a skill to its mapped factions.
- Respects weight distribution for multi-faction skills
- Supports faction_override for manual selection

##### `get_skill_faction_mappings(skill_id)`

Returns all faction mappings for a skill with details (name, icon, weight, is_default).

##### `set_skill_faction_mapping(skill_id, faction_id, weight?)`

Creates or updates a custom faction mapping for a skill.
- If weight = 1.0: Replaces all existing mappings (single-faction)
- Otherwise: Adds/updates one mapping (multi-faction)

#### 3. New Trigger: `experience_xp_distribution`

Automatically runs `distribute_xp_to_factions()` after each experience insert.

### Data Migration

Populates `skill_faction_mapping` with default mappings from `skill_domains.faction_key`.

### Testing

See ARCHITECTURE.md for manual test queries.

### Rollback

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS experience_xp_distribution ON experiences;

-- Drop functions
DROP FUNCTION IF EXISTS distribute_xp_to_factions;
DROP FUNCTION IF EXISTS get_skill_faction_mappings;
DROP FUNCTION IF EXISTS set_skill_faction_mapping;
DROP FUNCTION IF EXISTS validate_skill_faction_weights;
DROP FUNCTION IF EXISTS auto_distribute_experience_xp;

-- Drop table
DROP TABLE IF EXISTS skill_faction_mapping;
```

### Dependencies

- Requires: `20241230_001_factions.sql` (factions table)
- Requires: `20241226_001_initial_schema.sql` (skills, skill_domains, experiences)

### Next Steps

1. Regenerate TypeScript types: `supabase gen types typescript --local`
2. Update frontend to use new mapping functions
3. Create UI for skill-faction mapping editor
4. Add E2E tests for XP distribution
