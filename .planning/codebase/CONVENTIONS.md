# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `AccountCard.tsx`, `CharacterHeader.tsx`)
- Utilities/Helpers: camelCase (e.g., `parsers.ts`, `xp.ts`)
- Data access layers: camelCase (e.g., `factions.ts`, `habits.ts`)
- Types: camelCase (e.g., `database.types.ts`)

**Functions:**
- Exported functions: camelCase starting with verb or noun (e.g., `calculateFactionLevel`, `getAllFactions`, `logHabitCompletion`)
- Async functions: camelCase with clear async intent (e.g., `getUserFactionStats`, `updateFactionStats`)
- Pure calculation functions: camelCase (e.g., `xpForLevel`, `progressToNextLevel`)
- Type guard functions: camelCase (e.g., `getUserIdOrCurrent`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for truly immutable values (e.g., `Familie_DOMAIN_ID`, `MAX_FACTION_LEVEL`)
- Component props: camelCase (e.g., `onClick`, `onAccountClick`, `avatarSeed`)
- State variables: camelCase (e.g., `domains`, `accounts`, `currentLevel`)

**Types:**
- Interfaces/Types: PascalCase (e.g., `AccountCardProps`, `DomainWithLevel`, `UserFactionStats`)
- Type aliases: PascalCase (e.g., `FactionId`, `AccountType`, `HabitFrequency`)
- Union types: PascalCase when exported (e.g., `MoodValue`, `ConnectionType`)

## Code Style

**Formatting:**
- No Prettier configuration file found (relies on ESLint defaults from Next.js)
- 2-space indentation (inferred from package configuration)
- Line wrapping: Follows ESLint/Next.js defaults
- String quotes: Single quotes preferred (observed in test files)

**Linting:**
- ESLint 9 with `eslint-config-next` for Next.js core rules
- Config file: `eslint.config.mjs` (flat config format)
- TypeScript strict mode enabled
- Includes Next.js web vitals and TypeScript rules
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. React and Next.js imports (e.g., `import { useState }`, `import Link from 'next/link'`)
2. Third-party library imports (e.g., `import { motion } from 'framer-motion'`, `import type { Faction }`)
3. Local imports from `@/lib` (e.g., `import { createBrowserClient } from '@/lib/supabase'`)
4. Local imports from `@/components` (e.g., `import CharacterHeader from '@/components/CharacterHeader'`)
5. Local imports from other paths (e.g., `import { getDomainStats } from '@/lib/data/user-skills'`)

**Path Aliases:**
- `@/*` resolves to `./src/*` (defined in `tsconfig.json`)
- Always use alias imports, never relative paths

**Type Imports:**
- Use `type` keyword for importing types (e.g., `import type { Faction, FactionId } from '@/lib/database.types'`)
- Type imports separated from value imports

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: Wrap fetch calls and async functions
- Error logging: Use `console.error()` with context before throwing or returning null
- Supabase errors: Check error codes (e.g., 'PGRST116' for not found) and handle gracefully
- Return null for missing data instead of throwing (e.g., `getFaction()` returns `Faction | null`)
- Throw errors for unexpected failures: RPC calls, initialization failures
- Default values: Provide fallback constants for UI state (e.g., `DEFAULT_ATTRIBUTES`, `DEFAULT_MENTAL_STATS`)

**Error Messages:**
- Console errors include context about what failed (e.g., "Error fetching factions:")
- User-facing errors localized to German (e.g., "CSV ist leer oder hat keine Daten")

## Logging

**Framework:** `console` object (console.error, console.log)

**Patterns:**
- Use `console.error()` for error conditions with context
- Log before throwing errors: `console.error('Error fetching user faction stats:', error); throw error;`
- No verbose logging in production-ready code
- Activity logging goes through dedicated function `logActivity()` in `@/lib/data/activity-log`

## Comments

**When to Comment:**
- Complex mathematical formulas with examples (e.g., XP calculations in `xp.ts`)
- Supabase query explanations (e.g., "Call the database function to upsert and recalculate level")
- Algorithm explanations (e.g., faction level calculation logic)
- Section dividers for major code blocks

**JSDoc/TSDoc:**
- Used extensively in data access functions
- Pattern: `/** descriptive comment */` above function signature
- Include parameter descriptions with `@param` where helpful
- Example from codebase: `/** Get user's stats for all factions */`

**Comment Style:**
- Use `//` for inline comments and explanations
- Use `// ============================================` for section dividers with descriptive text
- Comments in German and English mixed (German for user-facing, English for code)

## Function Design

**Size:**
- Data access functions: 10-30 lines (fetch + error handling + return)
- Pure calculation functions: 5-15 lines
- Component render functions: 40-100 lines (acceptable for complex components)

**Parameters:**
- Named destructuring for object parameters (seen in component props)
- Optional userId parameter with fallback: `userId?: string` with `await getUserIdOrCurrent(userId)`
- Default parameters for optional values (e.g., `xpForNextLevel = 1000`)

**Return Values:**
- Clear return types using TypeScript (e.g., `Promise<Faction[]>`, `Promise<UserFactionStats | null>`)
- Prefer returning objects with multiple values over tuples
- Return type annotations required for exported functions

## Module Design

**Exports:**
- Named exports for functions: `export function calculateFactionLevel(...)`
- Named exports for constants: `export const MAX_FACTION_LEVEL = 20`
- Mix of default and named exports acceptable
- Type-only exports: `export type { FactionId }` via imports

**Barrel Files:**
- Used in `@/components/dashboard` (index file collecting multiple components)
- Used in `@/lib/data` (data access layer organization)
- Single export per file is common for utilities

**File Organization by Layer:**
- `src/lib/` - Utilities and helpers (pure functions)
- `src/lib/data/` - Data access layer (database operations)
- `src/lib/import/` - Import/parsing utilities
- `src/components/` - React components
- `src/app/` - Next.js pages (App Router)
- `src/hooks/` - Custom React hooks
- `src/__tests__/` - Test files

## TypeScript Usage

**Type Strictness:**
- `strict: true` enabled in `tsconfig.json`
- All function parameters typed
- Return types explicit for exported functions
- Explicit type annotations for complex types

**Generated Types:**
- Database types auto-generated in `src/lib/database.types.ts`
- Based on Supabase schema
- Includes Row, Insert, Update types for each table
- Use generated types directly (e.g., `type Faction`, `type UserFactionStats`)

**Union Types:**
- Literal union types for enums (e.g., `AccountType = 'checking' | 'savings' | 'credit'`)
- FactionId type: union of specific faction keys
- Use satisfies operator when needed for type narrowing

## Client vs Server Components

**'use client' Directive:**
- Present in interactive components (e.g., `AccountCard.tsx`, `CharacterHeader.tsx`, `page.tsx`)
- Components with hooks use `'use client'`
- Data fetching components may be server or client depending on interactivity

**Async Server Functions:**
- Data access functions in `@/lib/data/` are async (call Supabase)
- Called from client components via `useEffect` or server components
- Error handling in both layers

---

*Convention analysis: 2026-01-22*
