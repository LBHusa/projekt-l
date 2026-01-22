# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Next.js 14 Full-Stack Application with Gamification Features

**Key Characteristics:**
- Client-Server separation using Next.js App Router
- Supabase for authentication and database
- Data Access Layer pattern for all database operations
- Component-driven UI with Framer Motion animations
- Real-time synchronization through React hooks and state management (Zustand)
- Middleware-based authentication flow

## Layers

**Presentation Layer (UI):**
- Purpose: User interface and user interactions
- Location: `src/components/` and `src/app/`
- Contains: React components, pages, layouts
- Depends on: Data Layer hooks, stores, contexts
- Used by: Users accessing the application

**API Layer (Route Handlers):**
- Purpose: Server-side endpoints for client-server communication
- Location: `src/app/api/`
- Contains: POST/GET/PUT/DELETE route handlers
- Depends on: Data Access Layer, Supabase admin client
- Used by: Client-side pages and components

**Data Access Layer:**
- Purpose: Centralized database operations and data transformation
- Location: `src/lib/data/`
- Contains: Query functions, mutations, business logic
- Depends on: Database types, Supabase client
- Used by: API routes and client components

**Database Layer:**
- Purpose: Data persistence and schema
- Location: `supabase/migrations/` and Supabase PostgreSQL
- Contains: SQL schema, migrations, stored procedures
- Depends on: None (bottom layer)
- Used by: Supabase client in data access layer

**Authentication Layer:**
- Purpose: User session management and protected routes
- Location: `middleware.ts`, `src/lib/supabase/`, `src/hooks/useAuth.ts`
- Contains: Session handling, auth verification, route protection
- Depends on: Supabase Auth
- Used by: All protected pages and API routes

**Support Layers:**
- **Types:** `src/lib/database.types.ts`, `src/lib/types/`
- **Utilities:** `src/lib/ui/`, `src/lib/xp.ts`, `src/lib/telegram.ts`
- **External Services:** `src/lib/ai/`, Google Calendar integration, Telegram webhook handlers
- **Context & State:** `src/contexts/`, Zustand stores

## Data Flow

**User Authentication Flow:**

1. User navigates to protected page
2. `middleware.ts` intercepts request
3. Supabase SSR client checks session cookie
4. If authenticated: request proceeds to page/API
5. If not authenticated: redirect to `/auth/login`
6. Upon login: Supabase Auth sets session cookie
7. Page component uses `useAuth()` hook to get user context

**Data Read Flow:**

1. Client component or page renders
2. Uses effect hook or event handler to call data function from `src/lib/data/`
3. Data function creates browser/server Supabase client
4. Supabase client queries database (with RLS policies enforced)
5. Data transformed to match component types
6. Component state updated via setState or store
7. UI re-renders with new data

**Data Write Flow:**

1. User submits form or triggers action
2. Client calls API route or data mutation function
3. API route / data function authenticates user
4. Validates input data
5. Uses admin Supabase client to write to database (bypasses RLS for safe operations)
6. Logs activity to `activity_logs` table
7. Triggers side effects (XP updates, faction stats, achievements)
8. Returns success/error response
9. Client refetches data or updates local state

**XP & Progression System:**

1. User completes habit, quest, or skill training
2. System calculates XP earned based on domain and action
3. XP is stored in user_skills or faction_stats table
4. Level calculated using formula: `levelFromXp(totalXp)`
5. Achievements checked if level threshold crossed
6. Character attributes calculated from skill levels
7. Dashboard displays updated stats in real-time

## Key Abstractions

**Domain (SkillDomain):**
- Purpose: Top-level skill category (Körper, Geist, Finanzen, etc.)
- Location: `src/lib/data/domains.ts`, `supabase/migrations/`
- Pattern: Each domain has multiple factions with weighted contributions
- Types: `src/lib/database.types.ts` (SkillDomain interface)

**Faction:**
- Purpose: Sub-category within a domain that contributes to progression
- Location: `src/lib/data/factions.ts`
- Pattern: Factions have stats (XP, level) and skills
- Examples: `src/lib/data/` exports FactionId type with hardcoded faction IDs

