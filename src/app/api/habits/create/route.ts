// ============================================
// HABIT CREATE API ROUTE
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
    const adminClient = createAdminClient();

    console.log('[createHabit API] Creating habit for user:', userId);

    const habitType = input.isNegative ? 'negative' : 'positive';
    const targetDays = input.frequencyDays || [];
    
    // Get primary faction from input (first faction in the list)
    const primaryFactionId = input.factions?.[0]?.factionId || null;

    // Insert habit with faction_id
    const { data: habit, error: habitError } = await adminClient
      .from('habits')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description || null,
        icon: input.icon || '✅',
        color: input.color || '#10B981',
        habit_type: habitType,
        frequency: input.frequency || 'daily',
        target_days: targetDays,
        xp_per_completion: input.xpReward || 10,
        current_streak: 0,
        longest_streak: 0,
        total_completions: 0,
        is_active: true,
        faction_id: primaryFactionId, // Set primary faction for XP distribution
      })
      .select()
      .single();

    if (habitError) {
      console.error('Error creating habit:', habitError);
      return NextResponse.json(
        { error: habitError.message },
        { status: 500 }
      );
    }

    // Insert habit_factions for weighted distribution (if multiple factions)
    if (input.factions && Array.isArray(input.factions) && input.factions.length > 0) {
      const factionInserts = input.factions.map((f: { factionId: string; weight: number }) => ({
        habit_id: habit.id,
        faction_id: f.factionId,
        weight: f.weight,
      }));

      const { error: factionError } = await adminClient
        .from('habit_factions')
        .insert(factionInserts);

      if (factionError) {
        console.error('Error creating habit factions:', factionError);
      }
    }

    // Log activity
    try {
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'habit_created',
        faction_id: primaryFactionId || 'karriere',
        title: `${input.icon || '✅'} Neuer Habit erstellt`,
        description: input.name,
        xp_amount: 0,
        related_entity_type: 'habit',
        related_entity_id: habit.id,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({ 
      success: true, 
      data: habit
    });
  } catch (error) {
    console.error('Habit create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
