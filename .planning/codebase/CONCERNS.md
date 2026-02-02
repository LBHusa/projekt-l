# Codebase Concerns

**Analysis Date:** 2026-02-02

## Critical Issues

### Migration Duplicates - Database Consistency Risk

**Issue:** 11 migration files are exact duplicates with different timestamps, causing potential Supabase migration conflicts

**Files (duplicates - numbered by timestamp):**
- `20260120100000_avatar_storage.sql` + `20260120_001_avatar_storage.sql`
- `20260120110000_snoozed_until.sql` + `20260120_002_snoozed_until.sql`
- `20260120120000_user_llm_keys.sql` + `20260120_003_user_llm_keys.sql`
- `20260123100000_profile_bio_displayname.sql` + `20260123_001_profile_bio_displayname.sql`
- `20260123110000_align_level_formula_with_xp_ts.sql` + `20260123_002_align_level_formula_with_xp_ts.sql`
- `20260125100000_onboarding.sql` + `20260125_001_onboarding.sql`
- `20260125110000_trial.sql` + `20260125_002_trial.sql`
- `20260201100000_habit_health_mappings.sql` + `20260201_habit_health_mappings.sql`
- `20260201120000_quest_expiry_notification.sql` + `20260201_quest_expiry_notification.sql`
- `20260202100000_hp_system_schema.sql` (no exact duplicate, but versioned pattern exists)
- `20260202110000_hp_damage_triggers.sql` + `20260202_002_hp_damage_triggers.sql`

**Root Cause:** Two Supabase instances were merged; migrations from both were copied with different naming conventions (RFC3339 timestamp vs `YYYYMMDD_NNN` format)

**Impact:**
- Supabase will try to run both versions of the same migration
- ON CONFLICT clauses prevent hard errors but waste resources
- Harder to debug which version actually ran
- Migration history becomes cluttered and harder to audit

**Fix Approach:**
1. Identify which version of each duplicate is "canonical" (likely the RFC3339 timestamped ones)
2. Delete the alternate versions from `/supabase/migrations/`
3. Test migration history: `supabase migration list --linked`
4. If needed, manually adjust Supabase migration table to mark duplicates as run
5. Document decision in `.planning/` for future reference

**Priority:** HIGH - Blocks reliable database deployments

---

## Tech Debt

### HP System API Not Fully Wired

**Issue:** HP system database schema and triggers are complete, but critical integration points are missing

**Files:**
- `supabase/migrations/20260202100000_hp_system_schema.sql` - Schema complete (376 lines)
- `supabase/migrations/20260202110000_hp_damage_triggers.sql` - Damage triggers
- `supabase/migrations/20260202120000_hp_heal_triggers.sql` - Heal triggers
- `src/app/api/health/inactivity-check/route.ts` - Inactivity damage implemented
- `src/app/api/health/prestige/route.ts` - Prestige reset implemented
- `src/lib/data/health.ts` - Data access layer complete

**Missing Integrations:**
1. **Quest Complete Healing** - HP healing on quest completion not wired
   - Migration defines trigger but endpoint needs to call `apply_hp_change` with event_type 'quest_complete'
   - Likely needs to be added to: `src/app/api/quests/[id]/complete/route.ts`

2. **Habit Complete Healing** - HP healing on habit completion not wired
   - Needs addition to: `src/app/api/habits/complete/route.ts`
   - Must call `apply_hp_change` with event_type 'habit_done'

3. **UI Display Missing** - No components show HP bar or health status
   - Dashboard should display user's current HP/lives
   - Death notification needs PrestigeModal component (referenced in prestige/route.ts but not found in codebase)

4. **Cron Job Missing** - Inactivity check endpoint exists but no scheduler calls it
   - `src/app/api/health/inactivity-check/route.ts` expects external trigger
   - Likely needs cron.json or serverless function configuration

**Impact:** Users can see HP system exists but it won't apply heal/damage for ~60% of triggers

**Fix Approach:**
1. Add HP change calls to quest completion endpoint
2. Add HP change calls to habit completion endpoint
3. Create/add PrestigeModal component to `src/components/` with death UI flow
4. Add daily inactivity check to cron scheduler
5. Test full flow: complete quest → see HP increase → check event log

