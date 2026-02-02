# Phase 2: Konsequenzen - HP/Death System - Research

**Researched:** 2026-02-02
**Domain:** Gamification HP/Health Systems, Death Mechanics, Database Triggers
**Confidence:** HIGH

## Summary

Phase 2 implements a health point (HP) system that creates real consequences for user behavior in the life-tracking app. Research focused on three critical domains: (1) gamification patterns for HP systems in habit-tracking apps, (2) PostgreSQL trigger architecture for automatic damage/heal events, and (3) fair death penalty design that motivates without frustrating.

**Key findings:**
- HP systems in life-tracking apps show 15-20% improvement in health outcomes and 50% higher retention when implemented correctly (Habitica model)
- Database triggers should be used for automatic HP events (quest completion, streak breaks) while application-level logic handles complex business rules
- Prestige/soft reset systems (like Dead by Daylight) prevent the "what-the-hell effect" where users abandon after losing progress
- Existing codebase already has patterns for XP calculation, streak tracking, and Framer Motion animations that can be adapted for HP system

**Primary recommendation:** Use PostgreSQL AFTER triggers for damage/heal events with application-level orchestration for complex multi-table operations. Implement soft prestige system with bonuses to maintain motivation after death.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 14+ | Database triggers | Native to Supabase, zero-latency event handling |
| Next.js API Routes | 14+ | Orchestration layer | Existing pattern in codebase |
| Framer Motion | Current | HP bar animations | Already used in FactionStatsBar, HabitStreak |
| Supabase RLS | Current | Row-level security | Security for health tables |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | HP bar styling | Existing design system |
| Lucide Icons | Current | Health/warning icons | Existing icon library |
| TypeScript | 5.x | Type safety | All new code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database triggers | Application-only logic | Triggers ensure 100% capture of events, app-only risks missed updates |
| Soft prestige | Hard reset | Hard reset = higher churn, soft prestige maintains motivation |
| Framer Motion | CSS animations | Framer Motion matches existing codebase patterns |

**Installation:**
```bash
# No new dependencies required - all libraries already in use
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/data/
│   └── health.ts              # HP data access layer
├── app/api/
│   └── health/
│       ├── damage/route.ts    # Manual damage endpoint (admin)
│       ├── heal/route.ts      # Manual heal endpoint (admin)
│       ├── status/route.ts    # Get HP status
│       └── prestige/route.ts  # Handle prestige/respawn
├── components/
│   └── health/
│       ├── HealthBar.tsx      # HP bar with animation
│       └── DangerZoneAlert.tsx # Warning UI < 20 HP
supabase/migrations/
└── 20260202_hp_system.sql     # Tables + triggers
```

### Pattern 1: Event-Driven HP Updates via Database Triggers

**What:** PostgreSQL AFTER triggers automatically record HP events when game actions occur (quest completion, habit logging, streak breaks).

**When to use:** For simple, deterministic HP changes that should ALWAYS fire (e.g., quest complete = +10 HP).

**Example:**
```sql
-- Trigger on quest completion
CREATE OR REPLACE FUNCTION handle_quest_completion_hp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only if quest was completed (not failed)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO health_events (user_id, event_type, hp_change, source_table, source_id)
    VALUES (NEW.user_id, 'quest_complete', 15, 'quests', NEW.id);

    -- Update current HP
    UPDATE user_health
    SET current_hp = LEAST(max_hp, current_hp + 15),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_completion_hp_trigger
AFTER UPDATE ON quests
FOR EACH ROW
EXECUTE FUNCTION handle_quest_completion_hp();
```

### Pattern 2: Application-Level Orchestration for Complex Rules

**What:** Use Next.js API routes to handle complex HP logic that requires multi-table reads or business rule evaluation.

