// ============================================
// SKILL XP API ROUTE
// Authenticates user from session
// Handles: XP add, experience logging, faction distribution
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addXp } from '@/lib/xp';

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
    const { skillId, xp, description, factionOverride } = input;

    if (!skillId || !xp) {
      return NextResponse.json(
        { error: 'skillId and xp are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Get or create user_skill record
    let { data: existingSkill, error: fetchError } = await adminClient
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Skill XP] Error fetching user skill:', fetchError);
      return NextResponse.json({ error: 'Failed to update skill XP' }, { status: 500 });
    }

    let userSkill;
    let leveledUp = false;

    if (existingSkill) {
      const result = addXp(existingSkill.level, existingSkill.current_xp, xp);
      leveledUp = result.leveledUp;

      const { data, error } = await adminClient
        .from('user_skills')
        .update({
          current_xp: result.newXp,
          level: result.newLevel,
          last_used: new Date().toISOString(),
        })
        .eq('id', existingSkill.id)
        .select()
        .single();

      if (error) {
        console.error('[Skill XP] Error updating user skill:', error);
        return NextResponse.json({ error: 'Failed to update skill XP' }, { status: 500 });
      }
      userSkill = data;
    } else {
      const result = addXp(1, 0, xp);
      leveledUp = result.leveledUp;

      const { data, error } = await adminClient
        .from('user_skills')
        .insert({
          user_id: userId,
          skill_id: skillId,
          current_xp: result.newXp,
          level: result.newLevel,
        })
        .select()
        .single();

      if (error) {
        console.error('[Skill XP] Error creating user skill:', error);
        return NextResponse.json({ error: 'Failed to update skill XP' }, { status: 500 });
      }
      userSkill = data;
    }

    // 2. Get skill info for faction determination
    const { data: skillInfo } = await adminClient
      .from('skills')
      .select('name, icon, domain_id')
      .eq('id', skillId)
      .single();

    // 3. Get faction from domain (or use override)
    let factionId = factionOverride;
    if (!factionId && skillInfo?.domain_id) {
      const { data: domainFaction } = await adminClient
        .from('skill_domain_factions')
        .select('faction_id')
        .eq('domain_id', skillInfo.domain_id)
        .eq('is_primary', true)
        .single();
      
      if (domainFaction) {
        factionId = domainFaction.faction_id;
      } else {
        const { data: domainData } = await adminClient
          .from('skill_domains')
          .select('faction_key')
          .eq('id', skillInfo.domain_id)
          .single();
        factionId = domainData?.faction_key || 'karriere';
      }
    }

    // 4. Create experience entry
    let experience = null;
    if (description) {
      const { data: exp, error: expError } = await adminClient
        .from('experiences')
        .insert({
          user_id: userId,
          skill_id: skillId,
          description,
          xp_gained: xp,
          date: new Date().toISOString().split('T')[0],
          faction_id: factionId,
          faction_override: factionOverride ? true : false,
        })
        .select()
        .single();

      if (expError) {
        console.error('Error creating experience:', expError);
      } else {
        experience = exp;
      }
    }

    // 5. Update user profile total XP
    try {
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      if (profile) {
        await adminClient
          .from('user_profiles')
          .update({ total_xp: (profile.total_xp || 0) + xp })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error updating user profile XP:', err);
    }

    // 6. Update faction stats
    let factionLeveledUp = false;
    const xpDistribution: Array<{faction_id: string, xp_distributed: number}> = [];

    if (factionId) {
      try {
        const { data: factionStats } = await adminClient
          .from('user_faction_stats')
          .select('*')
          .eq('user_id', userId)
          .eq('faction_id', factionId)
          .single();

        const beforeLevel = factionStats?.level || 1;

        if (factionStats) {
          const newTotalXp = (factionStats.total_xp || 0) + xp;
          const newLevel = calculateFactionLevel(newTotalXp);
          
          await adminClient
            .from('user_faction_stats')
            .update({
              total_xp: newTotalXp,
              weekly_xp: (factionStats.weekly_xp || 0) + xp,
              monthly_xp: (factionStats.monthly_xp || 0) + xp,
              level: newLevel,
            })
            .eq('user_id', userId)
            .eq('faction_id', factionId);

          factionLeveledUp = newLevel > beforeLevel;
        } else {
          const newLevel = calculateFactionLevel(xp);
          await adminClient
            .from('user_faction_stats')
            .insert({
              user_id: userId,
              faction_id: factionId,
              total_xp: xp,
              weekly_xp: xp,
              monthly_xp: xp,
              level: newLevel,
            });
          factionLeveledUp = newLevel > 1;
        }

        xpDistribution.push({ faction_id: factionId, xp_distributed: xp });
      } catch (err) {
        console.error('Error updating faction stats:', err);
      }
    }

    // 7. Log activity
    try {
      const iconEmoji = skillInfo?.icon || '⭐';
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'xp_gained',
        faction_id: factionId || 'karriere',
        title: iconEmoji + ' +' + xp + ' XP',
        description: skillInfo?.name || 'Skill',
        xp_amount: xp,
        related_entity_type: 'skill',
        related_entity_id: skillId,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    // 8. Log level up if it occurred
    if (leveledUp && userSkill) {
      try {
        await adminClient.from('activity_log').insert({
          user_id: userId,
          activity_type: 'level_up',
          faction_id: factionId || 'karriere',
          title: `Level Up! ${skillInfo?.name || 'Skill'} ist jetzt Level ${userSkill.level}`,
          description: `${skillInfo?.name || 'Skill'} hat Level ${userSkill.level} erreicht!`,
          xp_amount: 0,
          related_entity_type: 'skill',
          related_entity_id: skillId,
        });
      } catch (err) {
        console.error('Error logging skill level up:', err);
      }
    }

    // 9. Log faction level up if it occurred
    if (factionLeveledUp && factionId) {
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
          description: `Deine ${factionData?.name || factionId}-Fraktion ist aufgestiegen!`,
          xp_amount: 0,
          related_entity_type: 'faction',
          related_entity_id: factionId,
        });
      } catch (err) {
        console.error('Error logging faction level up:', err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        userSkill,
        experience,
        leveledUp,
        factionId,
        factionLeveledUp,
        xpDistribution,
      }
    });
  } catch (error) {
    console.error('Skill XP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateFactionLevel(xp: number): number {
  let level = 1;
  let xpNeeded = 100;
  let totalXp = 0;
  
  while (totalXp + xpNeeded <= xp) {
    totalXp += xpNeeded;
    level++;
    xpNeeded = Math.floor(100 * Math.pow(level, 1.5));
  }
  
  return level;
}