**Priority:** HIGH - Core vision feature

---

### Memory System Incomplete (Phase 3)

**Issue:** AI Memory infrastructure exists but critical summarization cron job is missing

**Files:**
- `supabase/migrations/20260202130000_ai_memory_tables.sql` - Schema complete (200+ lines)
- `src/lib/data/conversation-memory.ts` - Data access layer (200+ lines)
- `src/lib/ai/memory-rag.ts` - Hybrid context building
- `src/app/api/ai/memory/context/route.ts` - Memory context endpoint
- `src/app/api/ai/memory/search/route.ts` - Memory search endpoint
- `src/app/api/ai/memory/health/route.ts` - Memory health check

**Missing:**
1. **Weekly Summary Generator** - No cron job to generate weekly_summary in user_summaries
   - Database has `last_summary_at` and `weekly_summary` fields but nothing populates them
   - Likely needs: `src/lib/cron/memory-summarizer.ts` + scheduler endpoint

2. **Telegram Memory Integration** - AI chat over Telegram doesn't store conversations
   - `src/app/api/integrations/telegram/webhook/route.ts` calls `handleTelegramAIChat()`
   - But `handleTelegramAIChat()` location unknown - likely missing

3. **Memory Export** - `/api/user/memory-export/route.ts` exists but implementation incomplete
   - Should export conversation history and summaries for user (GDPR requirement)

**Impact:**
- Memory system stores conversations but can't learn patterns
- Telegram AI chat won't build context over time
- User can't access their own conversation history

**Fix Approach:**
1. Search codebase for `handleTelegramAIChat` - if missing, create it in `src/lib/telegram-ai.ts`
2. Implement weekly cron job to summarize recent conversations
3. Add cron trigger endpoint: `src/app/api/cron/memory-summarize/route.ts`
4. Complete memory-export with full history dump
5. Test: Have multi-turn Telegram conversation, check if stored and summarized

**Priority:** MEDIUM-HIGH - AI uses memory but can't improve without summaries

---

### Gold System Endpoints Missing Error Handling

**Issue:** Gold/currency transactions lack comprehensive error handling and validation

**Files:**
- `supabase/migrations/20260202140000_gold_system.sql` - Schema (RPC functions for transactions)
- `src/lib/data/currency.ts` - Data access (uses RPC `add_gold`, `get_gold_balance`)
- `src/app/api/user/currency/route.ts` - Balance endpoint
- `src/app/api/user/currency/transactions/route.ts` - Transaction history

**Issues:**
1. **Missing Validation:**
   - No check for negative transaction amounts
   - No maximum transaction size validation
   - RPC functions assume valid input (p_amount: INTEGER without bounds)

2. **Silent Failures:**
   - `currency.ts` line 213: `addGold()` throws but many callers don't have catch blocks
   - Need to verify: quest complete, habit complete, milestone bonuses all handle failures

3. **No Audit Trail for Adjustments:**
   - Gold can be added via RPC but no admin-safe way to verify legitimacy
   - All gold additions use same `transaction_type` making pattern analysis hard

4. **Insufficient Error Context:**
   - `src/app/api/user/currency/route.ts` returns generic "Failed to get currency" on any error
   - Doesn't distinguish between missing currency record vs database error

**Impact:**
- Gold transactions could be corrupted without detection
- Support can't easily undo fraudulent transactions
- Quest/habit completion gold awards could silently fail without user knowing

**Fix Approach:**
1. Add validation to `addGold()`: check amount > 0 and < MAX_TRANSACTION
2. Add try-catch in quest completion: log if gold award fails, show warning to user
3. Create admin endpoint to query transaction audit trail by date range
4. Replace generic error messages with specific error codes
5. Add integration test for complete quest → gold award flow

**Priority:** MEDIUM - Edge case but affects core motivation loop

---

## Fragile Areas

### Telegram Integration - Two-Way Chat Not Production Ready

**Files:**
- `src/app/api/integrations/telegram/webhook/route.ts` - Main webhook handler
- `src/lib/telegram-ai.ts` - Missing or incomplete

