import { z } from 'zod';

/**
 * Profile update validation schema
 * Prevents XSS by rejecting < and > characters in text fields
 */
export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name too long (max 50 characters)')
    .trim()
    .regex(/^[^<>]*$/, 'Display name cannot contain < or >'),
  bio: z
    .string()
    .max(500, 'Bio too long (max 500 characters)')
    .trim()
    .optional(),
  avatar_url: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
});

// Infer TypeScript type from schema
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
