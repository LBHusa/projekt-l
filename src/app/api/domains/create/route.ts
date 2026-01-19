// ============================================
// DOMAIN CREATE API ROUTE
// Authenticates user from session
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

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Get max display_order
    const { data: maxOrderData } = await adminClient
      .from('skill_domains')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    // Insert domain into skill_domains
    const { data: domain, error: domainError } = await adminClient
      .from('skill_domains')
      .insert({
        name: input.name,
        description: input.description || null,
        icon: input.icon || '🎯',
        color: input.color || '#6366f1',
        display_order: nextOrder,
        created_by: userId,
        is_template: false,
      })
      .select()
      .single();

    if (domainError) {
      console.error('Error creating domain:', domainError);
      return NextResponse.json(
        { error: domainError.message },
        { status: 500 }
      );
    }

    // Insert domain_factions if provided
    if (input.factions && Array.isArray(input.factions) && input.factions.length > 0) {
      const factionInserts = input.factions.map((f: { factionId: string; weight: number }, index: number) => ({
        domain_id: domain.id,
        faction_id: f.factionId,
        weight: f.weight,
        is_primary: index === 0,
      }));

      const { error: factionError } = await adminClient
        .from('skill_domain_factions')
        .insert(factionInserts);

      if (factionError) {
        console.error('Error creating domain factions:', factionError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: domain
    });
  } catch (error) {
    console.error('Domain create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
