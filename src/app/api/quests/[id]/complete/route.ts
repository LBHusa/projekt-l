/**
 * Complete Quest API
 * POST /api/quests/[id]/complete
 * Authenticates user from session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addXp, levelFromXp } from '@/lib/xp';

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

      // FIXED: Update faction stats using target_faction_ids array
      const targetFactionIds = quest.target_faction_ids || [];
      if (targetFactionIds.length > 0) {
        const xpPerFaction = Math.round(xpReward / targetFactionIds.length);
        for (const factionId of targetFactionIds) {
          try {
            const { data: factionStats } = await adminClient
              .from('user_faction_stats')
              .select('total_xp, weekly_xp, monthly_xp, level')
              .eq('user_id', userId)
              .eq('faction_id', factionId)
              .single();

            const oldTotalXp = factionStats?.total_xp || 0;
            const newTotalXp = oldTotalXp + xpPerFaction;
            const oldLevel = factionStats?.level || levelFromXp(oldTotalXp);
            const newLevel = levelFromXp(newTotalXp);
            const factionLeveledUp = newLevel > oldLevel;

            if (factionStats) {
              await adminClient
                .from('user_faction_stats')
                .update({
                  total_xp: newTotalXp,
                  weekly_xp: (factionStats.weekly_xp || 0) + xpPerFaction,
                  monthly_xp: (factionStats.monthly_xp || 0) + xpPerFaction,
                  level: newLevel,
                })
                .eq('user_id', userId)
                .eq('faction_id', factionId);
            } else {
              await adminClient
                .from('user_faction_stats')
                .insert({
                  user_id: userId,
                  faction_id: factionId,
                  total_xp: xpPerFaction,
                  weekly_xp: xpPerFaction,
                  monthly_xp: xpPerFaction,
                  level: newLevel,
                });
            }

            // Log faction level up if it occurred
            if (factionLeveledUp) {
              try {
                const { data: factionData } = await adminClient
                  .from('factions')
                  .select('name')
                  .eq('id', factionId)
                  .single();

                await adminClient.from('activity_log').insert({
                  user_id: userId,
                  activity_type: 'level_up',
                  faction_id: factionId,
                  title: `Fraktion Level Up! ${factionData?.name || factionId}`,
                  description: `Deine ${factionData?.name || factionId}-Fraktion ist jetzt Level ${newLevel}!`,
                  xp_amount: 0,
                  related_entity_type: 'faction',
                  related_entity_id: factionId,
                });
              } catch (err) {
                console.error('Error logging faction level up:', err);
              }
            }
          } catch (err) {
            console.error('Error updating faction stats for', factionId, ':', err);
          }
        }
      }

      // FIXED: Award XP to target skills
      const targetSkillIds = quest.target_skill_ids || [];
      if (targetSkillIds.length > 0) {
        const xpPerSkill = Math.round(xpReward / targetSkillIds.length);
        for (const skillId of targetSkillIds) {
          try {
            // Create experience entry for skill
            await adminClient.from('experiences').insert({
              user_id: userId,
              skill_id: skillId,
              description: `Quest abgeschlossen: ${quest.title}`,
              xp_gained: xpPerSkill,
              date: new Date().toISOString().split('T')[0],
            });

            // Update user_skills XP
            const { data: userSkill } = await adminClient
              .from('user_skills')
              .select('current_xp, level')
              .eq('user_id', userId)
              .eq('skill_id', skillId)
              .single();

            if (userSkill) {
              // Use unified level calculation from xp.ts
              const result = addXp(
                userSkill.level || 1,
                userSkill.current_xp || 0,
                xpPerSkill
              );
              await adminClient
                .from('user_skills')
                .update({
                  current_xp: result.newXp,
                  level: result.newLevel,
                  last_used: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('skill_id', skillId);

              // Log level up if it occurred
              if (result.leveledUp) {
                const { data: skillData } = await adminClient
                  .from('skills')
                  .select('name')
                  .eq('id', skillId)
                  .single();

                try {
                  await adminClient.from('activity_log').insert({
                    user_id: userId,
                    activity_type: 'level_up',
                    faction_id: targetFactionIds[0] || 'karriere',
                    title: `Level Up! ${skillData?.name || 'Skill'} ist jetzt Level ${result.newLevel}`,
                    description: `${skillData?.name || 'Skill'} hat Level ${result.newLevel} erreicht!`,
                    xp_amount: 0,
                    related_entity_type: 'skill',
                    related_entity_id: skillId,
                  });
                } catch (err) {
                  console.error('Error logging skill level up:', err);
                }
              }
            }
          } catch (err) {
            console.error('Error updating skill XP for', skillId, ':', err);
          }
        }
      }

      // Log activity
      try {
        const primaryFactionId = targetFactionIds[0] || 'karriere';
        await adminClient.from('activity_log').insert({
          user_id: userId,
          activity_type: 'quest_completed',
          faction_id: primaryFactionId,
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
