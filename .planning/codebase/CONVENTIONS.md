# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Components: PascalCase with .tsx extension (e.g., `SkillForm.tsx`, `QuestList.tsx`)
- Pages: lowercase with hyphens for Next.js App Router (e.g., `/quests`, `/profile`, `/skill/[id]`)
- Data layer: lowercase with hyphens (e.g., `trainingslog.ts`, `skill-templates.ts`)
- API routes: lowercase with hyphens (e.g., `/api/quests`, `/api/skills`)
- Test files: Same name as source with `.test.ts` or `.spec.ts` suffix (e.g., `xp.test.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `getSkillsByDomain()`, `calculateFactionLevel()`)
- Async functions: camelCase (e.g., `getUserIdOrCurrent()`, `createCustomExercise()`)
- Hooks/React context: camelCase with "use" prefix for custom hooks (e.g., `useCallback`, `useState`)
- Event handlers: camelCase with "handle" prefix (e.g., `handleSubmit()`, `handleDelete()`)

**Variables:**
- Constants: SCREAMING_SNAKE_CASE for top-level, const values (e.g., `FACTION_ID = 'koerper'`, `MAX_LEVEL = 100`)
- Local variables: camelCase (e.g., `currentLevel`, `isSubmitting`)
- Boolean flags: camelCase with "is" or "has" prefix (e.g., `isOpen`, `hasError`, `showDeleteConfirm`)
- Form state: camelCase matching field name (e.g., `setName()`, `setIcon()`, `setIsSubmitting()`)

**Types & Interfaces:**
- Interfaces: PascalCase (e.g., `SkillFormProps`, `ModalProps`, `HabitFormData`)
- Type aliases: PascalCase (e.g., `MuscleGroup`, `SetType`, `ConnectionType`)
- Database types: Imported from `@/lib/database.types` and used directly (e.g., `Skill`, `Habit`, `Quest`)

**Database:**
- Column names: snake_case (e.g., `created_at`, `domain_id`, `faction_key`, `parent_skill_id`)
- Table names: lowercase plural (e.g., `skills`, `quests`, `habits`)

## Code Style

**Formatting:**
- No explicit formatter config file detected. Next.js defaults apply
- Imports typically grouped: React/Next imports → external libraries → relative imports
- Single quotes generally avoided, double quotes preferred
- Semicolons: Used throughout (standard TypeScript convention)

**Linting:**
- Tool: ESLint with `eslint-config-next` (flat config)
- Config file: `eslint.config.mjs` using new flat config format
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Rules enforced:
  - Core Web Vitals rules from Next.js
  - TypeScript best practices
  - React hooks rules (via `eslint-plugin-react-hooks`)
  - No console.warn/error in production (via Next.js config)

**Ignores:**
- `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order (observed):**
1. React/Next.js imports (e.g., `import { useState } from 'react'`)
2. Next.js utilities (e.g., `import { NextRequest, NextResponse }`)
3. External packages (e.g., `import { motion } from 'framer-motion'`)
4. Type imports (e.g., `import type { Skill } from '@/lib/database.types'`)
5. Relative imports (e.g., `import Modal from './Modal'`)
6. Inline utilities (e.g., `import { sanitizeHtml }` from local paths)

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- Used consistently throughout codebase: `@/lib`, `@/components`, `@/app`

**Example:**
```typescript
import { useState, useEffect } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { motion } from 'framer-motion';
import type { Skill, SkillWithDomain } from '@/lib/database.types';
import Modal from './Modal';
import { sanitizeHtml } from '@/lib/validation/sanitize';
```

## Error Handling

**Pattern: Try-Catch with Console Logging**
- Server routes use try-catch blocks with error logging
- Data layer functions log errors to console then return safe fallback
- Pattern: Log error → Return empty array/null → Let caller handle

**Examples:**
```typescript
// Data layer pattern
export async function getSkillsByDomain(domainId: string): Promise<Skill[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId);

  if (error) {
    console.error('Error fetching skills:', error);
    throw error; // OR return [];
  }
  return data || [];
}

// API route pattern
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of logic
  } catch (error) {
    console.error('Failed to fetch quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}
```

**Component Error Handling:**
- Try-catch in async handlers with `console.error()`
- State-based error display via modal or UI feedback
- Example from `SkillForm.tsx`:
```typescript
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await onSubmit({...});
    onClose();
  } catch (error) {
    console.error('Error saving skill:', error);
  } finally {
    setIsSubmitting(false);
  }
};
```

**Security Pattern:**
- Input validation using Zod schemas before processing
- Output sanitization using `DOMPurify` for HTML content
- See: `src/lib/validation/sanitize.ts` for `sanitizeHtml()` and `sanitizeText()`

## Logging

**Framework:** console (no special logger library)

**Patterns:**
- **console.error()**: For actual errors (failed DB queries, auth issues, exceptions)
- **console.log()**: Rarely used, avoided in favor of debugging via types
- **No console.warn()**: Not observed in codebase
- Errors logged with descriptive message (e.g., "Error fetching skills:", error)

**When to Log:**
- Database query failures in data layer
- API errors in route handlers
- Async operation failures in components (form submissions)
- Do NOT log during normal execution flow

## Comments

**When to Comment:**
- JSDoc blocks for exported functions and complex logic
- Inline comments for non-obvious algorithm logic
- Section dividers for related function groups (e.g., `// =============================================`)
- Observed in data layer modules like `src/lib/data/trainingslog.ts`

**JSDoc/TSDoc Usage:**
- Simple parameter descriptions before complex functions
- Example from `src/lib/xp.ts`:
```typescript
/**
 * Berechnet die benötigte XP für ein bestimmtes Level.
 * Formel: 100 * level^1.5 (exponentiell)
 *
 * Beispiele:
 * - Level 10:  3.162 XP
 * - Level 25: 12.500 XP
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}
```

- Used for:
  - Exported functions in utility modules
  - Complex algorithms
  - NOT enforced on trivial components
  - Comments can be in German or English

## Function Design

**Size:** Functions typically 20-80 lines
- Data layer queries: 10-30 lines (single concern)
- Components: 50-150 lines (with JSX)
- API routes: 30-60 lines (single HTTP method)
- Hooks: 20-50 lines if custom

**Parameters:**
- Named parameters preferred over positional (especially for optional args)
- Use object destructuring for options:
```typescript
export async function getExercisesByMuscleGroup(
  muscleGroup: MuscleGroup
): Promise<Exercise[]>

interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  defaultAccountId?: string;
}
```

**Return Values:**
- Async functions return `Promise<T>`
- Data layer returns arrays (empty array on error) or single items (null on error)
- API routes return `NextResponse` with proper status codes
- Components return `JSX.Element` or function returning JSX

## Module Design

**Exports:**
- Default exports for components (PascalCase): `export default function SkillForm(...)`
- Named exports for utilities and types: `export function xpForLevel()`
- Mixed used: Some components export interfaces alongside default component

**Barrel Files:**
- `src/lib/validation/index.ts` is a barrel file aggregating validation schemas
- `src/lib/data/index.ts` may aggregate data layer exports
- Not overused in components folder (each component is standalone)

**Data Layer Organization:**
- One module per domain (e.g., `trainingslog.ts`, `habits.ts`, `skills.ts`)
- Each module handles all DB operations for that domain
- Functions documented with JSDoc blocks
- Follows pattern: query → error check → return

**Component Organization:**
- One component per file (except shared UI components)
- Props interface defined in same file above component
- Prop interfaces suffixed with "Props" (e.g., `SkillFormProps`)
- Form data interfaces suffixed with "Data" (e.g., `SkillFormData`)

---

*Convention analysis: 2026-02-02*
