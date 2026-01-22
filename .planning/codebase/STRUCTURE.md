# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
projekt-l/
├── public/                      # Static assets served directly
├── supabase/
│   ├── migrations/              # SQL migration files (schema)
│   └── seed.sql                 # Initial seed data
├── src/
│   ├── __tests__/               # Unit and integration tests
│   ├── app/                     # Next.js App Router pages and API routes
│   ├── components/              # Reusable React components
│   ├── contexts/                # React Context providers and hooks
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions, data access, types
│   └── middleware.ts            # Request middleware (authentication)
├── .env                         # Environment variables (secrets)
├── .env.example                 # Example environment variables
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── tailwind.config.ts           # Tailwind CSS configuration
```

## Directory Purposes

**public/**
- Purpose: Serve static assets directly to clients
- Contains: Icons, logos, avatars, images, manifest.json
- Key files: `manifest.json` (PWA manifest)

**supabase/**
- Purpose: Database schema and initialization
- Contains: SQL migrations, seed data
- Key files:
  - `migrations/20241226_001_initial_schema.sql` (main schema)
  - `migrations/20260117200000_faction_names_fix.sql` (latest updates)

**src/app/**
- Purpose: Next.js App Router pages and API endpoints
- Contains: Page components, API route handlers, layouts
- Key patterns:
  - `[page]/page.tsx` - UI pages
  - `[page]/layout.tsx` - Layout wrappers
  - `api/[feature]/[action]/route.ts` - API endpoints
  - `auth/` - Authentication pages

**src/components/**
- Purpose: Reusable React components
- Contains: UI components, forms, widgets, modals
- Organization: Grouped by domain/feature
- Key files:
  - `Orb.tsx` - Main interactive sphere component
  - `dashboard/` - Dashboard widgets and modals
  - `finanzen/` - Finance-related components
  - `habits/` - Habit tracking components
  - `contacts/` - Contact management components

**src/lib/**
- Purpose: Business logic, data access, utilities
- Contains: Database layer, types, external integrations
- Subdirectories:
  - `data/` - Data access layer (queries and mutations)
  - `supabase/` - Supabase client configuration
  - `types/` - Custom TypeScript types
  - `ui/` - UI constants and utilities
  - `ai/` - AI integration (quest generation, chat)
  - `cron/` - Scheduled tasks
  - `export/` - Data export functionality
  - `import/` - Data import functionality

**src/hooks/**
- Purpose: Custom React hooks for common patterns
- Contains: useAuth, authentication handlers, custom hooks
- Key files:
  - `useAuth.ts` - Authentication state management

**src/contexts/**
- Purpose: React Context providers for global state
- Contains: Theme provider, sidebar state, other contexts
- Key patterns: Providers wrapping application

**src/__tests__/**
- Purpose: Unit and integration tests
- Contains: Test files for business logic, types, parsers
- Key files: `*.test.ts` files testing specific modules

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` - Root layout with providers
- `src/app/page.tsx` - Dashboard (main page)
- `middleware.ts` - Authentication middleware

**Configuration:**
- `.env` - Secret environment variables (not committed)
- `.env.example` - Template for required environment variables
- `next.config.ts` - Next.js settings (redirects configured here)
- `tsconfig.json` - TypeScript configuration

**Core Logic:**
- `src/lib/data/` - All data operations
- `src/lib/supabase/` - Supabase client instances
- `src/lib/database.types.ts` - Generated database type definitions
- `src/lib/xp.ts` - XP calculation system

**UI Components:**
- `src/components/index.ts` - Component barrel exports
- `src/components/dashboard/` - Main dashboard widgets
- `src/components/factions/` - Faction display components

**Testing:**
- `src/__tests__/xp.test.ts` - XP system tests
- `src/__tests__/habits-integration.test.ts` - Habit workflow tests
- `vitest.config.ts` - Test runner configuration

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `Orb.tsx`, `DomainForm.tsx`)
- Utility functions: camelCase (e.g., `getTotalSkillCount.ts`, `updateFactionStats.ts`)
- Data access functions: camelCase with descriptive names (e.g., `getHabits.ts`, `createDomain.ts`)
- API routes: kebab-case directories with `route.ts` file (e.g., `api/habits/create/route.ts`)
- Test files: same name as source + `.test.ts` (e.g., `xp.test.ts`)

