# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Server-driven Gamification with AI Enhancement & Real-time Sync

This is a Next.js 14 App Router application implementing a personal life gamification system with three primary layers:

1. **Presentation Layer** - React client components with modals/widgets
2. **API Layer** - Next.js API routes for business logic
3. **Data Layer** - Supabase PostgreSQL with RAG/memory via Qdrant

**Key Characteristics:**
- Hybrid client/server rendering (Next.js 14 App Router with 'use client' boundaries)
- Type-safe with TypeScript strict mode and Supabase auto-generated types
- Asynchronous data loading with Promise.allSettled for cascade failure prevention
- Multi-channel integrations: Web UI, Telegram AI Bot, Health Import webhooks
- Scheduled background tasks via node-cron for proactive features
- Qdrant vector search for semantic conversation memory
- Health/lives system with prestige/reset mechanics

## Layers

**Presentation (Client Components):**
- Purpose: UI interactions, state management, animations
- Location: `src/components/` and `src/app/` (page.tsx files)
- Contains: React components (page layouts, widgets, modals, forms)
- Depends on: `@/lib/data/*`, `@/lib/ai/*`, React Query, Zustand
- Used by: End users via Next.js routing

**API (Server Routes):**
- Purpose: Business logic, data mutations, AI processing, integrations
- Location: `src/app/api/`
- Contains: Next.js route handlers (POST/GET/PUT)
- Depends on: Supabase server client, LLM APIs (Anthropic, OpenAI), external services
- Used by: Presentation layer (fetch calls), webhooks (Telegram, Health Import), cron jobs

**Data Access (Supabase & RAG):**
- Purpose: Database queries, type-safe operations, vector search
- Location: `src/lib/data/*` (PostgreSQL), `src/lib/ai/*` (Qdrant)
- Contains: CRUD functions for each domain (skills, habits, health, etc.)
- Depends on: Supabase browser/server clients
- Used by: API routes and client components

**AI & Memory (LLM Integration):**
- Purpose: Chat assistance, quest generation, memory/context retrieval
- Location: `src/lib/ai/` and `src/lib/cron/`
- Contains: LLM tools, prompts, schedulers, Qdrant integration
- Depends on: Anthropic SDK, OpenAI SDK, Qdrant REST client
- Used by: Chat API, Proactive quest generation, Memory context

## Data Flow

**User Interaction -> Data Update -> View Update:**

1. User clicks action in component (e.g., "Complete Habit")
2. Component calls API endpoint via fetch (`POST /api/habits/complete`)
3. API endpoint:
   - Authenticates user (Supabase server client)
   - Executes business logic (XP calculation, streaks)
   - Updates database via data layer function
   - Returns result
4. Component receives response, calls `loadData()` to refresh
5. Dashboard reloads all necessary data in parallel with `Promise.allSettled`

**Example: Page.tsx Flow (Dashboard)**
```
page.tsx (loaded)
  → useAuth() gets current userId
  → loadData() via useEffect:
    → Promise.allSettled([
        getAllDomains(),
        getUserProfile(userId),
        getUserHealth(userId),
        getFactionsWithStats(userId),
        ... 13 parallel calls
      ])
  → State updates trigger re-render
  → Components display data + allow interactions
  → User actions trigger API calls
  → loadData() refreshed to sync state
```

**State Management:**
- Server State: PostgreSQL (source of truth)
- Client State: React useState for UI state + React Query cache
- Shared Context: SidebarProvider for navigation state
- Zustand: Minimal usage (check for store files)

## Key Abstractions

