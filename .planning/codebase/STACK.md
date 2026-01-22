# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (src/app, src/components, src/lib)
- JavaScript/JSX - React 19.2.3 with JSX transformation

**Secondary:**
- SQL - Database schema migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js (version from .nvmrc or system default)

**Package Manager:**
- npm 10+ (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack framework (App Router)
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS
- @tailwindcss/postcss 4 - PostCSS plugin

**State Management:**
- Zustand 5.0.9 - Lightweight state management (used in store patterns)

**Animation:**
- Framer Motion 12.23.26 - Motion and animation library
- Recharts 3.6.0 - React charting library

**Component Libraries:**
- Lucide React 0.562.0 - Icon library
- DiceBear collection 9.2.4 - Avatar generation (@dicebear/core, @dicebear/collection)

**Graphs & Visualization:**
- @xyflow/react 12.10.0 - React node-based graph library
- @dagrejs/dagre 1.1.8 - Graph layout algorithm

**Testing:**
- Vitest 4.0.16 - Unit testing framework
- @testing-library/react 16.3.1 - React testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- @vitest/coverage-v8 4.0.16 - Code coverage

**Build & Dev:**
- ESLint 9 - Code linting
- eslint-config-next 16.1.1 - Next.js ESLint config
- PostCSS - CSS processing
- JSDOM 27.4.0 - DOM simulation for tests

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.89.0 - Supabase client SDK (database, auth, realtime)
- @supabase/ssr 0.8.0 - Supabase server-side rendering support
- @anthropic-ai/sdk 0.71.2 - Anthropic Claude API client
- googleapis 170.0.0 - Google APIs client (Calendar integration)
- @notionhq/client 5.6.0 - Notion API client

**Infrastructure:**
- bcryptjs 3.0.3 - Password hashing
- web-push 3.6.7 - Web Push Notifications API
- node-cron 4.2.1 - Cron job scheduling
- next-themes 0.4.6 - Theme provider for dark mode

## Configuration

**Environment:**
- `.env.example` - Template (committed)
- `.env.local` - Local overrides (git-ignored)

**Key Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `ANTHROPIC_API_KEY` - Claude API key (optional if user provides own)
- `ENCRYPTION_SECRET` - 32-byte hex string for API key encryption
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` - Google OAuth
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` - Web Push
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` - Telegram Bot API
- `HEALTH_IMPORT_API_KEY` - Health import webhook authentication

**Build:**
- `next.config.ts` - Next.js configuration with URL redirects
- `tsconfig.json` - TypeScript configuration (ES2017 target, strict mode)
- `vitest.config.ts` - Vitest configuration with jsdom environment
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration (ESM format)

## Platform Requirements

**Development:**
- Node.js 18+ (TypeScript 5.9.3 requires ES2017+)
- npm 10+
- TypeScript support required

**Production:**
- Vercel (assumed, uses Next.js 16)
- Supabase instance required
- Environment variables for all external APIs

---

*Stack analysis: 2026-01-22*