**Fragility:**
1. **handleTelegramCallback() and handleTelegramAIChat() Location Unknown**
   - Webhook imports from `@/lib/telegram-ai` but file not in Glob results
   - Could be: not created yet, in different path, or deleted during refactor

2. **Error Handling in Webhook:**
   - Line 92-127: handleTelegramCallback() errors are silently caught
   - If message send fails, no retry or fallback notification
   - User gets silence instead of error message

3. **Stateless Message Processing:**
   - Each message processes independently - no conversation context preservation
   - Multi-turn conversations in Telegram won't have context from previous messages
   - Different from web chat which has `getRecentMessages()` integration

**Impact:**
- Telegram AI chat will be confused on follow-up messages
- Bot appears broken if it fails to respond
- Users can't continue conversations across message boundaries

**Fix Approach:**
1. Verify `src/lib/telegram-ai.ts` exists - if not, create with `handleTelegramAIChat` and `handleTelegramCallback`
2. Add message context retrieval in telegram webhook (like web chat does)
3. Add retry logic with exponential backoff for failed sends
4. Add structured logging (not just console.error) for production debugging
5. Test: Have 3-turn Telegram conversation, verify context is maintained

**Priority:** MEDIUM - Feature exists but may not work reliably

---

### Notification Settings - Test User ID Hardcoded

**Files:** `src/lib/data/notifications.ts`

**Issue:** Line 13 contains TODO comment about test user ID but auth helper is correctly used

```typescript
// Line 13: // Test-User ID (TODO: Replace with auth)
// Line 14: // await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()
```

**Status:** Actually fixed (comment is stale), but indicates someone was confused about auth flow. Low priority cleanup.

**Fix Approach:** Remove TODO comment on line 13

**Priority:** LOW - Code works, just stale comment

---

## Missing Critical Features (Phase 1-3)

### Streak Insurance Token System (Phase 1)

**Files:** `src/app/api/streak-insurance/tokens/route.ts` + `src/app/api/streak-insurance/use/route.ts`

**Status:** Endpoints exist, database schema confirmed in migrations, but:
- No UI component to use tokens visible in Glob results
- No cron job to award tokens on habit milestones
- Unclear how tokens flow from completion to available balance

**Impact:** Users can't protect their streaks even though system exists

---

### Proactive Notification System (Phase 1)

**Files:**
- `src/lib/cron/reminder-scheduler.ts` exists
- No cron orchestration found (cron.json, vercel.json with crons, etc.)

**Status:** Scheduler code exists but may not be triggered automatically

**Missing:**
- Proactive life domain reminders
- Quest expiration warnings (has migration but no cron trigger)
- Habit miss prediction/warning

---

### AI Faction Suggestions (Phase 1)

**Files:**
- `supabase/migrations/20260110140000_ai_faction_suggestions.sql` - Schema present
- `src/lib/ai/faction-suggester.ts` - Data access layer present
- No API endpoint found to trigger suggestions

**Status:** Infrastructure exists but not wired to UI or cron

---

## Test Coverage Gaps

**Untested Areas:**
- HP system complete flow (damage from quest failure, heal from completion, death detection)
  - Files: `src/app/api/health/inactivity-check/route.ts`, `src/app/api/health/prestige/route.ts`
  - Risk: Users lose entire feature without realizing
  - Priority: HIGH

- Memory summary generation and weekly updates
  - Files: `src/lib/data/conversation-memory.ts`
  - Risk: Memory system stores but can't learn, defeats Buddy purpose
  - Priority: MEDIUM

- Gold award integration on quest/habit complete
  - Files: `src/lib/data/currency.ts`, quest/habit complete endpoints
  - Risk: Silent failures cause reward loops to break
  - Priority: MEDIUM

- Telegram AI chat context maintenance
  - Files: `src/app/api/integrations/telegram/webhook/route.ts`
  - Risk: Bot appears broken on follow-up messages
  - Priority: MEDIUM

---

## Dependencies at Risk

### Deprecated/Fragile Dependencies

**Issue:** No specific deprecated packages found, but several integration points depend on external APIs:

