import { z } from 'zod';

/**
 * Habit creation validation schema
 * Prevents XSS by rejecting < and > characters in text fields
 */
export const habitCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long (max 100 characters)')
    .trim()
    .regex(/^[^<>]*$/, 'Name cannot contain < or >'),
  description: z
    .string()
    .max(500, 'Description too long (max 500 characters)')
    .trim()
    .optional(),
  icon: z
    .string()
    .emoji('Invalid emoji')
    .optional(),
  xp_per_completion: z
    .number()
    .int('XP must be an integer')
    .min(1, 'XP must be at least 1')
    .max(1000, 'XP too high (max 1000)')
    .default(10),
  frequency: z.enum(['daily', 'weekly', 'custom'], 'Frequency must be daily, weekly, or custom'),
  habit_type: z.enum(['positive', 'negative'], 'Habit type must be positive or negative'),
  factions: z
    .array(
      z.object({
        faction_id: z.string().uuid('Invalid faction ID format'),
        weight: z
          .number()
          .min(0, 'Weight must be at least 0')
          .max(100, 'Weight too high (max 100)'),
      })
    )
    .min(1, 'At least one faction is required'),
});

/**
 * Habit update validation schema
 * All fields optional except id
 */
export const habitUpdateSchema = z.object({
  id: z.string().uuid('Invalid habit ID format'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long (max 100 characters)')
    .trim()
    .regex(/^[^<>]*$/, 'Name cannot contain < or >')
    .optional(),
  description: z
    .string()
    .max(500, 'Description too long (max 500 characters)')
    .trim()
    .optional(),
  icon: z.string().emoji('Invalid emoji').optional(),
  xp_per_completion: z
    .number()
    .int('XP must be an integer')
    .min(1, 'XP must be at least 1')
    .max(1000, 'XP too high (max 1000)')
    .optional(),
  frequency: z
    .enum(['daily', 'weekly', 'custom'], 'Frequency must be daily, weekly, or custom')
    .optional(),
  habit_type: z
    .enum(['positive', 'negative'], 'Habit type must be positive or negative')
    .optional(),
  factions: z
    .array(
      z.object({
        faction_id: z.string().uuid('Invalid faction ID format'),
        weight: z
          .number()
          .min(0, 'Weight must be at least 0')
          .max(100, 'Weight too high (max 100)'),
      })
    )
    .min(1, 'At least one faction is required')
    .optional(),
});

// Infer TypeScript types from schemas
export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
