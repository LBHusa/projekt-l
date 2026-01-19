// ============================================
// FINANZEN ACCOUNT CREATE API ROUTE
// Authenticates user from session, uses admin client for insert
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const input = await request.json();
    const adminClient = createAdminClient();

    console.log('[createAccount API] Creating account for user:', userId);

    // Insert account with admin client (bypasses RLS)
    // Only include columns that exist in the accounts table
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .insert({
        user_id: userId,
        name: input.name,
        account_type: input.account_type || 'checking',
        current_balance: input.current_balance || 0,
        currency: input.currency || 'EUR',
        institution: input.institution || null,
        icon: input.icon || '💳',
        color: input.color || '#3B82F6',
        is_active: true,
        is_excluded_from_net_worth: input.is_excluded_from_net_worth || false,
        credit_limit: input.credit_limit || null,
        interest_rate: input.interest_rate || null,
      })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating account:', accountError);
      return NextResponse.json(
        { error: accountError.message },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'account_created',
        faction_id: 'finanzen',
        title: '💳 Neues Konto erstellt',
        description: input.name,
        xp_amount: 0,
        related_entity_type: 'account',
        related_entity_id: account.id,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({ 
      success: true, 
      data: account
    });
  } catch (error) {
    console.error('Account create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
