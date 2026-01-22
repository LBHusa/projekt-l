# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Deprecated Auth Pattern:**
- Issue: File `src/lib/data/finanzen.ts` line 31 marks `getUserIdOrCurrent()` function as DEPRECATED with inline comments indicating it will be removed
- Files: `src/lib/data/finanzen.ts`, `src/lib/data/notifications.ts`
- Impact: Inconsistent auth approach. Code path may be removed breaking existing implementations. Creates confusion about which auth method to use
- Fix approach: Complete migration to consistent auth helper across all data layers, then remove deprecated function

**Missing Error Message Display:**
- Issue: `HabitCompletionModal.tsx` line 112 has TODO comment "Show error message" for failed habit completions
- Files: `src/components/dashboard/modals/HabitCompletionModal.tsx`
- Impact: Users receive no feedback when habit completion fails silently
- Fix approach: Implement toast/snackbar UI for error states and display error message from API response

**Test-User Hardcoding:**
- Issue: `src/lib/data/notifications.ts` line 13 contains TODO referencing test-user ID needing replacement with auth
- Files: `src/lib/data/notifications.ts`
- Impact: Notification settings may be tied to wrong user in test scenarios
- Fix approach: Verify all references use `getUserIdOrCurrent()` and remove test-user references

## Large Files & Complexity

**Critical Complexity Hotspots:**

| File | Lines | Risk |
|------|-------|------|
| `src/lib/ai/skill-tools.ts` | 1564 | Monolithic AI tool definitions with 30+ tool handlers. Hard to test, maintain, and debug individual tools |
| `src/lib/data/finanzen.ts` | 1483 | 40+ exported functions for finance operations. No clear separation of concerns (accounts, transactions, investments, budgets all mixed) |
| `src/lib/data/habits.ts` | 712 | Complex habit tracking with streaks, reminders, and achievement hooks. High risk for race conditions |
| `src/lib/data/weisheit.ts` | 673 | Book/course/knowledge management with multiple data sources. Potential data duplication issues |
| `src/app/page.tsx` | 617 | Dashboard page loads 10+ data sources sequentially. Waterfall queries causing slow initial load |
| `src/components/finanzen/flow/MoneyFlowCanvas.tsx` | 606 | Complex canvas rendering with animation. Hard to debug rendering issues |
| `src/app/finanzen/page.tsx` | 634 | Heavy finanzen page with multiple views and state management |
| `src/app/domain/[id]/page.tsx` | 635 | Dynamic domain page loads all related data without pagination |

**Fix approach:** Break large files into smaller modules with single responsibility. Implement service layer abstraction.

## Performance Bottlenecks

**N+1 Query Patterns:**
- Issue: Dashboard page (`src/app/page.tsx`) loads domains, factions, contacts, birthdays, and skills sequentially in multiple `useEffect` hooks
- Files: `src/app/page.tsx`, `src/lib/data/contacts.ts`
- Impact: Dashboard loads 8-10 separate API calls sequentially. Initial page load waterfall can take 3-5 seconds
- Fix approach: Batch queries using Supabase `.select()` with joins or create aggregated endpoint returning all dashboard data in single call

**Missing Pagination:**
- Issue: `getContacts()` and `getContactsWithStats()` in `src/lib/data/contacts.ts` fetch ALL contacts without limit or offset
- Files: `src/lib/data/contacts.ts` lines 26-78, 80-132
- Impact: Users with 1000+ contacts will experience memory bloat and slow rendering. No lazy loading implemented
- Fix approach: Add `limit` and `offset` parameters, implement cursor-based pagination for large datasets

**No Response Caching:**
- Issue: Only `src/app/api/calendar/export/route.ts` implements cache headers. Other API routes have no caching strategy
- Files: All API routes in `src/app/api/`
- Impact: Repeated identical queries hit database every time. User skill data, faction stats, contact lists query database on every load
- Fix approach: Add appropriate cache headers to read-only endpoints. Implement ISR (Incremental Static Regeneration) for dashboard data

**Repeated Database Views:**
- Issue: `getContacts()` and `getContactsWithStats()` duplicate filter logic completely (lines 26-78 vs 80-132)
- Files: `src/lib/data/contacts.ts`
- Impact: Maintenance burden. Bug fixes need to be applied to both functions
- Fix approach: Refactor to single parameterized function or use view-based approach

## Security Considerations

**API Key Exposure Vectors:**
- Risk: User-provided Anthropic API keys are stored in database and used directly on server
- Files: `src/lib/data/llm-keys.ts`, `src/app/api/ai/chat/route.ts`
- Current mitigation: Keys are stored per-user, accessed only after auth check
- Recommendations:
  - Implement key encryption at rest (Supabase encryption)
  - Add rate limiting per API key
  - Monitor for key reuse patterns
  - Add audit log of API key access

**Missing Input Validation:**
- Risk: Multiple API endpoints parse JSON without full schema validation
- Files:
  - `src/app/api/habits/create/route.ts` - parses habit input without type validation
  - `src/app/api/skills/xp/route.ts` - XP amount could be negative or extremely large
  - `src/app/api/ai/chat/route.ts` - messages array structure not validated
- Current mitigation: Some endpoints check basic structure (array existence)
- Recommendations:
  - Use Zod or similar schema validation library
  - Validate data types, ranges, and constraints on all endpoints
  - Add rate limiting to prevent abuse

**Missing CSRF Protection for Mutations:**
- Risk: POST/PUT/DELETE endpoints don't validate CSRF tokens explicitly (relying on SameSite cookies)
- Files: All mutation endpoints in `src/app/api/`
- Current mitigation: SameSite=Lax cookie policy in Next.js
- Recommendations:
  - Add explicit CSRF token validation for all state-changing operations
  - Verify token consistency between request headers and body