**Skill (Hierarchical Tree):**
- Purpose: Granular learnable abilities with parent-child relationships
- Location: `src/lib/data/skills.ts`
- Pattern: Skills form directed acyclic graphs with optional prerequisites
- Connections: Defined in skills_connections table (prerequisite, synergy, related)

**User Skill Progression:**
- Purpose: Track individual user progress through skill trees
- Location: `src/lib/data/user-skills.ts`
- Pattern: user_skills table stores level, XP, and mastery for each skill per user

**Habit:**
- Purpose: Recurring actions that generate XP
- Location: `src/lib/data/habits.ts`
- Pattern: Habits linked to factions; completion triggers XP updates
- Frequency: daily, weekly, or monthly completion tracking

**Activity Log:**
- Purpose: Audit trail of user actions and XP changes
- Location: `src/lib/data/activity-log.ts`
- Pattern: Every XP-generating action logged with timestamp and metadata

## Entry Points

**Application Entry:**
- Location: `src/app/layout.tsx`
- Triggers: Browser initial load
- Responsibilities: Wraps all pages with ThemeProvider and SidebarProvider

**Dashboard Page (Main Hub):**
- Location: `src/app/page.tsx`
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Loads all dashboard data in parallel, displays character stats, quick actions, recent activity

**Authentication Pages:**
- Location: `src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx`
- Triggers: Unauthenticated user or manual navigation
- Responsibilities: Handle user signup/login via Supabase Auth

**Domain Pages:**
- Location: `src/app/domain/[id]/page.tsx`
- Triggers: User clicks on Orb component
- Responsibilities: Display skill tree for domain, manage skill progression

**Faction Pages:**
- Location: `src/app/{faction-name}/page.tsx` (e.g., `/koerper`, `/geist`, `/finanzen`)
- Triggers: User navigates to faction
- Responsibilities: Show faction-specific stats, skills, habits, charts

**API Routes:**
- Location: `src/app/api/[feature]/[action]/route.ts`
- Triggers: Fetch requests from client components
- Responsibilities: Authenticate, process request, return data or error

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages

**Patterns:**

1. **Database Operations:**
   ```typescript
   // In src/lib/data/*.ts
   try {
     const result = await supabase.from('table').select(...);
     if (error) {
       console.error('Error:', error);
       return null; // or throw
     }
     return result.data;
   } catch (error) {
     console.error('Error:', error);
     return null; // or []
   }
   ```

2. **API Routes:**
   ```typescript
   // In src/app/api/*/route.ts
   if (!user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   if (validationFails) {
     return NextResponse.json({ error: 'Bad request' }, { status: 400 });
   }
   ```

3. **Component Error Boundaries:**
   - Loading states: Skeleton components (`src/components/Loading.tsx`)
   - Error states: Error messages with fallback UI
   - Retry logic: Via user actions or automatic re-fetches

## Cross-Cutting Concerns

**Logging:**
- Browser: `console.log/error` for debugging
- Server: Activity logs stored in `activity_logs` table via `logActivity()` function

**Validation:**
- Client-side: Form validation in components
- Server-side: Schema validation in API routes using type guards
- Database: RLS policies in Supabase enforce data access control

**Authentication:**
- Middleware: `middleware.ts` protects routes via Supabase session
- API Routes: Each route verifies user via `createClient().auth.getUser()`
- Components: `useAuth()` hook provides user context

**State Management:**
- Component-level: React `useState` and `useEffect` hooks
- Global: Zustand stores (imported from contexts)
- Persistent: Supabase session stored in cookies

**UI Consistency:**
- Tailwind CSS for styling (`src/app/globals.css`)
- CSS Variables for theming: `--orb-glow`, `--accent-primary`, `--background-secondary`
- Framer Motion for animations across dashboard and interactive components

**Data Caching:**
- Browser: Component-level state (re-fetched on navigation or user action)
- Next.js: No server-side caching configured (all data fresh on request)

---

*Architecture analysis: 2026-01-22*
