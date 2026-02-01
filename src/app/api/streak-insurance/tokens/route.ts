// ============================================
// Streak Insurance Tokens API
// GET /api/streak-insurance/tokens
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Get available tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('streak_insurance_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true });

    if (tokensError) {
      console.error('[Streak Insurance API] Error fetching tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    // Get all tokens for stats
    const { data: allTokens, error: statsError } = await supabase
      .from('streak_insurance_tokens')
      .select('is_used, expires_at')
      .eq('user_id', user.id);

    if (statsError) {
      console.error('[Streak Insurance API] Error fetching stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch token stats' },
        { status: 500 }
      );
    }

    const stats = {
      available: (allTokens || []).filter(t => !t.is_used && t.expires_at > now).length,
      used: (allTokens || []).filter(t => t.is_used).length,
      expired: (allTokens || []).filter(t => !t.is_used && t.expires_at <= now).length,
    };

    return NextResponse.json({
      tokens: tokens || [],
      stats,
    });
  } catch (error) {
    console.error('[Streak Insurance API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
