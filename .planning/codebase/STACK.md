# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (frontend + backend)
- JavaScript (Node.js) - Runtime scripts and tools

**Secondary:**
- SQL - Supabase migrations in `supabase/migrations/`
- CSS - Tailwind CSS 4 (PostCSS config)

## Runtime

**Environment:**
- Node.js (Next.js required version, LTS recommended)

**Package Manager:**
- npm (with lock file `package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework (App Router)
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind
- @tailwindcss/typography 0.5.19 - Typography plugin
- Lucide React 0.562.0 - Icon library
- Framer Motion 12.23.26 - Animation library
- next-themes 0.4.6 - Dark mode support

**Data Visualization:**
- Recharts 3.6.0 - React charting library
- @xyflow/react 12.10.0 - Node/edge graph visualization
- @dagrejs/dagre 1.1.8 - DAG layout algorithm

**State Management:**
- TanStack React Query 5.90.20 - Server state management
- Zustand 5.0.9 - Client state store

**Utilities:**
- React Markdown 10.1.0 - Markdown rendering
- Isomorphic Dompurify 2.35.0 - XSS prevention
- DiceBear (core 9.2.4 + collection 9.2.4) - Avatar generation

**Testing:**
- Vitest 4.0.16 - Unit/component test runner
- @testing-library/react 16.3.1 - React component testing
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User simulation
- @playwright/test 1.57.0 - E2E testing framework
- @vitest/coverage-v8 4.0.16 - Coverage reporting

**Build & Development:**
- ESLint 9 - Linting
- eslint-config-next 16.1.1 - Next.js ESLint rules
- tsx 4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.89.0 - Supabase client (auth + database)
- @supabase/ssr 0.8.0 - Supabase server-side rendering helper

**AI & LLM:**
- @anthropic-ai/sdk 0.71.2 - Claude API integration
- openai 6.17.0 - OpenAI embeddings (text-embedding-3-large)
- @qdrant/js-client-rest 1.16.2 - Qdrant vector database client

**External Integrations:**
- googleapis 170.0.0 - Google Calendar API
- @notionhq/client 5.6.0 - Notion API client
- web-push 3.6.7 - Web Push notifications
- node-cron 4.2.1 - Server-side cron scheduling

**Security & Cryptography:**
- bcryptjs 3.0.3 - Password hashing
- zod 4.3.5 - Runtime schema validation

**Development Tools:**
- dotenv 17.2.3 - Environment variable loading
- jsdom 27.4.0 - DOM implementation for testing
- @vitejs/plugin-react 5.1.2 - Vite React plugin
- @types/* - TypeScript type definitions

## Configuration

**Environment:**
- `.env.local` (git-ignored) - Local configuration file
- `.env.example` - Template with all required variables
- Environment variables loaded at build/runtime for:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin operations
  - `ANTHROPIC_API_KEY` - Claude API access
  - `OPENAI_API_KEY` - OpenAI embeddings
  - `QDRANT_HOST`, `QDRANT_PORT` - Qdrant vector database
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
  - `TELEGRAM_BOT_TOKEN` - Telegram bot authentication
  - `VAPID_*` - Web push notification keys
  - `HEALTH_IMPORT_API_KEY` - Apple Health webhook authentication
  - `ENCRYPTION_SECRET` - Data encryption for sensitive keys (32-byte hex)

**Build:**
- `next.config.ts` - Next.js configuration (redirects setup)
- `tsconfig.json` - TypeScript compiler options (path alias: `@/` → `./src/`)
- `vitest.config.ts` - Vitest test configuration (jsdom environment)
- `playwright.config.ts` - Playwright E2E test configuration (port 3050, 90s timeout)
- `eslint.config.mjs` - ESLint configuration (Next.js defaults + TypeScript)

## Platform Requirements

**Development:**
- Node.js (latest LTS recommended)
- npm 9+ for dependency management
- Modern browser for UI development
- `.env.local` file with all credentials (see `.env.example`)

**Production:**
- Node.js 18+ (Vercel Next.js deployment recommended)
- Supabase project (hosted or self-managed)
- Qdrant instance (87.106.191.206:6333 for HUSATECH server, else custom)
- Google Calendar API credentials (if using Google integration)
- Telegram Bot API token (if using Telegram integration)
- OpenAI API key (for embeddings in memory RAG)
- Anthropic API key (for Claude AI features)

## Build & Deployment Scripts

```bash
npm run dev              # Start development server (hot reload)
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
npm run test             # Run Vitest (watch mode)
npm run test:run         # Run Vitest once
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # E2E tests with Playwright UI
npm run test:e2e:headed  # E2E tests in headed browser
npm run test:e2e:debug   # E2E tests with debugger
npm run security:audit   # Security audit script
```

## Special Features

**Server Instrumentation:**
- `src/instrumentation.ts` - Runs on Next.js server startup
- Initializes 6 cron schedulers for background jobs
- Ensures Qdrant memory collection exists

**Cron Schedulers (node-cron):**
- Reminder scheduler
- Quest expiry scheduler
- Proactive reminder scheduler
- Health inactivity check scheduler
- Proactive quest generator scheduler
- Weekly summary generator scheduler (Sunday 03:00 AM)

---

*Stack analysis: 2026-02-02*
