# Phase 1: Fairness & Proaktivitaet - Research

**Researched:** 2026-02-01
**Domain:** Notification Systems, Streak Management, Health Integration
**Confidence:** HIGH

## Summary

This research covers the implementation requirements for Phase 1: Fairness & Proaktivitaet, which includes four major features:
1. Streak Insurance Token System
2. Proaktive Lebensbereich-Erinnerungen (Proactive Life-Domain Reminders)
3. Health Import -> Habit Auto-Complete
4. Quest-Expiration Notifications

The existing codebase provides a solid foundation with working Web Push notifications, Telegram bot integration, a cron scheduler infrastructure (node-cron via instrumentation.ts), and comprehensive habit/quest systems. The main work involves extending these systems rather than building from scratch.

**Primary recommendation:** Leverage the existing `reminder-scheduler.ts` pattern for all new cron jobs. Use Supabase for streak tokens and extend the health import webhook for habit auto-complete.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `web-push` | Latest | Push notifications | Already configured with VAPID |
| `node-cron` | ^3.0.3 | Scheduled jobs | Already in use via instrumentation.ts |
| `@supabase/supabase-js` | ^2.x | Database/Auth | Project standard |
| Next.js 14 | 14.x | App Router API routes | Project standard |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Telegram Bot API | N/A (direct fetch) | One-way notifications | Alternative channel |

### No New Dependencies Required
All Phase 1 features can be implemented using existing infrastructure.

## Architecture Patterns

### Existing Cron Infrastructure

The project uses Next.js `instrumentation.ts` to initialize cron jobs on server start:

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initReminderScheduler } = await import('./lib/cron/reminder-scheduler');
    initReminderScheduler();
  }
}
```

**Pattern for new cron jobs:**
1. Create scheduler in `src/lib/cron/{name}-scheduler.ts`
2. Export `init{Name}Scheduler()` function
3. Import and call in `instrumentation.ts`

### Notification Delivery Pattern

The existing system follows this pattern:
```
1. Cron job triggers at scheduled time
2. Query users who need notification (with timezone awareness)
3. Check quiet_hours (22:00 - 08:00 default)
4. Check duplicate prevention (2-minute window)
5. Send via channel (Web Push or Telegram)
6. Log to notification_log or reminder_delivery_log
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── cron/
│   │   ├── reminder-scheduler.ts      # EXISTS - habit reminders
│   │   ├── proactive-scheduler.ts     # NEW - domain balance reminders
│   │   ├── quest-expiry-scheduler.ts  # NEW - quest expiration
│   │   └── streak-check-scheduler.ts  # NEW - daily streak validation
│   ├── data/
│   │   ├── habits.ts                  # EXISTS - extend for streak tokens
│   │   ├── streak-insurance.ts        # NEW - token CRUD
│   │   └── health-import.ts           # EXISTS - extend for habit matching
│   └── types/
│       └── notifications.ts           # EXISTS - extend if needed
├── app/api/
│   ├── streak-insurance/
│   │   ├── tokens/route.ts            # NEW - GET/POST tokens
│   │   └── use/route.ts               # NEW - POST use token
│   └── integrations/
│       └── health-import/
│           └── webhook/route.ts       # EXISTS - extend for habit auto-complete
└── components/
    └── streaks/
        └── StreakInsuranceCard.tsx    # NEW - UI for tokens
```

## Existing Infrastructure Analysis

### 1. Habit System (HIGH confidence)

**Tables:**
- `habits` - Main habit table with `current_streak`, `longest_streak`, `streak_start_date`
- `habit_logs` - Completion logs with `logged_at` timestamp
- `habit_reminders` - Per-habit reminder schedules
- `reminder_delivery_log` - Audit trail

**Key Fields on `habits`:**
```sql
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
streak_start_date DATE NULL        -- For negative habits "days clean"
xp_per_completion INTEGER DEFAULT 10
habit_type TEXT ('positive' | 'negative')
```

**Streak Calculation:** Done in application code via `calculateNegativeHabitStreak()` function.

**Gap for Streak Insurance:** Need to add:
- `streak_insurance_tokens` table
- Logic to check if user has token before breaking streak

### 2. Notification System (HIGH confidence)

**Tables:**
- `notification_settings` - Per-user preferences
  - `push_enabled`, `push_subscription` (JSONB)
  - `telegram_enabled`, `telegram_chat_id`
  - `quiet_hours_enabled`, `quiet_hours_start/end`
  - `birthday_days_before[]`, `attention_threshold_days`
- `notification_log` - Delivery tracking

**Working Channels:**
1. **Web Push** - Fully configured with VAPID keys, `web-push` library
2. **Telegram** - One-way (bot -> user), webhook exists for receiving

**Sending Functions:**
```typescript
// Web Push (in reminder-scheduler.ts)
await webpush.sendNotification(subscription, payload);

