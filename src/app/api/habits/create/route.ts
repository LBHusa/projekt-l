// ============================================
// HABIT CREATE API ROUTE
// Authenticates user from session
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { habitCreateSchema, sanitizeText } from '@/lib/validation';

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
    const rawInput = await request.json();
    const adminClient = createAdminClient();

    console.log('[createHabit API] Creating habit for user:', userId);

    // Transform legacy input to validation schema format
    const validationInput = {
      name: rawInput.name,
      description: rawInput.description,
      icon: rawInput.icon,
      xp_per_completion: rawInput.xpReward,
      frequency: rawInput.frequency || 'daily',
      habit_type: rawInput.isNegative ? 'negative' as const : 'positive' as const,
      factions: rawInput.factions?.map((f: { factionId: string; weight: number }) => ({
        faction_id: f.factionId,
        weight: f.weight,
      })) || [],
    };

    // Validate input
    const validation = habitCreateSchema.safeParse(validationInput);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Sanitize text fields
    const sanitized = {
      ...validation.data,
      name: sanitizeText(validation.data.name),
      description: validation.data.description
        ? sanitizeText(validation.data.description)
        : undefined,
    };

    const targetDays = rawInput.frequencyDays || [];

    // Get primary faction from input (first faction in the list)
    const primaryFactionId = sanitized.factions[0].faction_id;

    // Insert habit with faction_id
    const { data: habit, error: habitError } = await adminClient
      .from('habits')
      .insert({
        user_id: userId,
        name: sanitized.name,
        description: sanitized.description || null,
        icon: sanitized.icon || '✅',
        color: rawInput.color || '#10B981',
        habit_type: sanitized.habit_type,
        frequency: sanitized.frequency,
        target_days: targetDays,
        xp_per_completion: sanitized.xp_per_completion,
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
    if (sanitized.factions && sanitized.factions.length > 0) {
      const factionInserts = sanitized.factions.map((f) => ({
        habit_id: habit.id,
        faction_id: f.faction_id,
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
        faction_id: primaryFactionId,
        title: `${sanitized.icon || '✅'} Neuer Habit erstellt`,
        description: sanitized.name,
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
