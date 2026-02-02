# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**AI & LLM Services:**
- Claude API (Anthropic) - AI conversation and content generation
  - SDK: `@anthropic-ai/sdk` 0.71.2
  - Auth: `ANTHROPIC_API_KEY` (sk-ant-...)
  - Used in: Chat routes, weekly summaries, quest generation, proactive features

- OpenAI API - Embeddings for memory search
  - SDK: `openai` 6.17.0
  - Auth: `OPENAI_API_KEY`
  - Model: `text-embedding-3-large` (3072 dimensions)
  - Used in: Memory RAG system (`src/lib/ai/memory-rag.ts`)

**Communication & Bot Services:**
- Telegram Bot API - Telegram bot integration
  - SDK: Custom HTTP wrapper (`src/lib/telegram.ts`)
  - Auth: `TELEGRAM_BOT_TOKEN` (8501304094:AAE...)
  - Bot username: `ProjektL_bot` (env: `TELEGRAM_BOT_USERNAME`)
  - Endpoints:
    - `POST /api/integrations/telegram/webhook` - Webhook for bot updates
    - `POST /api/integrations/telegram/connect` - Link user to Telegram account
    - `POST /api/integrations/telegram/send` - Send message to user
    - `POST /api/integrations/telegram/test` - Test bot connectivity
  - Features: sendMessage, getMe, setWebhook, deleteWebhook, answerCallbackQuery