// Telegram (in telegram.ts)
await sendMessage(chatId, text, { parseMode: 'HTML' });
```

### 3. Quest System (HIGH confidence)

**Tables:**
- `quests` - Quest definitions
  - `status` ('active' | 'completed' | 'failed' | 'archived')
  - `expires_at` TIMESTAMPTZ
  - `type` ('daily' | 'weekly' | 'story')
  - `xp_reward` INTEGER
- `quest_actions` - Progress tracking
- `user_quest_preferences` - AI preferences

**Existing Function:**
```sql
-- Auto-expire quests (already exists in migration!)
CREATE OR REPLACE FUNCTION expire_old_quests()
RETURNS void AS $$
BEGIN
  UPDATE quests
  SET status = 'failed'
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Gap:** Function exists but no cron job calls it! Need notification before expiry (24h).

### 4. Health Import (HIGH confidence)

**Tables:**
- `user_api_keys` - API keys for external integrations
- `sleep_logs` - Sleep data
- `health_import_logs` - Import audit trail

**Webhook Endpoint:**
`POST /api/integrations/health-import/webhook`

**Current Data Types Supported:**
- Workouts (mapped to trainingslog)
- Body metrics (logged to activity_log)
- Steps (logged to activity_log)
- Sleep (logged to activity_log)

**Gap:** No habit auto-complete matching. Need to:
1. Match workout type to habit
2. Auto-complete habit if matching workout imported

### 5. Faction/Domain System (HIGH confidence)

**Tables:**
- `factions` - 7 life domains (karriere, hobby, koerper, geist, finanzen, soziales, wissen)
- `user_faction_stats` - Per-user XP and levels
  - `total_xp`, `weekly_xp`, `monthly_xp`, `level`
  - `last_activity` TIMESTAMPTZ

**Proactive Reminder Logic Basis:**
```sql
-- Find neglected factions (example query)
SELECT faction_id, last_activity
FROM user_faction_stats
WHERE user_id = $1
  AND (last_activity IS NULL OR last_activity < NOW() - INTERVAL '7 days')
ORDER BY last_activity ASC NULLS FIRST
LIMIT 1;
```

## Feature Implementation Details

### Feature 1: Streak Insurance Token System

**Database Schema:**
```sql
CREATE TABLE streak_insurance_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token info
  token_type TEXT NOT NULL DEFAULT 'standard', -- standard, premium
  reason TEXT, -- 'login_bonus', 'achievement', 'purchase'

  -- Usage tracking
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_for_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,

  -- Validity
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streak_tokens_user ON streak_insurance_tokens(user_id);
CREATE INDEX idx_streak_tokens_unused ON streak_insurance_tokens(user_id)
  WHERE is_used = FALSE AND expires_at > NOW();
```

**API Endpoints:**
- `GET /api/streak-insurance/tokens` - List user's available tokens
- `POST /api/streak-insurance/use` - Use a token to protect a streak

**UI Component:**
- Show token count on dashboard
- Prompt to use token when streak would break
- Animation when token is used

**Success Metric:** 80% of streak-breaks prevented when tokens available

### Feature 2: Proaktive Lebensbereich-Erinnerungen

**Scheduler Logic:**
```typescript
// src/lib/cron/proactive-scheduler.ts
// Runs daily at 10:00 user's local time

async function checkNeglectedFactions() {
  // 1. Get users with push enabled
  // 2. For each user, find faction with oldest last_activity
  // 3. If last_activity > 7 days ago, send reminder
  // 4. Respect quiet hours
  // 5. Max 1 proactive notification per user per day
}
```

**Notification Content:**
```typescript
{
  title: `${factionIcon} ${factionName} braucht Aufmerksamkeit!`,
  body: `Du hast seit ${daysAgo} Tagen keine ${factionName}-Aktivitaet. Zeit fuer ein Habit oder Quest?`,
  url: '/dashboard?highlight=' + factionId,
  tag: 'proactive-faction-' + factionId,
}
```

**Tracking Table:**
```sql
CREATE TABLE proactive_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  faction_id TEXT NOT NULL,
  notification_type TEXT DEFAULT 'neglected_faction',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ
);

-- Prevent duplicate notifications same day
CREATE UNIQUE INDEX idx_proactive_daily
  ON proactive_notification_log(user_id, DATE(sent_at));
```

**Success Metric:** 1+ proactive notification per active user per day

### Feature 3: Health Import -> Habit Auto-Complete

**Matching Logic in Webhook:**
```typescript
// After successful workout import:
async function matchAndCompleteHabits(userId: string, workout: HealthWorkout) {
  const mappedType = mapWorkoutType(workout.workoutType);

  // Find habits that match this workout type
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_category_id', mappedType) // or similar matching
    .eq('habit_type', 'positive')
    .eq('is_active', true);

  for (const habit of habits) {
    // Check if not already completed today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .gte('logged_at', today)
      .single();

    if (!existingLog) {
      // Auto-complete the habit
      await completeHabitFromHealthImport(habit.id, workout);
    }
  }
}
```

