// ============================================
// Habit Health Mapping API
// Manage workout-to-habit auto-complete mappings
// Phase 01-03: Health Import -> Habit Auto-Complete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/habits/health-mapping
 * List all health mappings for current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('habit_health_mappings')
      .select(`
        *,
        habits (
          id,
          name,
          icon
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Health Mapping API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }

    return NextResponse.json({ mappings: data || [] });
  } catch (error) {
    console.error('[Health Mapping API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/habits/health-mapping
 * Create a new health mapping
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { habitId, workoutType, minDurationMinutes = 0 } = body;

    if (!habitId || !workoutType) {
      return NextResponse.json(
        { error: 'habitId and workoutType are required' },
        { status: 400 }
      );
    }

    // Verify habit belongs to user
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Normalize workout type
    const normalizedType = workoutType.toLowerCase().replace(/[- ]/g, '_');

    // Create mapping
    const { data, error } = await supabase
      .from('habit_health_mappings')
      .insert({
        user_id: user.id,
        habit_id: habitId,
        health_workout_type: normalizedType,
        min_duration_minutes: minDurationMinutes,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Mapping already exists for this habit and workout type' },
          { status: 409 }
        );
      }
      console.error('[Health Mapping API] Error:', error);
      return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 });
    }

    return NextResponse.json({ mapping: data }, { status: 201 });
  } catch (error) {
    console.error('[Health Mapping API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/habits/health-mapping
 * Delete a health mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Delete mapping (RLS ensures user can only delete own)
    const { error } = await supabase
      .from('habit_health_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Health Mapping API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Health Mapping API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
