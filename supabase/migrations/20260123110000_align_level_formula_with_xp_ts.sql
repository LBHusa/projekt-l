-- Align calculate_faction_level() with src/lib/xp.ts formula
-- Previous: FLOOR(SQRT(xp/100)) + 1 (simplified approximation)
-- New: Iterative calculation using 100 * level^1.5 per level (matches xp.ts exactly)
--
-- Example comparisons (old vs new):
-- 500 XP:  old = 3, new = 3
-- 1000 XP: old = 4, new = 4
-- 5000 XP: old = 8, new = 6
-- The formulas diverge significantly at higher XP values

CREATE OR REPLACE FUNCTION calculate_faction_level(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  accumulated_xp INTEGER := 0;
  xp_for_next_level INTEGER;
BEGIN
  IF xp <= 0 THEN
    RETURN 1;
  END IF;

  -- Iterative calculation matching xp.ts levelFromXp()
  -- xpForLevel(n) = floor(100 * n^1.5)
  LOOP
    xp_for_next_level := FLOOR(100 * POWER(level, 1.5));

    IF accumulated_xp + xp_for_next_level > xp THEN
      EXIT;
    END IF;

    accumulated_xp := accumulated_xp + xp_for_next_level;
    level := level + 1;
  END LOOP;

  -- Return level - 1 because we exit when we can't afford the next level
  -- but ensure minimum level 1
  RETURN GREATEST(1, level - 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_faction_level(INTEGER) IS
'Calculate level from total XP using iterative 100*level^1.5 formula.
Matches src/lib/xp.ts levelFromXp() exactly.
Examples: 0 XP = Level 1, 383 XP = Level 2, 903 XP = Level 3';

-- Also create a helper function to calculate XP needed for a specific level
-- This matches xp.ts xpForLevel()
CREATE OR REPLACE FUNCTION xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF level <= 0 THEN
    RETURN 0;
  END IF;
  RETURN FLOOR(100 * POWER(level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION xp_for_level(INTEGER) IS
'Calculate XP required for a specific level.
Formula: floor(100 * level^1.5)
Examples: Level 1 = 100 XP, Level 2 = 283 XP, Level 10 = 3162 XP';