**Habit-Workout Type Mapping:**
| Health Workout Type | Activity Category |
|---------------------|-------------------|
| running, walking, hiking | cardio |
| strength_training, functional_strength | strength |
| yoga, pilates | flexibility |
| cycling | cardio |
| swimming | cardio |

**New Table for Mapping:**
```sql
CREATE TABLE habit_health_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  health_workout_type TEXT NOT NULL,
  min_duration_minutes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, health_workout_type)
);
```

**Success Metric:** Health imports auto-complete matching habits

### Feature 4: Quest-Expiration Notifications

**Scheduler Logic:**
```typescript
// src/lib/cron/quest-expiry-scheduler.ts
// Runs every hour

async function checkExpiringQuests() {
  const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { data: expiringQuests } = await supabase
    .from('quests')
    .select('*, user_profiles!inner(timezone)')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lte('expires_at', twentyFourHoursFromNow.toISOString())
    .gte('expires_at', new Date().toISOString());

  for (const quest of expiringQuests) {
    // Check if notification already sent
    // Send notification
    // Log to notification_log
  }
}
```

**Notification Content:**
```typescript
{
  title: `Quest laeuft bald ab!`,
  body: `"${quest.title}" laeuft in ${hoursRemaining}h ab. Noch ${quest.progress}% erledigt.`,
  url: `/quests/${quest.id}`,
  tag: 'quest-expiry-' + quest.id,
}
```

**Tracking:**
```sql
-- Add column to quests table
ALTER TABLE quests ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ;
```

**Success Metric:** Notifications sent 24h before expiry

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notifications | Custom implementation | `web-push` library | Already configured, handles VAPID |
| Cron scheduling | setTimeout loops | `node-cron` | Reliable, already in use |
| Timezone handling | Manual date math | `toLocaleTimeString()` with timezone | Handles DST, edge cases |
| Duplicate prevention | Complex timestamps | Simple `DATE(sent_at)` unique index | DB handles concurrency |
| Rate limiting | Custom tracking | DB unique constraints | Atomic, reliable |

**Key insight:** The existing cron infrastructure and notification system are production-tested. Extend them rather than building new patterns.

## Common Pitfalls

### Pitfall 1: Timezone Handling
**What goes wrong:** Sending notifications at wrong local time
**Why it happens:** Storing times in UTC without user timezone context
**How to avoid:**
- Store user timezone in `user_profiles.timezone`
- Always convert before comparison
**Warning signs:** Users reporting notifications at wrong times

### Pitfall 2: Duplicate Notifications
**What goes wrong:** Same notification sent multiple times
**Why it happens:** Cron runs faster than expected, server restarts, no deduplication
**How to avoid:**
- Use unique indexes with DATE granularity
- Check `notification_log` before sending
- Use 2-minute window like existing reminder system
**Warning signs:** Users complaining about spam

### Pitfall 3: Streak Calculation Race Conditions
**What goes wrong:** Token used but streak still breaks
**Why it happens:** Concurrent requests, non-atomic operations
**How to avoid:**
- Use database transactions
- Check and use token in single atomic operation
**Warning signs:** Users lose streaks despite having tokens

### Pitfall 4: Health Import Matching Too Aggressive
**What goes wrong:** Habits auto-completed that shouldn't be
**Why it happens:** Overly broad workout-to-habit matching
**How to avoid:**
- Require explicit user mapping (habit_health_mappings table)
- Minimum duration thresholds
- Show confirmation notification
**Warning signs:** Users surprised by auto-completions

## Code Examples

### Extending instrumentation.ts
```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initReminderScheduler } = await import('./lib/cron/reminder-scheduler');
    const { initProactiveScheduler } = await import('./lib/cron/proactive-scheduler');
    const { initQuestExpiryScheduler } = await import('./lib/cron/quest-expiry-scheduler');
    const { initStreakCheckScheduler } = await import('./lib/cron/streak-check-scheduler');

    console.log('[Instrumentation] Initializing schedulers...');

    initReminderScheduler();
    initProactiveScheduler();
    initQuestExpiryScheduler();
    initStreakCheckScheduler();

    console.log('[Instrumentation] All schedulers initialized');
  }
}
```

### Using Streak Insurance Token
```typescript
// POST /api/streak-insurance/use
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { habitId } = await request.json();

  // Transaction: find available token and mark as used
  const { data: token, error } = await supabase
    .from('streak_insurance_tokens')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_for_habit_id: habitId,
    })
    .eq('user_id', user.id)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)
    .select()
    .single();

  if (error || !token) {
    return NextResponse.json({ error: 'No token available' }, { status: 400 });
  }

  return NextResponse.json({ success: true, token });
}
```

