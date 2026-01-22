# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**AI/LLM:**
- Claude (Anthropic) - AI chatbot backend
  - SDK: `@anthropic-ai/sdk` 0.71.2
  - Model: `claude-sonnet-4-5-20250929`
  - Auth: `ANTHROPIC_API_KEY` (env var, can be overridden per-user)
  - Endpoint: `src/app/api/ai/chat/route.ts`
  - Per-user encrypted keys stored in `user_llm_keys` table

**Calendar:**
- Google Calendar - Event sync and scheduling
  - SDK: `googleapis` 170.0.0
  - OAuth2 Flow: `src/app/api/integrations/google-calendar/callback/route.ts`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Tokens stored in `google_calendar_integrations` table
  - Endpoints:
    - `src/app/api/integrations/google-calendar/auth/route.ts` - Initiate OAuth
    - `src/app/api/integrations/google-calendar/events/route.ts` - Fetch events
    - `src/app/api/integrations/google-calendar/sync/route.ts` - Sync events

**Knowledge Base:**
- Notion - Knowledge base integration
  - SDK: `@notionhq/client` 5.6.0
  - Setup: Requires Notion API key configuration
  - Migration: `supabase/migrations/20260110190000_notion_integration.sql`

**Health Data:**
- Apple Health - Workout, sleep, metrics import
  - Webhook endpoint: `src/app/api/integrations/health-import/webhook/route.ts`
  - Auth: Bearer token (`HEALTH_IMPORT_API_KEY`)
  - Rate limiting: 10 requests/minute
  - Supported data types: workouts, bodyMetrics, steps, sleep
  - Data layer: `src/lib/data/health-import.ts`
  - Database table: `health_imports` (tracks external_id to avoid duplicates)

**Messaging:**
- Telegram Bot API - Bot messaging and webhooks
  - Library: Custom HTTP wrapper in `src/lib/telegram.ts`
  - Webhook endpoint: `src/app/api/integrations/telegram/webhook/route.ts`
  - Auth: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
  - Endpoints:
    - `src/app/api/integrations/telegram/send/route.ts` - Send message
    - `src/app/api/integrations/telegram/connect/route.ts` - Connect user to bot
    - `src/app/api/integrations/telegram/test/route.ts` - Test bot connection
  - Telegram codes mapping: `src/lib/telegram-codes.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client libraries: `@supabase/supabase-js` 2.89.0, `@supabase/ssr` 0.8.0
  - Server client: `src/lib/supabase/server.ts`
  - Browser client: `src/lib/supabase/client.ts`
  - Admin client: `src/lib/supabase/admin.ts`
  - RLS policies: Enabled for security

**Database Tables (Key):**
- `users` - User profiles
- `user_llm_keys` - Encrypted API keys (Anthropic, OpenAI)
- `google_calendar_integrations` - Google Calendar OAuth tokens
- `health_imports` - Health data import history
- `habits`, `skills`, `factions` - Gamification data
- `notifications` - Notification settings
- `habit_reminders` - Scheduled reminders

**File Storage:**
- Supabase Storage - User avatars and files
  - Upload endpoint: `src/app/api/profile/upload-avatar/route.ts`
  - Integration: `src/lib/data/health-import.ts` references storage

**Caching:**
- None - Application relies on Supabase caching and direct queries

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Built-in authentication
  - JWT-based sessions
  - Cookie-based session management via `@supabase/ssr`
  - Login: `src/components/auth/LoginForm.tsx`
  - Signup: `src/components/auth/SignupForm.tsx`
  - Middleware: `src/lib/supabase/middleware.ts` - Session refresh

**User Context:**
- Helper: `src/lib/auth-helper.ts` - `getUserIdOrCurrent()` to get current user

## Monitoring & Observability

**Error Tracking:**
- Console logging - Development and production error logs
- Error boundaries: Not explicitly detected in shared code

**Logs:**
- Server-side console logging throughout API routes
- Client-side error handling with NextResponse

## CI/CD & Deployment

**Hosting:**
- Vercel (assumed, uses Next.js 16 with App Router)

**CI Pipeline:**
- None explicitly configured - relies on Vercel's built-in CI

**Build Process:**
- `npm run build` - TypeScript compilation + Next.js build
- `npm run dev` - Local development server (port 3000)
- `npm start` - Production server

## Environment Configuration

**Required env vars:**
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **AI:** `ANTHROPIC_API_KEY` (optional if user provides own)
- **Encryption:** `ENCRYPTION_SECRET` (32-byte hex string for AES-256-GCM)
- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Web Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **Telegram:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
- **Health Import:** `HEALTH_IMPORT_API_KEY`

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- Vercel Secrets - Production (managed via Vercel dashboard)
- `.env.example` - Template (committed with placeholder values)

## Webhooks & Callbacks

**Incoming:**
- Health Import: `POST /api/integrations/health-import/webhook` - Apple Health data
  - Authentication: Bearer token in Authorization header
  - Rate limit: 10 req/min
  - Supports: workouts, bodyMetrics, steps, sleep
- Telegram: `POST /api/integrations/telegram/webhook` - Bot updates
  - Authentication: Telegram webhook signing
- Google Calendar: `GET /api/integrations/google-calendar/callback` - OAuth callback

**Outgoing:**
- Google Calendar: Set webhook via `setWebhook()` in `src/lib/telegram.ts`
- Telegram: Configured via `src/lib/telegram.ts` - `setWebhook()`, `deleteWebhook()`
- Push Notifications: `web-push` 3.6.7 sends push notifications to clients

## API Key Management

**User-Provided Keys:**
- Anthropic API keys encrypted with AES-256-GCM
- Stored in `user_llm_keys` table (encrypted_key, key_prefix for display)
- Encryption key: `ENCRYPTION_SECRET` environment variable
- Decryption only on-demand when calling API

**Environment Variables:**
- Fallback to `ANTHROPIC_API_KEY` if user hasn't provided personal key
- Sensitive keys stored in Supabase and server environment only

## Data Flow

**AI Chat:**
1. User message → `POST /api/ai/chat` (requires auth)
2. Server fetches user's Anthropic key or uses env fallback
3. Creates Anthropic client and calls Claude API
4. Claude calls skill tools (list_user_skills, add_skill_xp, etc.)
5. Tool results returned to Claude for final response

**Health Import:**
1. Apple Health app sends JSON via `POST /api/integrations/health-import/webhook`
2. Rate limit and API key validation
3. `importHealthData()` processes workouts, metrics, steps, sleep
4. Data stored in Supabase tables
5. Activity logged and faction XP updated

**Google Calendar Sync:**
1. User initiates OAuth flow
2. Redirected to Google consent screen
3. OAuth callback stores tokens in `google_calendar_integrations`
4. Tokens can be used to fetch events via `googleapis` SDK

---

*Integration audit: 2026-01-22*
