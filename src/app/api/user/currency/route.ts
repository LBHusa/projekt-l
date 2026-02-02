/**
 * Currency API
 * GET /api/user/currency
 *
 * Returns user's gold balance and statistics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrencyStats } from '@/lib/data/currency';

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get currency stats
    const stats = await getCurrencyStats(user.id);

    return NextResponse.json({
      gold: stats.gold,
      gems: stats.gems,
      totalEarned: stats.totalEarned,
      totalSpent: stats.totalSpent,
      recentTransactions: stats.recentTransactions,
      streakBonuses: stats.streakBonuses.length,
    });
  } catch (error) {
    console.error('[Currency API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get currency' },
      { status: 500 }
    );
  }
}
