/**
 * Quest Suggestions API
 * GET /api/quests/suggestions - Get pending suggestions
 * POST /api/quests/suggestions - Accept/dismiss a suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending suggestions
    const { data, error } = await supabase
      .from('quest_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Quest Suggestions] Error:', error);
      return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data || [] });
  } catch (error) {
    console.error('[Quest Suggestions] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { suggestionId, action } = await request.json();

    if (!suggestionId || !['accept', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept suggestion - creates quest
      const { data, error } = await supabase.rpc('accept_quest_suggestion', {
        p_suggestion_id: suggestionId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('[Quest Suggestions] Accept error:', error);
        return NextResponse.json({ error: 'Failed to accept suggestion' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        questId: data,
        message: 'Quest erstellt!',
      });
    } else {
      // Dismiss suggestion
      const { error } = await supabase.rpc('dismiss_quest_suggestion', {
        p_suggestion_id: suggestionId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('[Quest Suggestions] Dismiss error:', error);
        return NextResponse.json({ error: 'Failed to dismiss suggestion' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Quest-Vorschlag abgelehnt',
      });
    }
  } catch (error) {
    console.error('[Quest Suggestions] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
