-- Fix: Add +1 to faction level calculation to match frontend formula
-- Bug 12: DB function was missing +1 compared to frontend
-- Frontend: Math.floor(Math.sqrt(totalXp / 100)) + 1
-- DB before: FLOOR(SQRT(xp / 100))
-- DB after: FLOOR(SQRT(xp / 100)) + 1

CREATE OR REPLACE FUNCTION calculate_faction_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF xp <= 0 THEN
    RETURN 1;
  END IF;
  RETURN GREATEST(1, FLOOR(SQRT(xp::float / 100)) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_faction_level(INTEGER) IS 'Calculate faction level from XP. Formula: floor(sqrt(xp/100)) + 1, minimum level 1';
