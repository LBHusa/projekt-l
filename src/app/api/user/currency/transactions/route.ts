/**
 * Currency Transactions API
 * GET /api/user/currency/transactions
 *
 * Returns paginated transaction history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTransactionHistory, getTransactionCount } from '@/lib/data/currency';
import type { CurrencyTransactionType } from '@/lib/database.types';

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const currency = searchParams.get('currency') as 'gold' | 'gems' | undefined;
    const type = searchParams.get('type') as CurrencyTransactionType | undefined;

    // Get transactions and count
    const [transactions, total] = await Promise.all([
      getTransactionHistory({
        limit: Math.min(limit, 100),
        offset,
        currency: currency || undefined,
        transactionType: type || undefined,
      }, user.id),
      getTransactionCount(currency || undefined, user.id),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    });
  } catch (error) {
    console.error('[Currency Transactions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
