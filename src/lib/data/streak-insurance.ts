// ============================================
// Streak Insurance Token Data Layer
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  StreakInsuranceToken,
  UseTokenResult,
  TokenStats,
  TokenReason
} from '@/lib/types/streak-insurance';

/**
 * Get all available (unused, not expired) tokens for current user
 */
export async function getAvailableTokens(userId?: string): Promise<StreakInsuranceToken[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('streak_insurance_tokens')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) {
    console.error('Error fetching streak tokens:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get token statistics for current user
 */
export async function getTokenStats(userId?: string): Promise<TokenStats> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const now = new Date().toISOString();

  // Get all tokens to calculate stats
  const { data, error } = await supabase
    .from('streak_insurance_tokens')
    .select('is_used, expires_at')
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching token stats:', error);
    throw error;
  }

  const tokens = data || [];

  return {
    available: tokens.filter(t => !t.is_used && t.expires_at > now).length,
    used: tokens.filter(t => t.is_used).length,
    expired: tokens.filter(t => !t.is_used && t.expires_at <= now).length,
  };
}

/**
 * Use a token to protect a streak
 * Returns the used token or error if none available
 */
export async function useToken(habitId: string, userId?: string): Promise<UseTokenResult> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Find and use the oldest available token (FIFO)
  const { data: token, error } = await supabase
    .from('streak_insurance_tokens')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_for_habit_id: habitId,
    })
    .eq('user_id', resolvedUserId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'No tokens available' };
    }
    console.error('Error using streak token:', error);
    return { success: false, error: error.message };
  }

  return { success: true, token };
}

/**
 * Grant a new token to user (called by system/API)
 */
export async function grantToken(
  userId: string,
  reason: TokenReason,
  tokenType: 'standard' | 'premium' = 'standard',
  expiresInDays: number = 30
): Promise<StreakInsuranceToken> {
  const supabase = createBrowserClient();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from('streak_insurance_tokens')
    .insert({
      user_id: userId,
      token_type: tokenType,
      reason,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error granting streak token:', error);
    throw error;
  }

  return data;
}
