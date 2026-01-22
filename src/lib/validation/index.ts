/**
 * Validation schemas and utilities
 *
 * This module exports Zod validation schemas for input validation
 * and sanitization utilities for XSS prevention.
 */

// Quest validation
export {
  questCreateSchema,
  questUpdateSchema,
  type QuestCreateInput,
  type QuestUpdateInput,
} from './quest';

// Habit validation
export {
  habitCreateSchema,
  habitUpdateSchema,
  type HabitCreateInput,
  type HabitUpdateInput,
} from './habit';

// Profile validation
export {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from './profile';

// Sanitization utilities (will be added in Task 3)
export {
  sanitizeHtml,
  sanitizeText,
  isSafeInput,
} from './sanitize';