**When to use:** For damage calculations with conditions (e.g., inactivity damage only if user hasn't logged in for 3+ days).

**Example:**
```typescript
// src/app/api/health/inactivity-check/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get users with no activity in 3+ days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: inactiveUsers } = await adminClient
    .from('user_faction_stats')
    .select('user_id, last_activity')
    .lt('last_activity', threeDaysAgo.toISOString());

  // Apply damage per inactive user
  for (const user of inactiveUsers) {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24)
    );

    const damage = Math.min(daysSinceActivity * 5, 25); // Max 25 HP damage

    await adminClient.from('health_events').insert({
      user_id: user.user_id,
      event_type: 'inactivity',
      hp_change: -damage,
      metadata: { days_inactive: daysSinceActivity }
    });

    await adminClient.rpc('apply_hp_change', {
      p_user_id: user.user_id,
      p_hp_change: -damage
    });
  }
}
```

### Pattern 3: Animated Health Bar Component

**What:** React component using Framer Motion for smooth HP transitions, matching existing codebase patterns (AttributeBar, HabitStreak).

**When to use:** Dashboard, header, and any page showing user status.

**Example:**
```typescript
// src/components/health/HealthBar.tsx
'use client';

import { motion } from 'framer-motion';
import { Heart, Skull } from 'lucide-react';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
  lives: number;
  maxLives: number;
  showDetails?: boolean;
}

export default function HealthBar({
  currentHp,
  maxHp,
  lives,
  maxLives,
  showDetails = false
}: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const isDanger = percentage < 20;
  const isLow = percentage < 50;

  const barColor = isDanger
    ? 'bg-red-500'
    : isLow
    ? 'bg-yellow-500'
    : 'bg-green-500';

  return (
    <div className="space-y-2">
      {/* HP Bar */}
      <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
        <motion.div
          className={`h-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* HP Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm drop-shadow-md">
            {currentHp} / {maxHp} HP
          </span>
        </div>

        {/* Danger pulse animation */}
        {isDanger && (
          <motion.div
            className="absolute inset-0 bg-red-500 opacity-30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </div>

      {/* Lives */}
      {showDetails && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Leben:</span>
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 ${
                i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Pattern 4: Scheduled Cron Jobs for Periodic Checks

**What:** Use existing instrumentation.ts cron scheduler pattern for daily inactivity checks and HP regeneration.

**When to use:** For time-based HP events (daily inactivity damage, weekly heal bonus).

**Example:**
```typescript
// src/instrumentation.ts (add to existing schedulers)
async function healthInactivityScheduler() {
  const response = await fetch(`${BASE_URL}/api/health/inactivity-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    console.error('Health inactivity check failed');
  }
}

// Run daily at 3 AM
schedule.scheduleJob('0 3 * * *', healthInactivityScheduler);
```

### Anti-Patterns to Avoid

- **Storing HP in user_profiles:** Don't add HP columns to user_profiles - create dedicated user_health table for separation of concerns
- **Hardcoded HP values in triggers:** Use configurable damage/heal amounts stored in health_events for flexibility
- **Missing event logging:** ALWAYS log HP changes to health_events for debugging and analytics
- **Synchronous API calls in triggers:** Never call external APIs from database triggers - performance killer
- **No max HP cap:** Always enforce current_hp <= max_hp constraint to prevent overflow bugs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XP loss calculation | Custom percentage logic | Existing levelFromXp + totalXpForLevel functions | Edge cases like level boundaries already handled |
| Streak break detection | Manual date comparison | Existing habit streak logic in habits API | Already handles timezone, same-day checks |
| HP bar animations | Custom CSS keyframes | Framer Motion (existing pattern) | Matches AttributeBar, HabitStreak components |
| Notification scheduling | Custom timer service | Existing instrumentation.ts cron jobs | Already running 3 schedulers in Phase 1 |
| Death penalty UI flow | Custom modal system | Existing Modal component | Consistent UX with rest of app |

**Key insight:** The codebase already has mature patterns for XP, streaks, animations, and scheduling. HP system should extend these patterns, not reinvent them.

## Common Pitfalls

### Pitfall 1: Race Conditions on HP Updates
**What goes wrong:** Multiple triggers/API calls update HP simultaneously, causing inconsistent state (e.g., user at 10 HP, two -10 damage events fire, both read HP=10, both set HP=0 instead of HP=-10).

**Why it happens:** PostgreSQL AFTER triggers execute after row is written but before transaction commits. Multiple triggers on same table can see stale HP values.

**How to avoid:** Use database-level atomic updates with LEAST/GREATEST functions:
```sql
-- GOOD: Atomic HP update with bounds checking
UPDATE user_health
SET current_hp = LEAST(max_hp, GREATEST(0, current_hp + p_hp_change))
WHERE user_id = p_user_id;

-- BAD: Read then write (race condition)
SELECT current_hp FROM user_health WHERE user_id = p_user_id;
-- ... calculate new HP in application
UPDATE user_health SET current_hp = calculated_value WHERE user_id = p_user_id;
```

**Warning signs:**
- HP goes below 0 or above max_hp in database
- health_events table shows correct changes but user_health.current_hp doesn't match sum
- Users report "HP jumped" or "died unexpectedly"

### Pitfall 2: Trigger Performance on High-Frequency Tables
**What goes wrong:** HP triggers on habit_logs table fire 50+ times per day per active user, causing slow inserts and blocking queries.

**Why it happens:** AFTER triggers add overhead to every INSERT. Complex trigger logic (multiple table reads, calculations) multiplies this cost.

**How to avoid:**
1. Keep trigger logic simple - just INSERT into health_events, don't do complex calculations
2. Use statement-level triggers instead of row-level when possible
3. Offload complex HP calculations to application layer or scheduled jobs

```sql
-- GOOD: Simple trigger, fast execution
CREATE TRIGGER habit_log_hp_trigger
AFTER INSERT ON habit_logs
FOR EACH ROW
EXECUTE FUNCTION log_habit_hp_event(); -- Just logs event, no complex logic

-- BAD: Complex trigger, slow execution
CREATE TRIGGER habit_log_hp_trigger
AFTER INSERT ON habit_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_hp_with_bonuses_and_multipliers(); -- Multiple JOINs, calculations
```

**Warning signs:**
- habit_logs INSERT queries taking >100ms
- Database CPU spikes during peak hours
- Users report "lag" when completing habits

### Pitfall 3: Death During Transaction Rollback
**What goes wrong:** User completes a quest (+15 HP), but transaction fails midway. HP is increased but quest stays incomplete, creating "free HP" exploit.

**Why it happens:** Supabase transactions don't automatically rollback on application errors unless explicitly wrapped in BEGIN/COMMIT.

**How to avoid:** Use RPC functions with explicit transaction control for multi-step operations:
```sql
CREATE OR REPLACE FUNCTION complete_quest_with_hp(
  p_quest_id UUID,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  -- Explicit transaction ensures all-or-nothing
  UPDATE quests SET status = 'completed' WHERE id = p_quest_id;

  INSERT INTO health_events (user_id, event_type, hp_change, source_id)
  VALUES (p_user_id, 'quest_complete', 15, p_quest_id);

  UPDATE user_health
  SET current_hp = LEAST(max_hp, current_hp + 15)
  WHERE user_id = p_user_id;

  -- If any step fails, entire function rolls back
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Quest completion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

**Warning signs:**
- health_events has records for incomplete quests
- current_hp doesn't match sum of health_events.hp_change
- Users report "HP went up but quest stayed incomplete"

### Pitfall 4: Prestige Without User Confirmation
**What goes wrong:** User hits 0 lives, automatic prestige kicks in, they lose 6 months of progress before realizing what happened.

**Why it happens:** Implementing prestige as automatic trigger on lives=0 without UI flow.

**How to avoid:** Prestige MUST be user-initiated with clear explanation:
```typescript
// When lives reach 0, mark user as "awaiting_prestige" state
// Show modal explaining prestige bonuses
// Only apply prestige after user clicks "Accept Prestige"

if (lives === 0 && !user_health.awaiting_prestige) {
  await adminClient
    .from('user_health')
    .update({ awaiting_prestige: true })
    .eq('user_id', userId);

  // Send notification explaining prestige
  await sendPrestigeNotification(userId);
}

// Separate API endpoint requires explicit user action
POST /api/health/prestige
{
  "userId": "...",
  "confirmed": true // User explicitly clicked "Accept"
}
```

**Warning signs:**
- User support requests "I lost all my progress"
- Prestige happening during user is offline/asleep
- No prestige explanation shown before reset

### Pitfall 5: Hardcoded HP Values in Multiple Places
**What goes wrong:** Quest completion gives +15 HP in trigger, +10 HP in API route, +20 HP in documentation. Inconsistencies cause confusion and bugs.

**Why it happens:** HP values copied across migrations, triggers, API code, and frontend without single source of truth.

**How to avoid:** Define HP values as constants in ONE place:
```sql
-- Database: Store HP values in config table
CREATE TABLE hp_config (
  event_type TEXT PRIMARY KEY,
  hp_change INTEGER NOT NULL,
  description TEXT
);

INSERT INTO hp_config VALUES
  ('quest_complete_easy', 10, 'Easy quest completion'),
  ('quest_complete_medium', 15, 'Medium quest completion'),
  ('quest_complete_hard', 25, 'Hard quest completion'),
  ('habit_positive', 5, 'Positive habit completion'),
  ('habit_streak_break', -5, 'Streak broken'),
  ('quest_failed', -10, 'Quest deadline missed');

-- Reference in triggers
CREATE FUNCTION get_hp_value(event TEXT) RETURNS INTEGER AS $$
  SELECT hp_change FROM hp_config WHERE event_type = event;
$$ LANGUAGE SQL;
```

**Warning signs:**
- HP change differs between frontend display and database
- Confusion about "how much HP does X give?"
- Need to update 5+ files when tweaking HP values

## Code Examples

Verified patterns from existing codebase and official sources:

### HP Schema Definition
```sql
-- Source: Supabase PostgreSQL patterns
-- user_health: Single row per user tracking current HP/lives
CREATE TABLE user_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  lives INTEGER NOT NULL DEFAULT 3,
  max_lives INTEGER NOT NULL DEFAULT 3,
  awaiting_prestige BOOLEAN DEFAULT FALSE,
  prestige_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- health_events: Append-only log of all HP changes
CREATE TABLE health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'quest_complete', 'habit_done', 'streak_break', 'inactivity', etc.
  hp_change INTEGER NOT NULL, -- Positive for heal, negative for damage
  source_table TEXT, -- 'quests', 'habits', 'habit_logs', NULL for system events
  source_id UUID, -- ID of the quest/habit/log that caused this event
  metadata JSONB, -- Additional context (e.g., quest difficulty, days inactive)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_health_user ON user_health(user_id);
CREATE INDEX idx_health_events_user ON health_events(user_id);
CREATE INDEX idx_health_events_type ON health_events(event_type);
CREATE INDEX idx_health_events_created ON health_events(created_at DESC);

-- RLS policies
ALTER TABLE user_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health"
  ON user_health FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own health events"
  ON health_events FOR SELECT
  USING (auth.uid() = user_id);
```

### Damage Trigger on Streak Break
```typescript
// Source: Existing habits/relapse/route.ts pattern adapted for HP
// API route: src/app/api/habits/relapse/route.ts (AFTER existing streak reset logic)

// ... existing streak reset code ...

// Apply HP damage for streak break
if (habit.faction_id) {
  const damage = 5; // Configurable based on streak length

  await adminClient.from('health_events').insert({
    user_id: userId,
    event_type: 'streak_break',
    hp_change: -damage,
    source_table: 'habits',
    source_id: habitId,
    metadata: { previous_streak: previousStreak, habit_name: habit.name }
  });

  // Apply damage atomically
  const { error: hpError } = await adminClient.rpc('apply_hp_change', {
    p_user_id: userId,
    p_hp_change: -damage
  });

  if (hpError) {
    console.error('Failed to apply HP damage on streak break:', hpError);
  }
}
```

### Heal Trigger on Quest Completion
```sql
-- Source: PostgreSQL trigger best practices + existing quest completion pattern
-- Migration: Add to 20260202_hp_system.sql

-- RPC function for atomic HP updates
CREATE OR REPLACE FUNCTION apply_hp_change(
  p_user_id UUID,
  p_hp_change INTEGER
) RETURNS void AS $$
DECLARE
  v_current_hp INTEGER;
  v_max_hp INTEGER;
  v_new_hp INTEGER;
  v_lives INTEGER;
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT current_hp, max_hp, lives INTO v_current_hp, v_max_hp, v_lives
  FROM user_health
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Calculate new HP (bounded by 0 and max_hp)
  v_new_hp := LEAST(v_max_hp, GREATEST(0, v_current_hp + p_hp_change));

  -- Check for death (HP dropped to 0)
  IF v_current_hp > 0 AND v_new_hp = 0 THEN
    -- Death occurred - lose a life
    UPDATE user_health
    SET
      current_hp = v_max_hp, -- Respawn at full HP
      lives = GREATEST(0, lives - 1),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log death event
    INSERT INTO health_events (user_id, event_type, hp_change, metadata)
    VALUES (p_user_id, 'death', 0, jsonb_build_object('lives_remaining', GREATEST(0, v_lives - 1)));

  ELSE
    -- Normal HP change
    UPDATE user_health
    SET
      current_hp = v_new_hp,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger on quest completion
CREATE OR REPLACE FUNCTION handle_quest_completion_hp()
RETURNS TRIGGER AS $$
DECLARE
  v_hp_reward INTEGER;
BEGIN
  -- Only trigger on status change to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- HP reward based on difficulty
    v_hp_reward := CASE NEW.difficulty
      WHEN 'easy' THEN 10
      WHEN 'medium' THEN 15
      WHEN 'hard' THEN 25
      WHEN 'epic' THEN 40
      ELSE 15
    END;

    -- Log heal event
    INSERT INTO health_events (user_id, event_type, hp_change, source_table, source_id, metadata)
    VALUES (
      NEW.user_id,
      'quest_complete',
      v_hp_reward,
      'quests',
      NEW.id,
      jsonb_build_object('difficulty', NEW.difficulty, 'title', NEW.title)
    );

    -- Apply HP change
    PERFORM apply_hp_change(NEW.user_id, v_hp_reward);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_completion_hp_trigger
AFTER UPDATE ON quests
FOR EACH ROW
EXECUTE FUNCTION handle_quest_completion_hp();
```

### Data Layer Functions
```typescript
// Source: Existing src/lib/data/factions.ts pattern
// New file: src/lib/data/health.ts

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

export interface UserHealth {
  id: string;
  user_id: string;
  current_hp: number;
  max_hp: number;
  lives: number;
  max_lives: number;
  awaiting_prestige: boolean;
  prestige_level: number;
  created_at: string;
  updated_at: string;
}

export interface HealthEvent {
  id: string;
  user_id: string;
  event_type: string;
  hp_change: number;
  source_table?: string;
  source_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Get user's current health status
 */
export async function getUserHealth(userId?: string): Promise<UserHealth | null> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_health')
    .select('*')
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No health record yet - initialize
      return initUserHealth(resolvedUserId);
    }
    console.error('Error fetching user health:', error);
    throw error;
  }

  return data;
}

/**
 * Initialize health record for new user
 */
export async function initUserHealth(userId?: string): Promise<UserHealth> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_health')
    .insert({
      user_id: resolvedUserId,
      current_hp: 100,
      max_hp: 100,
      lives: 3,
      max_lives: 3,
      prestige_level: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error initializing user health:', error);
    throw error;
  }

  return data;
}

/**
 * Get recent health events (for activity feed)
 */
export async function getHealthEvents(
  userId?: string,
  limit: number = 20
): Promise<HealthEvent[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('health_events')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching health events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate HP percentage (for UI)
 */
export function getHpPercentage(health: UserHealth): number {
  return Math.max(0, Math.min(100, (health.current_hp / health.max_hp) * 100));
}

/**
 * Check if user is in danger zone (< 20 HP)
 */
export function isInDangerZone(health: UserHealth): boolean {
  return getHpPercentage(health) < 20;
}

/**
 * Get HP status level
 */
export function getHpStatus(health: UserHealth): 'flourishing' | 'normal' | 'struggling' | 'danger' {
  const percentage = getHpPercentage(health);

  if (percentage >= 80) return 'flourishing';
  if (percentage >= 50) return 'normal';
  if (percentage >= 20) return 'struggling';
  return 'danger';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Application-only HP tracking | Database triggers + application | 2024-2026 | Supabase/Postgres trigger adoption for real-time apps |
| Harsh permadeath | Soft prestige with bonuses | 2020-2025 | Dead by Daylight prestige rework, Path of Exile XP debt removal |
| CSS-only animations | Framer Motion declarative | 2021-present | React 18+ concurrent rendering optimization |
| Manual cron servers | Edge function schedulers | 2023-2026 | Serverless cron (Vercel, Supabase) mainstream |

**Deprecated/outdated:**
- Manual XP debt tracking (replaced by database-calculated prestige bonuses)
- Hardcoded HP values (replaced by configurable hp_config table)
- localStorage HP caching (replaced by Supabase real-time subscriptions)

## Open Questions

Things that couldn't be fully resolved:

1. **Inactivity Grace Period for Casual Users**
   - What we know: 3+ days inactivity triggers -5 HP/day damage
   - What's unclear: Should premium users or users with "vacation mode" get grace period?
   - Recommendation: Implement "vacation mode" toggle in Phase 3 that pauses HP damage

2. **HP Regeneration Rate Balance**
   - What we know: Quest complete (+15 HP), Habit (+5 HP), Mood (+2 HP)
   - What's unclear: Can users "game" the system by spamming easy habits for HP farming?
   - Recommendation: Add daily HP gain cap (e.g., max 50 HP from habits per day) to prevent abuse

3. **Prestige XP Loss Percentage**
   - What we know: Should be "spürbar aber recoverable" (noticeable but recoverable)
   - What's unclear: Is -10% faction XP enough? Or should it be level-based (higher level = more loss)?
   - Recommendation: Start with flat -10%, track user feedback, iterate in Phase 3

4. **Multi-Device HP Sync Edge Cases**
   - What we know: Supabase real-time handles updates
   - What's unclear: What happens if user completes quest offline, goes to 0 HP offline, then syncs?
   - Recommendation: Handle offline events in order of timestamp on sync, not arrival order

## Sources

### Primary (HIGH confidence)
- Supabase Postgres Triggers Documentation: https://supabase.com/docs/guides/database/postgres/triggers
- PostgreSQL Triggers in 2026 (TheLinuxCode): https://thelinuxcode.com/postgresql-triggers-in-2026-design-performance-and-production-reality/
- CYBERTEC PostgreSQL Trigger Performance: https://www.cybertec-postgresql.com/en/more-on-postgres-trigger-performance/
- Existing codebase patterns: src/lib/data/factions.ts, src/lib/data/habits.ts, src/lib/xp.ts
- Phase 1 implementation: habit streak tracking, XP calculations, cron schedulers

### Secondary (MEDIUM confidence)
- Habitica gamification case study: https://www.openloyalty.io/insider/gamification-healthcare (15-20% health improvement, 50% retention boost)
- Dead by Daylight prestige system: https://deadbydaylight.com/news/prestige-progression/
- Framer Motion React patterns: https://www.hover.dev/ (animation library guide)
- Game death penalty design: https://www.gamedeveloper.com/design/death-and-consequence-in-game-design

### Tertiary (LOW confidence)
- General MMO death penalty discussions (forums, Reddit) - marked for user testing validation
- HP system blog posts without empirical data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in Phase 1, verified via package.json and imports
- Architecture: HIGH - Patterns directly adapted from existing factions.ts, habits.ts, and quest completion flows
- Pitfalls: HIGH - Based on official PostgreSQL docs and existing codebase gotchas (race conditions in XP updates)

**Research date:** 2026-02-02
**Valid until:** 2026-03-15 (6 weeks - stable domain, PostgreSQL triggers change slowly)