**User Authentication:**
- Purpose: Session management and authorization
- Examples: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`
- Pattern: Supabase SSR with cookie-based sessions. Middleware checks auth before non-public routes.

**Data Layer (CRUD Pattern):**
- Purpose: Encapsulate database operations
- Examples: `src/lib/data/health.ts`, `src/lib/data/skills.ts`, `src/lib/data/habits.ts`
- Pattern: Each domain has dedicated file with functions like `getUserHealth()`, `applyHpChange()`, etc.

**AI Tools & Execution:**
- Purpose: Provide Claude with skill management, finance, workout logging
- Examples: `src/lib/ai/skill-tools.ts`, `src/app/api/ai/chat/route.ts`
- Pattern: Tool definitions passed to Anthropic SDK, executeSkillTool() handles invocation

**Memory/RAG (Qdrant):**
- Purpose: Semantic search over conversation history for context
- Examples: `src/lib/ai/memory-rag.ts`, `src/lib/data/conversation-memory.ts`
- Pattern: Embeddings via OpenAI, stored in Qdrant collection `projekt_l_memory`, retrieved with similarity threshold 0.7

**Schedulers & Cron:**
- Purpose: Automated background tasks (daily quests, reminders, health checks)
- Examples: `src/lib/cron/proactive-quest-scheduler.ts`, `src/lib/cron/health-inactivity-scheduler.ts`
- Pattern: node-cron jobs started in API route or server startup, use service role for database access

**Integrations:**
- Purpose: Connect to external systems
- Examples:
  - Telegram: `src/lib/telegram.ts`, `src/lib/telegram-ai.ts`, `src/app/api/integrations/telegram/`
  - Google Calendar: `src/app/api/integrations/google-calendar/`
  - Health Import: `src/app/api/integrations/health-import/`
- Pattern: Webhook endpoints receive external events, translate to internal operations

## Entry Points

**Web Application Entry:**
- Location: `src/app/layout.tsx` (root layout)
- Triggers: User navigates to app
- Responsibilities: Initialize providers (QueryProvider, ThemeProvider, SidebarProvider), render layout

**Dashboard (Main Page):**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities: Load all dashboard widgets, display user stats, health/currency bars, modals

**API: Chat Endpoint:**
- Location: `src/app/api/ai/chat/route.ts`
- Triggers: User sends message from chat UI
- Responsibilities: Generate embeddings, retrieve memory context, stream Claude response, store conversation

**Webhooks:**
- Telegram: `src/app/api/integrations/telegram/webhook/route.ts`
- Health: `src/app/api/integrations/health-import/webhook/route.ts`
- Triggers: External service sends event
- Responsibilities: Authenticate request, transform event, update user data

**Cron Jobs (via API Route):**
- Location: `src/app/api/cron/` (inferred structure)
- Triggers: Scheduled intervals (e.g., 10 AM for proactive quests)
- Responsibilities: Query user list, generate/send notifications, update records

## Error Handling

**Strategy:** Graceful degradation with Promise.allSettled

**Patterns:**
- Dashboard loading uses `Promise.allSettled([...])` so if one data source fails, others still load
- API routes return error responses with HTTP status codes
- Client components show loading states, error messages, or fallback UI
- Data layer functions throw errors to API, API catches and returns JSON error response
- Webhook endpoints validate secret tokens, return 401 if unauthorized

**Example (from page.tsx, line 106-148):**
```typescript
const results = await Promise.allSettled([...14 calls...]);
const domainsData = results[0].status === 'fulfilled' ? results[0].value : [];
// Each result is checked, failures use default/empty value
```

## Cross-Cutting Concerns

**Logging:**
- Client: `console.log/error` (development, check browser DevTools)
- Server: `console.error/log` (check server logs/stdout)
- No structured logging library detected

**Validation:**
- TypeScript strict mode for type safety
- Zod validation in forms (check `src/lib/validation/`)
- Supabase RLS policies on database level
- Middleware auth check before protected routes

**Authentication:**
- Supabase Auth with password-based signup/login
- Session via HTTP-only cookies
- Middleware redirects unauthenticated users to `/auth/login`
- API routes use server client (trusted) or check auth context (public)

**Rate Limiting:**
- Not detected. Supabase has built-in rate limits, LLM APIs have token limits.

**Caching:**
- React Query for client-side API response caching
- No Redis/server-side cache detected
- Conversation memory stored in Postgres + Qdrant for semantic search

---

*Architecture analysis: 2026-02-02*
