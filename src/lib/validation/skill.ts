/**
 * Skill validation schemas
 */

import { z } from 'zod';

/**
 * Schema for adding XP to a skill
 */
export const skillXpSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID format'),
  xp: z
    .number()
    .int('XP must be a whole number')
    .positive('XP must be positive')
    .max(10000, 'XP cannot exceed 10,000 per request'),
  description: z.string().max(500, 'Description too long').optional(),
  factionOverride: z.string().optional(),
});

export type SkillXpInput = z.infer<typeof skillXpSchema>;

/**
 * Schema for creating a skill
 */
export const skillCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  icon: z.string().max(10, 'Icon too long').optional(),
  domainId: z.string().uuid('Invalid domain ID format'),
});

export type SkillCreateInput = z.infer<typeof skillCreateSchema>;