**Potential XSS in AI Tool Responses:**
- Risk: AI chat endpoint returns tool execution results directly without sanitization
- Files: `src/app/api/ai/chat/route.ts` lines 190-195
- Impact: If tool output contains HTML/JavaScript, could execute arbitrary code
- Fix approach: Sanitize all tool result strings, validate JSON responses match schema

**Missing Authentication on Public Integrations:**
- Risk: Telegram webhook endpoint validates via Bearer token but accepts ANY webhook update
- Files: `src/app/api/integrations/telegram/webhook/route.ts`
- Impact: Could process spoofed webhook updates if rate limiting fails
- Fix approach: Add webhook signature verification using Telegram's HMAC signature validation

## Fragile Areas

**Habit Streak Logic:**
- Files: `src/lib/data/habits.ts` lines 1-712
- Why fragile: Streak calculation depends on consecutive day tracking. Multiple code paths modify habit completion status (mark complete, undo, reschedule). Race conditions possible if user completes same habit twice in quick succession
- Safe modification: Add transactional guards, implement idempotent completion endpoint, add concurrency locks
- Test coverage: Integration tests exist but edge cases around timezone transitions and midnight crossing not tested

**Faction XP Distribution:**
- Files: `src/lib/ai/skill-tools.ts`, `src/lib/data/factions.ts`
- Why fragile: Tool calls add XP directly to skills, which triggers faction updates. Multiple async operations without transaction boundaries. If faction update fails, skill XP is still added (data inconsistency)
- Safe modification: Wrap both operations in database transaction, validate faction exists before XP assignment
- Test coverage: Unit tests exist for faction calculations but integration tests for XP workflow are incomplete

**Contact Relationship Cascading:**
- Files: `src/lib/data/contacts.ts`, database migrations
- Why fragile: Updating contact relationships may affect domain assignments, interaction history, and achievement checks. No clear dependency graph
- Safe modification: Add cascade delete triggers in database schema, document all side effects in comments
- Test coverage: No integration tests for contact deletion with cascading effects

**AI Tool Execution Context:**
- Files: `src/lib/ai/skill-tools.ts` executeSkillTool() function
- Why fragile: Tools execute with full user context without fine-grained permission checks. A compromised Claude instance could execute privileged operations (delete skills, transfer XP)
- Safe modification: Add per-tool permission checks, implement operation audit logging, rate limit tool execution
- Test coverage: Limited test coverage for tool execution error cases

## Unhandled Error Cases

**Silent Failures in Dashboard:**
- Issue: `src/app/page.tsx` uses separate `useEffect` for each data source with individual try-catch. If one fails, UI shows partial data with no indication of what failed
- Impact: User sees incomplete dashboard without knowing data is missing
- Fix approach: Implement error boundary component, show "failed to load" indicators for specific sections

**Missing Error Handling in Async Operations:**
- Issue: Many data layer functions throw errors without catching specific Supabase error codes
- Files: `src/lib/data/finanzen.ts`, `src/lib/data/habits.ts`, `src/lib/data/contacts.ts`
- Impact: Generic error messages don't help users understand what went wrong (network error vs permission error vs data not found)
- Fix approach: Catch and categorize errors, provide specific user-facing messages

**Webhook Error Recovery:**
- Issue: Health import webhook (`src/app/api/integrations/health-import/webhook/route.ts`) processes data but doesn't retry failed imports
- Files: `src/app/api/integrations/health-import/webhook/route.ts`
- Impact: Failed health data import is silently lost with no recovery mechanism
- Fix approach: Implement message queue for failed imports, provide retry logic

## Missing Critical Features

**No Concurrency Control:**
- Problem: No database-level concurrency handling for frequent updates (habit completion, XP gain, faction updates)
- Blocks: Can't guarantee data consistency under high concurrent user load
- Priority: High

**No Audit Logging:**
- Problem: No system to track who changed what data and when (for security, compliance, debugging)
- Blocks: Can't investigate data anomalies or user disputes
- Priority: Medium

**Missing Rate Limiting on User Endpoints:**
- Problem: No rate limiting on quest generation, skill creation, or other computationally expensive operations (except health import webhook)
- Blocks: Users could spam API to drain resources or cause DOS
- Priority: High

**No Data Expiration Policy:**
- Problem: Historical data (activity logs, interactions, transactions) grows unbounded with no archival strategy
- Blocks: Database size grows linearly with time, queries slow down
- Priority: Medium

## Test Coverage Gaps

**Unit Test Coverage:**
- What's not tested: Error paths in API routes, edge cases in calculation functions (negative values, null handling)
- Files:
  - `src/lib/data/finanzen.ts` - Transaction calculations with edge cases
  - `src/lib/data/achievements.ts` - Achievement unlock conditions
  - `src/lib/ai/skill-tools.ts` - Tool execution error handling
- Risk: Regressions go undetected in production
- Priority: High

**Integration Test Gaps:**
- What's not tested: Multi-step workflows like "create skill → add XP → unlock achievement → update faction"
- Files: Test suite
- Risk: Interaction bugs only discovered after deployment
- Priority: High

**API Route Tests:**
- What's not tested: Most POST/PUT/DELETE endpoints lack test coverage
- Files:
  - `src/app/api/habits/complete/route.ts`
  - `src/app/api/skills/xp/route.ts`
  - `src/app/api/finanzen/account/create/route.ts`
- Risk: API contract changes go unnoticed
- Priority: Medium

**E2E Tests:**
- What's not tested: Real user workflows (create skill → complete habits → view progress). No Playwright E2E tests documented
- Risk: UI bugs, navigation issues, data binding problems only discovered by manual testing
- Priority: Medium

---

*Concerns audit: 2026-01-22*