### Proactive Faction Reminder
```typescript
// src/lib/cron/proactive-scheduler.ts
import cron from 'node-cron';

export function initProactiveScheduler() {
  // Run at 10:00 AM every day
  cron.schedule('0 10 * * *', async () => {
    const supabase = createAdminClient();

    // Get users with push enabled who haven't been notified today
    const { data: users } = await supabase
      .from('notification_settings')
      .select('user_id, push_subscription, user_profiles!inner(timezone)')
      .eq('push_enabled', true);

    for (const user of users || []) {
      // Check if already notified today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('proactive_notification_log')
        .select('id')
        .eq('user_id', user.user_id)
        .gte('sent_at', today)
        .single();

      if (existing) continue;

      // Find most neglected faction
      const { data: neglected } = await supabase
        .from('user_faction_stats')
        .select('faction_id, last_activity, factions!inner(name_de, icon)')
        .eq('user_id', user.user_id)
        .order('last_activity', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

      if (neglected && isNeglected(neglected.last_activity)) {
        await sendProactiveNotification(user, neglected);
      }
    }
  });

  console.log('[Proactive Scheduler] Initialized - Running daily at 10:00');
}

function isNeglected(lastActivity: string | null): boolean {
  if (!lastActivity) return true;
  const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 7;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External cron service | Next.js instrumentation.ts + node-cron | Next.js 14 | Simpler deployment |
| Polling for push | Web Push API with service worker | Standard | Better battery/UX |
| Manual timezone math | Intl.DateTimeFormat with IANA zones | Modern JS | Correct DST handling |

**Not deprecated but worth noting:**
- `web-push` library is stable and recommended
- Telegram Bot API hasn't changed significantly

## Open Questions

1. **Token Earning Mechanism**
   - What we know: Tokens can be used to protect streaks
   - What's unclear: How are tokens earned? (login bonus, achievements, purchase?)
   - Recommendation: Start with daily login bonus (1 token/week), expand later

2. **Health Import Opt-In**
   - What we know: Users have API keys for health import
   - What's unclear: Should auto-complete be opt-in per habit or global?
   - Recommendation: Per-habit setting (habit_health_mappings table)

3. **Proactive Notification Timing**
   - What we know: 10:00 AM seems reasonable
   - What's unclear: Is this optimal? User preference?
   - Recommendation: Start with 10:00 AM, add user preference later

## Sources

### Primary (HIGH confidence)
- `/root/husatech/projekt-l/src/lib/cron/reminder-scheduler.ts` - Existing cron pattern
- `/root/husatech/projekt-l/src/lib/data/habits.ts` - Habit CRUD and streak logic
- `/root/husatech/projekt-l/src/lib/data/notifications.ts` - Notification settings
- `/root/husatech/projekt-l/supabase/migrations/20260110130000_ai_quest_system.sql` - Quest schema
- `/root/husatech/projekt-l/supabase/migrations/20260110100000_habit_reminders.sql` - Reminder schema

### Secondary (MEDIUM confidence)
- `/root/husatech/projekt-l/docs/REMINDER_SCHEDULER_TEST.md` - Scheduler documentation
- `/root/husatech/projekt-l/.planning/ROADMAP.md` - Phase requirements

### Tertiary (LOW confidence)
- None - all findings based on codebase analysis

## Metadata

**Confidence breakdown:**
- Existing infrastructure: HIGH - Direct code analysis
- Feature implementation patterns: HIGH - Based on existing patterns
- Success metrics: MEDIUM - Based on ROADMAP requirements

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable codebase, no expected major changes)

---

## Appendix: Quick Reference

### Existing Tables to Extend
- `habits` - No changes needed
- `quests` - Add `expiry_notified_at` column
- `notification_settings` - No changes needed
- `user_faction_stats` - Use `last_activity` for proactive reminders

### New Tables Needed
1. `streak_insurance_tokens` - Token storage
2. `proactive_notification_log` - Deduplication
3. `habit_health_mappings` - User-defined workout->habit mapping

### New Cron Jobs Needed
1. `proactive-scheduler.ts` - Daily at 10:00
2. `quest-expiry-scheduler.ts` - Hourly
3. `streak-check-scheduler.ts` - Daily at midnight (for token prompt)

### API Endpoints Needed
1. `GET /api/streak-insurance/tokens` - List tokens
2. `POST /api/streak-insurance/use` - Use token
3. `POST /api/streak-insurance/earn` - Earn token (called by system)

### UI Components Needed
1. `StreakInsuranceCard.tsx` - Dashboard widget
2. `UseTokenModal.tsx` - Prompt when streak would break
3. `HealthHabitMapping.tsx` - Settings for auto-complete
