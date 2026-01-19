// ============================================
// MOOD LOG API ROUTE
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
    const { mood, note } = await request.json();

    if (!mood) {
      return NextResponse.json(
        { error: 'mood is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Insert mood log
    const { data, error } = await adminClient
      .from('mood_logs')
      .insert({
        user_id: userId,
        mood,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving mood log:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Update faction stats
    const xpGained = data.xp_gained || 2;
    try {
      const { data: existingStats } = await adminClient
        .from('user_faction_stats')
        .select('total_xp, weekly_xp, monthly_xp')
        .eq('user_id', userId)
        .eq('faction_id', 'geist')
        .single();

      if (existingStats) {
        await adminClient
          .from('user_faction_stats')
          .update({
            total_xp: (existingStats.total_xp || 0) + xpGained,
            weekly_xp: (existingStats.weekly_xp || 0) + xpGained,
            monthly_xp: (existingStats.monthly_xp || 0) + xpGained,
          })
          .eq('user_id', userId)
          .eq('faction_id', 'geist');
      } else {
        await adminClient
          .from('user_faction_stats')
          .insert({
            user_id: userId,
            faction_id: 'geist',
            total_xp: xpGained,
            weekly_xp: xpGained,
            monthly_xp: xpGained,
          });
      }
    } catch (err) {
      console.error('Error updating faction stats:', err);
    }

    // Log activity
    try {
      const moodEmojis: Record<string, string> = {
        great: '😄',
        good: '🙂',
        okay: '😐',
        bad: '😔',
        terrible: '😢',
      };
      
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'xp_gained',
        faction_id: 'geist',
        title: `${moodEmojis[mood] || '😊'} Stimmung geloggt`,
        description: mood,
        xp_amount: xpGained,
        related_entity_type: 'mood_log',
        related_entity_id: data.id,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({ 
      success: true, 
      data,
      xpGained 
    });
  } catch (error) {
    console.error('Mood log API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '30');
    const daysBack = parseInt(searchParams.get('daysBack') || '30');

    const adminClient = createAdminClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await adminClient
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Mood log GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
