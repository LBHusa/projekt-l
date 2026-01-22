import { z } from 'zod';

/**
 * Quest creation validation schema
 * Prevents XSS by rejecting < and > characters in text fields
 */
export const questCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .trim()
    .regex(/^[^<>]*$/, 'Title cannot contain < or >'),
  description: z
    .string()
    .max(2000, 'Description too long (max 2000 characters)')
    .trim()
    .optional(),
  xp_reward: z
    .number()
    .int('XP reward must be an integer')
    .min(1, 'XP reward must be at least 1')
    .max(10000, 'XP reward too high (max 10000)'),
  skill_id: z.string().uuid('Invalid skill ID format'),
  faction_id: z.string().uuid('Invalid faction ID format').optional(),
  due_date: z.string().datetime('Invalid date format').optional(),
});

/**
 * Quest update validation schema
 * All fields optional except id
 */
export const questUpdateSchema = z.object({
  id: z.string().uuid('Invalid quest ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .trim()
    .regex(/^[^<>]*$/, 'Title cannot contain < or >')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description too long (max 2000 characters)')
    .trim()
    .optional(),
  xp_reward: z
    .number()
    .int('XP reward must be an integer')
    .min(1, 'XP reward must be at least 1')
    .max(10000, 'XP reward too high (max 10000)')
    .optional(),
  skill_id: z.string().uuid('Invalid skill ID format').optional(),
  faction_id: z.string().uuid('Invalid faction ID format').optional(),
  due_date: z.string().datetime('Invalid date format').optional(),
  status: z.enum(['active', 'completed', 'failed']).optional(),
});

// Infer TypeScript types from schemas
export type QuestCreateInput = z.infer<typeof questCreateSchema>;
export type QuestUpdateInput = z.infer<typeof questUpdateSchema>;
