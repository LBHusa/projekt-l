// ============================================
// CURRENCY DATA ACCESS
// Phase 3: Lebendiger Buddy - Gold System
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  UserCurrency,
  CurrencyTransaction,
  CurrencyTransactionType,
  StreakMilestoneAward,
} from '@/lib/database.types';

// ============================================
// BALANCE QUERIES
// ============================================

/**
 * Get user's current currency balance
 * Auto-initializes if no record exists (100 gold start)
 */
export async function getUserCurrency(userId?: string): Promise<UserCurrency> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_currency')
    .select('*')
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record - initialize via RPC
      const { data: balance } = await supabase.rpc('get_gold_balance', {
        p_user_id: resolvedUserId,
      });

      // Return default object
      return {
        user_id: resolvedUserId,
        gold: balance || 100,
        gems: 0,
        total_earned_gold: 0,
        total_earned_gems: 0,
        total_spent_gold: 0,
        total_spent_gems: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    console.error('Error fetching user currency:', error);
    throw error;
  }

  return data;
}

/**
 * Get just the gold balance (quick check)
 */
export async function getGoldBalance(userId?: string): Promise<number> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('get_gold_balance', {
    p_user_id: resolvedUserId,
  });

  if (error) {
    console.error('Error getting gold balance:', error);
    throw error;
  }

  return data || 100;
}

// ============================================
// TRANSACTION HISTORY
// ============================================

/**
 * Get recent transactions
 */
export async function getTransactionHistory(
  options: {
    limit?: number;
    offset?: number;
    currency?: 'gold' | 'gems';
    transactionType?: CurrencyTransactionType;
  } = {},
  userId?: string
): Promise<CurrencyTransaction[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  let query = supabase
    .from('currency_transactions')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false });

  if (options.currency) {
    query = query.eq('currency', options.currency);
  }

  if (options.transactionType) {
    query = query.eq('transaction_type', options.transactionType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transaction history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get transaction count
 */
export async function getTransactionCount(
  currency?: 'gold' | 'gems',
  userId?: string
): Promise<number> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  let query = supabase
    .from('currency_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', resolvedUserId);

  if (currency) {
    query = query.eq('currency', currency);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting transaction count:', error);
    throw error;
  }

  return count || 0;
}

// ============================================
// STREAK MILESTONE AWARDS
// ============================================

/**
 * Get all streak milestone awards for user
 */
export async function getStreakMilestoneAwards(
  habitId?: string,
  userId?: string
): Promise<StreakMilestoneAward[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  let query = supabase
    .from('streak_milestone_awards')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('awarded_at', { ascending: false });

  if (habitId) {
    query = query.eq('habit_id', habitId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching streak milestone awards:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// ADMIN / SYSTEM FUNCTIONS
// (These require service role in production)
// ============================================

/**
 * Add gold to user account (for internal use)
 * Note: In production, this should only be called from server-side
 */
export async function addGold(
  amount: number,
  transactionType: CurrencyTransactionType,
  description?: string,
  sourceTable?: string,
  sourceId?: string,
  userId?: string
): Promise<number> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('add_gold', {
    p_user_id: resolvedUserId,
    p_amount: amount,
    p_transaction_type: transactionType,
    p_description: description || null,
    p_source_table: sourceTable || null,
    p_source_id: sourceId || null,
  });

  if (error) {
    console.error('Error adding gold:', error);
    throw error;
  }

  return data;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get currency statistics for dashboard
 */
export async function getCurrencyStats(userId?: string): Promise<{
  gold: number;
  gems: number;
  totalEarned: number;
  totalSpent: number;
  recentTransactions: CurrencyTransaction[];
  streakBonuses: StreakMilestoneAward[];
}> {
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const [currency, transactions, streakBonuses] = await Promise.all([
    getUserCurrency(resolvedUserId),
    getTransactionHistory({ limit: 5 }, resolvedUserId),
    getStreakMilestoneAwards(undefined, resolvedUserId),
  ]);

  return {
    gold: currency.gold,
    gems: currency.gems,
    totalEarned: currency.total_earned_gold,
    totalSpent: currency.total_spent_gold,
    recentTransactions: transactions,
    streakBonuses,
  };
}
