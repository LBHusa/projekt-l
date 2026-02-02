# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
projekt-l/
├── src/
│   ├── app/                           # Next.js App Router pages & API
│   │   ├── page.tsx                   # Dashboard (main entry)
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── api/                       # API routes (business logic)
│   │   │   ├── ai/                    # AI chat & memory
│   │   │   ├── health/                # HP/prestige system
│   │   │   ├── habits/                # Habit tracking & completion
│   │   │   ├── quests/                # Quest generation & tracking
│   │   │   ├── skills/                # Skill management
│   │   │   ├── integrations/          # Telegram, Google Calendar, Health Import
│   │   │   ├── finanzen/              # Finance (accounts, transactions)
│   │   │   ├── contacts/              # Contact management
│   │   │   ├── factions/              # Life domain management
│   │   │   ├── profile/               # Avatar, user settings
│   │   │   ├── notifications/         # Push notifications
│   │   │   └── ...                    # Other domains (geist, koerper, etc.)
│   │   ├── koerper/                   # Body/Health domain page
│   │   ├── weisheit/                  # Knowledge domain page
│   │   ├── soziales/                  # Social domain page
│   │   ├── quests/                    # Quest system UI
│   │   ├── habits/                    # Habit tracker UI
│   │   ├── skill/[id]/                # Skill detail page
│   │   ├── contacts/                  # Contact list & management
│   │   ├── finanzen/                  # Finance dashboard
│   │   ├── ai-chat-demo/              # AI chat UI
│   │   ├── auth/                      # Login/signup pages
│   │   ├── onboarding/                # User onboarding flow
│   │   └── settings/                  # User preferences
│   │
│   ├── components/                    # React components (reusable)
│   │   ├── dashboard/                 # Dashboard widgets
│   │   │   ├── modals/                # QuickTransactionModal, HabitCompletionModal, etc.
│   │   │   └── ...                    # Specific widgets
│   │   ├── health/                    # Health bar, prestige, danger zone alerts
│   │   ├── currency/                  # Gold display, balance UI
│   │   ├── quests/                    # Quest cards, generation UI
│   │   ├── habits/                    # Habit widgets, trackers
│   │   ├── skills/                    # Skill tree, graph views
│   │   ├── ai/                        # AI chat interface components
│   │   ├── contacts/                  # Contact cards, birthdays, attention lists
│   │   ├── factions/                  # Life balance radar, faction stats
│   │   ├── character/                 # Character header, avatar
│   │   ├── ui/                        # Generic UI (buttons, modals, inputs)
│   │   ├── providers/                 # Context providers
│   │   ├── sidebars/                  # Navigation sidebar
│   │   ├── onboarding/                # Onboarding step components
│   │   └── shared/                    # Utilities (Loading, Modal, etc.)
│   │
│   ├── lib/
│   │   ├── data/                      # Data access layer (CRUD)
│   │   │   ├── health.ts              # HP, lives, prestige, health events
│   │   │   ├── currency.ts            # Gold, gems, transactions
│   │   │   ├── skills.ts              # User skills (CRUD)
│   │   │   ├── habits.ts              # Habit logs, streaks, completion
│   │   │   ├── quests.ts              # Quest CRUD & tracking
│   │   │   ├── domains.ts             # Skill domains & factions
│   │   │   ├── contacts.ts            # Contacts, birthdays, relationships
│   │   │   ├── factions.ts            # Faction stats & balancing
│   │   │   ├── finanzen.ts            # Accounts, transactions, budgets
│   │   │   ├── geist.ts               # Mood logs, mental health
│   │   │   ├── koerper.ts             # Body metrics, workouts
│   │   │   ├── activity-log.ts        # Recent activity feed
│   │   │   ├── achievements.ts        # Badge/achievement stats
│   │   │   ├── conversation-memory.ts # Chat message history
│   │   │   └── ...                    # Other domains
│   │   │
│   │   ├── ai/                        # AI integration & tools
│   │   │   ├── memory-rag.ts          # Qdrant semantic search
│   │   │   ├── skill-tools.ts         # Claude tools for skill management
│   │   │   ├── questGenerator.ts      # Quest generation prompts
│   │   │   ├── proactive-quest.ts     # Smart quest suggestions
│   │   │   ├── faction-suggester.ts   # Faction balancing recommendations
│   │   │   └── trial.ts               # Free trial/credit system
│   │   │
│   │   ├── cron/                      # Background job schedulers
│   │   │   ├── proactive-quest-scheduler.ts
│   │   │   ├── weekly-summary-scheduler.ts
│   │   │   ├── health-inactivity-scheduler.ts
│   │   │   ├── quest-expiry-scheduler.ts
│   │   │   ├── reminder-scheduler.ts
│   │   │   └── proactive-scheduler.ts
│   │   │
│   │   ├── supabase/                  # Database client setup
│   │   │   ├── client.ts              # Browser client (Supabase SSR)
│   │   │   ├── server.ts              # Server client (server components)
│   │   │   ├── admin.ts               # Service role client (webhooks)
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                     # Custom TypeScript types
│   │   │   ├── contacts.ts            # Contact type definitions
│   │   │   ├── notifications.ts       # Notification types
│   │   │   ├── health-import.ts       # Apple Health import types
│   │   │   └── streak-insurance.ts    # Streak insurance types
│   │   │
│   │   ├── database.types.ts          # Auto-generated Supabase schema types
│   │   ├── auth-helper.ts             # Auth utilities
│   │   ├── telegram.ts                # Telegram bot client & API
│   │   ├── telegram-ai.ts             # Telegram + AI integration
│   │   ├── telegram-codes.ts          # QR/token linking system
│   │   └── ...                        # Other utilities
│   │
│   ├── hooks/                         # React hooks
│   │   ├── use-auth.ts                # Current user & session
│   │   └── ...
│   │
│   ├── contexts/                      # React context providers
│   │   └── SidebarContext.tsx         # Navigation sidebar state
│   │
│   └── middleware.ts                  # Next.js middleware (auth, redirects)
│
├── supabase/
│   └── migrations/                    # SQL schema migrations
│       └── 20241226_001_initial_schema.sql
│
├── .planning/                         # GSD planning artifacts
│   └── codebase/                      # This directory
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript config
├── next.config.ts                     # Next.js config (redirects)
├── playwright.config.ts               # E2E test config
├── vitest.config.ts                   # Unit test config
└── .env.example                       # Environment variables template
```

## Directory Purposes

**`src/app/`**
- Purpose: Next.js App Router - defines routes and API endpoints
- Contains: Page components (.tsx), layout files, API route handlers
- Key files: `page.tsx` (dashboard), `layout.tsx` (root), `api/**` (endpoints)

**`src/components/`**
- Purpose: Reusable React components organized by feature domain
- Contains: UI components, forms, widgets, modals
- Namespaces: `dashboard/`, `health/`, `habits/`, `quests/`, `skills/`, `ai/`, etc.
- Pattern: Each domain has a directory with related components

**`src/lib/data/`**
- Purpose: Data access layer - encapsulates all database queries
- Contains: CRUD functions, each file represents a data domain
- Convention: Exported functions use camelCase (e.g., `getUserHealth()`, `createSkill()`)
- Pattern: Functions take userId param, use browser client or server client depending on context

**`src/lib/ai/`**
- Purpose: AI integration - Claude tools, Qdrant RAG, quest generation
- Contains: Tool definitions, prompts, memory management, schedulers
- Key: `memory-rag.ts` handles semantic search, `skill-tools.ts` exposes abilities to Claude

**`src/lib/cron/`**
- Purpose: Automated background tasks
- Contains: Scheduler initialization functions using node-cron
- Examples: Daily proactive quest suggestions, weekly summaries, health inactivity checks
- Startup: Called from API routes or server startup

**`src/lib/supabase/`**
- Purpose: Database client factory functions
- Contains: `client.ts` (browser), `server.ts` (server), `admin.ts` (service role)
- Usage: Import and call `createClient()` to get appropriate Supabase instance

**`src/lib/types/`**
- Purpose: Custom TypeScript interfaces not in auto-generated schema
- Contains: Complex types (contacts with stats, notifications, health import)
- Note: Most types auto-generated in `database.types.ts` from Supabase

**`src/hooks/`**
- Purpose: Reusable React hooks
- Contains: `use-auth.ts` for current user, others as needed
- Pattern: Custom hooks encapsulate stateful logic

**`src/contexts/`**
- Purpose: React Context providers for app-wide state
- Contains: `SidebarContext.tsx` for navigation state
- Usage: Wrap app in provider, use hook to access

**`supabase/migrations/`**
- Purpose: SQL schema definitions (source of truth for database)
- Contains: Migration files that define tables, functions, RLS policies
- Note: Auto-generated types in `database.types.ts` come from here

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Main dashboard (first page user sees)
- `src/app/layout.tsx`: Root layout with all providers
- `src/app/api/ai/chat/route.ts`: AI chat endpoint (POST)
- `src/app/api/integrations/telegram/webhook/route.ts`: Telegram webhook

**Configuration:**
- `tsconfig.json`: TypeScript config with `@/*` alias
- `next.config.ts`: Next.js redirects (old URLs → new URLs)
- `.env.example`: Required environment variables
- `package.json`: Dependencies and scripts

**Core Logic:**
- `src/lib/data/health.ts`: HP/prestige system
- `src/lib/data/currency.ts`: Gold/gem system
- `src/lib/data/habits.ts`: Habit tracking & streaks
- `src/lib/ai/skill-tools.ts`: Claude tool definitions (LARGE: 63KB)
- `src/lib/ai/memory-rag.ts`: Qdrant integration

**Authentication:**
- `src/middleware.ts`: Session check, redirect logic
- `src/lib/supabase/client.ts`: Browser auth client
- `src/lib/supabase/server.ts`: Server auth client
- `src/hooks/use-auth.ts`: Current user hook

**Integrations:**
- `src/app/api/integrations/telegram/`: Telegram bot & webhooks
- `src/app/api/integrations/google-calendar/`: Calendar sync
- `src/app/api/integrations/health-import/`: Apple Health webhook
- `src/lib/telegram.ts`: Telegram bot client

## Naming Conventions

**Files:**
- Pages: `page.tsx` (e.g., `src/app/page.tsx`, `src/app/quests/page.tsx`)
- API routes: `route.ts` (e.g., `src/app/api/habits/create/route.ts`)
- Components: PascalCase (e.g., `CharacterHeader.tsx`, `HealthBar.tsx`)
- Data layer: camelCase (e.g., `health.ts`, `habits.ts`)
- Hooks: camelCase with `use-` prefix (e.g., `use-auth.ts`)

**Directories:**
- Pages (App Router): snake-case, brackets for dynamic (e.g., `skill/[id]/`)
- Components: domain-based namespaces (e.g., `health/`, `habits/`, `dashboard/modals/`)
- Data: domain name (e.g., `data/health.ts`, `data/habits.ts`)

**Functions & Variables:**
- Data layer: `get*()`, `create*()`, `update*()`, `delete*()` (e.g., `getUserHealth()`)
- Components: Props interfaces suffixed with `Props` (e.g., `HealthBarProps`)
- Utilities: camelCase (e.g., `buildHybridContext()`, `storeConversationBatch()`)

**CSS Classes:**
- Tailwind utility classes (e.g., `flex`, `gap-4`, `bg-purple-500/20`)
- CSS variables via theme (e.g., `var(--accent-primary)`, `var(--background-secondary)`)

## Where to Add New Code

**New Feature (e.g., new domain like "Skills"):**
1. **Database:** Add migration in `supabase/migrations/`
2. **Types:** Auto-generate types from Supabase (or add custom in `src/lib/types/`)
3. **Data layer:** Create `src/lib/data/skills.ts` with CRUD functions
4. **API:** Create `src/app/api/skills/` with route handlers
   - `src/app/api/skills/create/route.ts` (POST)
   - `src/app/api/skills/[id]/route.ts` (GET, PUT, DELETE)
5. **Components:** Create `src/components/skills/` with feature components
6. **Page:** Create `src/app/skills/page.tsx` for the main UI
7. **Tests:** Add `src/app/skills/page.test.tsx` or `src/lib/data/skills.test.ts`

**New Component (e.g., SkillCard):**
1. Determine domain (e.g., `skills`, `habits`, `dashboard`)
2. Create file: `src/components/{domain}/{ComponentName}.tsx`
3. Define `interface {ComponentName}Props` for typing
4. Export component with 'use client' if uses hooks/interactivity
5. Use in appropriate page or other component

**New API Endpoint (e.g., POST /api/skills/train):**
1. Create directory: `src/app/api/skills/train/`
2. Create file: `src/app/api/skills/train/route.ts`
3. Implement POST handler: `export async function POST(request)`
4. Use server client: `const supabase = await createClient()`
5. Get authenticated user: `const { data: { user } } = await supabase.auth.getUser()`
6. Call data layer: `await updateSkillXp(user.id, skillId, xpGain)`
7. Return JSON response: `NextResponse.json(result)`

**New Scheduled Task (e.g., daily skill review):**
1. Create file: `src/lib/cron/skill-review-scheduler.ts`
2. Use node-cron: `cron.schedule('0 9 * * *', async () => { ... })`
3. Fetch users: `await getUsersForSkillReview()`
4. Process each: `for (const userId of users) { ... }`
5. Call data layer or API to update records
6. Log results: `console.log('[Skill Review] Completed X users')`
7. Import and start in: `src/app/api/cron/route.ts` or server startup

**New AI Tool (e.g., for quest suggestions):**
1. Define tool signature in `src/lib/ai/skill-tools.ts`:
   ```typescript
   {
     name: "suggest_quests",
     description: "Generate quest suggestions based on user activity",
     input_schema: { type: "object", properties: { ... }, required: [...] }
   }
   ```
2. Add handler in `executeSkillTool()` function
3. Import and use in `src/app/api/ai/chat/route.ts`
4. Update system prompt to document the tool

**Utilities (e.g., data formatting, validation):**
- Validation: `src/lib/validation/{domain}.ts`
- Helpers: `src/lib/{util-name}.ts` (e.g., `auth-helper.ts`, `telegram.ts`)
- UI utilities: `src/lib/ui/{util-name}.ts`

## Special Directories

**`.planning/`**
- Purpose: GSD (Guided Strategic Development) planning artifacts
- Generated: Yes, by GSD commands
- Committed: No (in .gitignore)
- Contents: Phase plans, analysis documents, work logs

**`supabase/migrations/`**
- Purpose: Version control for database schema
- Generated: No (manually written)
- Committed: Yes
- Contents: SQL files that define tables, RLS policies, functions

**`node_modules/`**
- Purpose: Dependencies installed by npm
- Generated: Yes (npm install)
- Committed: No (.gitignore)
- Contents: Third-party packages

---

*Structure analysis: 2026-02-02*
