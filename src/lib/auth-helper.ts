// ============================================
// Auth Helper - Get current user from Supabase
// Used by data layers for client-side auth
// ============================================

import { createBrowserClient } from '@/lib/supabase';

/**
 * Get current authenticated user ID from Supabase session
 * Throws error if not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Auth error in getCurrentUserId:', error);
    throw new Error('Not authenticated - please login');
  }
  
  return user.id;
}

/**
 * Get user ID - uses provided userId or fetches from session
 * This enables backward compatibility with existing code
 */
export async function getUserIdOrCurrent(providedUserId?: string): Promise<string> {
  if (providedUserId) {
    return providedUserId;
  }
  return getCurrentUserId();
}

/**
 * Get current user ID or return null if not authenticated
 * Use this when you want to gracefully handle unauthenticated state
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}