**Directories:**
- Feature-based: `/koerper`, `/geist`, `/finanzen`, `/soziales` (German faction names)
- Component groups: `/dashboard`, `/components/habits`, `/components/finanzen`
- API endpoints: `/api/habits/create`, `/api/skills/xp` (nested by resource then action)
- Utilities: `/lib/data`, `/lib/supabase`, `/lib/ai`

**Exports & Imports:**
- Barrel exports: `index.ts` in component directories
- Absolute imports: `@/` alias for `src/` (configured in tsconfig.json)
- Data layer: Import from `src/lib/data/` for all database operations
- Components: Import from `src/components/` using absolute imports

## Where to Add New Code

**New Feature (Domain/Faction):**
1. Create page: `src/app/[faction-name]/page.tsx`
2. Create components: `src/components/[faction-name]/`
3. Create data access: `src/lib/data/[faction-name].ts`
4. Create API endpoints: `src/app/api/[faction-name]/[action]/route.ts`
5. Add tests: `src/__tests__/[feature-name].test.ts`

**New Component/UI:**
1. Create component file: `src/components/[name].tsx` (or subdirectory if part of feature)
2. Export from barrel: `src/components/[feature]/index.ts`
3. Use Tailwind classes and CSS variables for styling
4. Add Framer Motion for animations if interactive

**New API Endpoint:**
1. Create nested route: `src/app/api/[resource]/[action]/route.ts`
2. Authenticate user at start of handler
3. Call data access layer from `src/lib/data/`
4. Return JSON response with `NextResponse.json()`

**Database Changes:**
1. Create migration file: `supabase/migrations/[timestamp]_[description].sql`
2. Update `src/lib/database.types.ts` (auto-generated by Supabase CLI)
3. Add data access functions to `src/lib/data/`

**Utilities & Helpers:**
- Shared utilities: `src/lib/` (organize into subdirectories by domain)
- Business logic: `src/lib/data/` if data-related
- UI utilities: `src/lib/ui/`

**Tests:**
- Place test file in `src/__tests__/` with name matching source
- Use Vitest framework: `import { describe, it, expect } from 'vitest'`
- Test data access layer functions separately from UI

## Special Directories

**src/app/api/**
- Purpose: Server-side API endpoints
- Generated: No
- Committed: Yes
- Pattern: RESTful endpoints that handle authentication and data operations
- Each route: Starts with user authentication check, then calls data layer

**src/lib/data/**
- Purpose: Data access layer (REQUIRED for all DB operations)
- Generated: No
- Committed: Yes
- Pattern: Every function is async, handles errors gracefully, returns typed data
- NEVER access database directly from components - ALWAYS use these functions

**src/components/dashboard/**
- Purpose: Main dashboard UI widgets
- Generated: No
- Committed: Yes
- Pattern: Stateless widgets receiving data as props
- Modals subdirectory: Quick action modals (habits, mood, transactions)

**supabase/migrations/**
- Purpose: Versioned database schema changes
- Generated: No
- Committed: Yes
- Pattern: One migration file per change, timestamp-prefixed
- Never modify existing migrations - always create new ones

**.env (NOT COMMITTED)**
- Purpose: Store secrets (API keys, database URLs, auth keys)
- Generated: No
- Committed: NO (in .gitignore)
- Create from: `.env.example` template
- Required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

**src/lib/supabase/**
- Purpose: Supabase client instances
- Files:
  - `client.ts` - Browser client (public anon key)
  - `server.ts` - Server client (same as browser for SSR)
  - `admin.ts` - Admin client (service role key, bypasses RLS)
  - `index.ts` - Exports

## Import Path Patterns

**Within app (pages/routes):**
```typescript
import { getUserProfile } from '@/lib/data/user-skills';
import { Orb, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import type { SkillDomain } from '@/lib/database.types';
```

**Within components:**
```typescript
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getHabits } from '@/lib/data/habits';
import { createClient } from '@/lib/supabase/client';
```

**Within data layer:**
```typescript
import { createBrowserClient } from '@/lib/supabase';
import type { Habit, FactionWithStats } from '@/lib/database.types';
import { logActivity } from './activity-log';
```

---

*Structure analysis: 2026-01-22*