| Dependency | Risk | Mitigation |
|------------|------|-----------|
| Anthropic API (Claude) | Rate limiting, key rotation | Users can provide own keys via `user_llm_keys` table |
| Telegram Bot API | Webhook reliability | Secret token verification in place |
| Google Calendar API | OAuth token refresh | Stored in `google_calendar_tokens` (verify refresh logic) |
| Apple Health Import | Webhook URL stability | Should be tested in production |

**Fix Approach:** Implement health check endpoint that validates all external APIs

---

## Security Considerations

### RLS Policies on Health Data

**Files:** `supabase/migrations/20260202100000_hp_system_schema.sql` lines 94-104

**Status:** GOOD - Policies restrict users to own data
```sql
CREATE POLICY "Users can view own health" ON user_health
  FOR SELECT USING (auth.uid() = user_id);
```

**Concern:** No INSERT/UPDATE/DELETE policies - all changes go through RPC functions only. This is intentional and secure.

### Telegram Webhook Secret Verification

**Files:** `src/app/api/integrations/telegram/webhook/route.ts` lines 24-30

**Status:** GOOD - Secret token validated
```typescript
if (expectedToken && secretToken !== expectedToken) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Minor Issue:** Validation is skipped if `TELEGRAM_WEBHOOK_SECRET` not set (line 25). Production should enforce this.

---

## Performance Bottlenecks

### Memory Context Building - Full Conversation Query

**Files:** `src/lib/ai/memory-rag.ts` (via import in memory/context endpoint)

**Issue:** Each time user opens chat, system fetches 50 recent messages
- `getRecentMessages(50, user.id)` in line 28 of `/api/ai/memory/context/route.ts`
- If user has 10,000+ conversation rows, full table scan could be slow
- Index exists but only on `(user_id, created_at DESC)` - should be sufficient

**Current Status:** Indexed for user + recency, should be OK up to 100K messages per user

**Scaling Limit:** If users have 1M+ messages, may need:
- Message summarization to reduce window size
- Archive old messages to separate table
- Distributed conversation storage

**Priority:** LOW for now, monitor with production usage

---

## Unknown/Unclear Implementations

### Location of `handleTelegramAIChat()` Function

**Issue:** Critical function is referenced but not found

```typescript
// src/app/api/integrations/telegram/webhook/route.ts line 13
import { handleTelegramAIChat, handleTelegramCallback } from '@/lib/telegram-ai';
```

**Expected Location:** `src/lib/telegram-ai.ts` - MISSING

**Impact:** Telegram AI chat feature will fail at runtime if accessed

**Fix:** Create file or locate existing implementation

---

### Memory Summarization Scheduling

**Issue:** `user_summaries` table structure exists but no code populates it

**Expected Function Calls:**
- Weekly cron → `src/lib/cron/something.ts` → generates summary
- Stores in `user_summaries.weekly_summary`
- Updates `last_summary_at`

**Not Found:** Any file containing "summary" generation logic

**Fix:** Implement weekly summarizer with cron trigger

---

## Database Inconsistencies

### Potential Orphaned Records

**Issue:** Several tables reference users but cleanup strategy unclear

**Tables Affected:**
- `health_events` - Cascade delete on user, OK
- `currency_transactions` - Cascade delete on user, OK
- `conversation_history` - Cascade delete on user, OK
- `health_insurance_tokens` - Cascade delete on user, OK

**Status:** All use `ON DELETE CASCADE`, cleanup is automatic

---

## Recommendations Summary

| Issue | Priority | Effort | Vision Impact |
|-------|----------|--------|-----------------|
| Remove duplicate migrations | HIGH | 30 min | Enables reliable deployments |
| Wire HP system: quest/habit triggers | HIGH | 2 hours | Core gameplay consequence |
| Create/locate telegram-ai.ts | HIGH | 1 hour | Two-way chat works |
| Implement memory weekly summary | MEDIUM | 3 hours | Buddy learns over time |
| Add gold transaction validation | MEDIUM | 1 hour | Prevents corruption |
| Fix prestige UI (PrestigeModal) | MEDIUM | 2 hours | Death system visible |
| Test complete HP flow | MEDIUM | 2 hours | Prevents silent failures |
| Create external API health check | LOW | 1 hour | Production monitoring |

---

*Concerns audit: 2026-02-02*