**Calendar Integration:**
- Google Calendar API - Calendar sync and event reading
  - SDK: `googleapis` 170.0.0
  - OAuth 2.0 credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Redirect URI: `GOOGLE_REDIRECT_URI` (default: http://localhost:3000/api/integrations/google-calendar/callback)
  - Scopes: `calendar.readonly`, `calendar.events.readonly`
  - Endpoints:
    - `GET /api/integrations/google-calendar/auth` - Initiate OAuth flow
    - `GET /api/integrations/google-calendar/callback` - OAuth callback handler
    - `GET /api/integrations/google-calendar/events` - Fetch calendar events
    - `POST /api/integrations/google-calendar/sync` - Sync events to app

**Health & Fitness Data:**
- Apple Health Integration - Health data import via webhook
  - Auth: Bearer token (`HEALTH_IMPORT_API_KEY`)
  - Endpoint: `POST /api/integrations/health-import/webhook`
  - Rate limiting: 10 requests/minute
  - Data types: Workouts, body metrics, steps, sleep
  - Implementation: `src/lib/data/health-import.ts`

**Book Metadata:**
- OpenLibrary API - ISBN book lookup (no auth required)
  - Endpoint: `GET /api/books/lookup?isbn=...`
  - Used for: Book metadata retrieval
  - Data: Title, author, page count, cover image

**Productivity:**
- Notion API - Potential integration (package present but not actively used)
  - SDK: `@notionhq/client` 5.6.0
  - Status: Dependency installed but no active usage found in codebase

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service role: `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
  - Client: `@supabase/supabase-js` 2.89.0
  - Browser client: `src/lib/supabase/client.ts` (createBrowserClient)
  - Server client: `src/lib/supabase/server.ts` (createServerClient with SSR)
  - Migrations: `supabase/migrations/` (21+ migration files)
  - Key tables:
    - `conversation_history` - Stored conversations for memory search
    - `notification_settings` - User push notification preferences
    - `users` - Supabase Auth users
    - Faction, skill, quest, habit tables (Phase 1-3 schema)

**Vector Database:**
- Qdrant - Semantic vector search for conversation memory (Phase 3)
  - Connection: `QDRANT_HOST` (default: 87.106.191.206), `QDRANT_PORT` (default: 6333)
  - Client: `@qdrant/js-client-rest` 1.16.2
  - Collection: `projekt_l_memory` (NOT shared with HUSATECH collections)
  - Dimensions: 3072 (from OpenAI text-embedding-3-large)
  - Distance metric: Cosine similarity
  - Payload indexes: `user_id` (keyword), `created_at` (datetime)
  - Implementation: `src/lib/ai/memory-rag.ts`
  - Features:
    - Lazy initialization on server startup (via instrumentation)
    - Per-user memory isolation via `user_id` filter
    - Semantic search with configurable similarity threshold (default: 0.7)

**File Storage:**
- Local filesystem only (no cloud storage integration)
- Avatar uploads: `src/app/api/profile/upload-avatar/route.ts`

**Caching:**
- In-memory caching via Zustand (client-side)
- TanStack React Query for server state management and caching
- No Redis or external cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in PostgreSQL authentication)
  - Supports email/password authentication
  - Session management via cookies (SSR)
  - JWT tokens for API access
  - Middleware: `src/middleware.ts` (session refresh)

**External OAuth (Optional):**
- Google OAuth 2.0 - For Google Calendar integration
- Telegram - User can link Telegram account via bot

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)
- Console logging for debugging

**Logs:**
- Server-side: `console.log()` and `console.error()`
- Client-side: Browser console
- Formatted with prefixes like `[Memory RAG]`, `[Instrumentation]`, etc.

**Health Checks:**
- Qdrant health check: `src/lib/ai/memory-rag.ts` → `checkHealth()`
- Status: Returns `{ qdrantAvailable, collectionExists }`

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js recommended)
- Alternative: Self-hosted Node.js server

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, etc. in repository)
- ESLint and tests should be run before commit

**Build Process:**
- Next.js build: `npm run build`
- TypeScript compilation with strict type checking
- No build-time API key requirement (uses runtime env vars)

## Environment Configuration

**Required env vars:**
```
# Supabase (mandatory)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI (mandatory for chat/memory features)
ANTHROPIC_API_KEY
OPENAI_API_KEY

# Qdrant (mandatory for memory RAG)
QDRANT_HOST
QDRANT_PORT

# Telegram (mandatory for bot integration)
TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME

# Encryption (mandatory for storing API keys)
ENCRYPTION_SECRET

# Google Calendar (optional)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI

# Web Push Notifications (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT

# Apple Health Import (optional)
HEALTH_IMPORT_API_KEY

# E2E Testing (required for Playwright tests)
E2E_TEST_USER_EMAIL
E2E_TEST_USER_PASSWORD
E2E_TEST_USER_B_EMAIL
E2E_TEST_USER_B_PASSWORD
```

**Secrets location:**
- Local: `.env.local` (git-ignored)
- Production: Environment variables in deployment platform (Vercel, Docker, etc.)
- Never commit `.env.local` or `.env` files

## Webhooks & Callbacks

**Incoming Webhooks:**
- Telegram Bot: `POST /api/integrations/telegram/webhook`
  - Headers: Optional `X-Telegram-Bot-Api-Secret-Token`
  - Updates: Messages, callback queries (button presses)

- Apple Health Import: `POST /api/integrations/health-import/webhook`
  - Auth: Bearer token in Authorization header
  - Rate limiting: 10 requests per minute
  - Data: Workouts, body metrics, steps, sleep

- Google Calendar Callback: `GET /api/integrations/google-calendar/callback`
  - OAuth 2.0 redirect endpoint
  - Query params: `code` (authorization code), `state` (user ID)

**Outgoing Webhooks:**
- None detected (app is consumer-only)

## Push Notifications

**Web Push (Voluntary Feature):**
- Service: Web Push API (W3C standard)
- Implementation: `web-push` 3.6.7
- VAPID keys: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Subject: `VAPID_SUBJECT` (mailto: email)
- Storage: Push subscriptions stored in `notification_settings` table
- Endpoint: `POST /api/notifications/subscribe`

## Background Jobs

**Cron Schedulers (node-cron):**
Configured in `src/instrumentation.ts` (runs on server startup):

1. **Reminder Scheduler** - Periodic habit/quest reminders
2. **Quest Expiry Scheduler** - Expire old quests
3. **Proactive Reminder Scheduler** - Proactive notifications
4. **Health Inactivity Scheduler** - Check for inactivity
5. **Proactive Quest Generator** - Generate quests based on patterns
6. **Weekly Summary Scheduler** - Generate summaries (Sunday 03:00 AM)
   - Uses: Claude API, conversation history from Supabase
   - Stores: Summaries back to user data

All schedulers run within Next.js process (no external job queue).

## Data Encryption

**For Sensitive Data:**
- LLM API keys stored encrypted in database
- Method: AES encryption with `ENCRYPTION_SECRET`
- Implementation: `src/lib/data/llm-keys.ts`
- Algorithm: OpenSSL compatible (32-byte hex secret)

---

*Integration audit: 2026-02-02*
