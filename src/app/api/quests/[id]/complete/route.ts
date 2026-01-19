/**
 * Complete Quest API
 * POST /api/quests/[id]/complete
 * Authenticates user from session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    const adminClient = createAdminClient();
    const params = await context.params;
    const questId = params.id;

    // Get quest details first
    const { data: quest, error: questError } = await adminClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Verify ownership
    if (quest.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (quest.status === 'completed') {
      return NextResponse.json({ error: 'Quest already completed' }, { status: 400 });
    }

    // Try to use the RPC function if it exists
    const { error: rpcError } = await adminClient.rpc('complete_quest', {
      p_quest_id: questId,
      p_user_id: userId,
    });

    if (rpcError) {
      console.error('RPC complete_quest failed, using fallback:', rpcError);
      
      // Fallback: manually update quest and award XP
      const { error: updateError } = await adminClient
        .from('quests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', questId);

      if (updateError) {
        throw updateError;
      }

      // Award XP to user profile
      const xpReward = quest.xp_reward || 50;
      try {
        const { data: profile } = await adminClient
          .from('user_profiles')
          .select('total_xp')
          .eq('user_id', userId)
          .single();

        if (profile) {
          await adminClient
            .from('user_profiles')
            .update({ total_xp: (profile.total_xp || 0) + xpReward })
            .eq('user_id', userId);
        }
      } catch (err) {
        console.error('Error updating user XP:', err);
      }

      // Update faction stats
      if (quest.faction_id) {
        try {
          const { data: factionStats } = await adminClient
            .from('user_faction_stats')
            .select('total_xp, weekly_xp, monthly_xp')
            .eq('user_id', userId)
            .eq('faction_id', quest.faction_id)
            .single();

          if (factionStats) {
            await adminClient
              .from('user_faction_stats')
              .update({
                total_xp: (factionStats.total_xp || 0) + xpReward,
                weekly_xp: (factionStats.weekly_xp || 0) + xpReward,
                monthly_xp: (factionStats.monthly_xp || 0) + xpReward,
              })
              .eq('user_id', userId)
              .eq('faction_id', quest.faction_id);
          } else {
            await adminClient
              .from('user_faction_stats')
              .insert({
                user_id: userId,
                faction_id: quest.faction_id,
                total_xp: xpReward,
                weekly_xp: xpReward,
                monthly_xp: xpReward,
              });
          }
        } catch (err) {
          console.error('Error updating faction stats:', err);
        }
      }

      // Log activity
      try {
        await adminClient.from('activity_log').insert({
          user_id: userId,
          activity_type: 'quest_completed',
          faction_id: quest.faction_id || 'karriere',
          title: 'Quest abgeschlossen: ' + quest.title,
          description: '+' + xpReward + ' XP',
          xp_amount: xpReward,
          related_entity_type: 'quest',
          related_entity_id: questId,
        });
      } catch (err) {
        console.error('Error logging activity:', err);
      }
    }

    // Fetch updated quest
    const { data: updatedQuest } = await adminClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Quest completed successfully!',
      quest: updatedQuest,
    });
  } catch (error) {
    console.error('Failed to complete quest:', error);
    return NextResponse.json(
      { error: 'Failed to complete quest' },
      { status: 500 }
    );
  }
}
