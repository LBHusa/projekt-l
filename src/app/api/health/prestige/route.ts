import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/health/prestige
 *
 * Performs prestige reset when user confirms from PrestigeModal.
 * Requirements:
 * - User must be at 0 lives
 * - User must have awaiting_prestige = true
 *
 * Actions:
 * 1. Reset lives to 3, HP to 100
 * 2. Increment prestige_level
 * 3. Set awaiting_prestige to false
 * 4. Apply 10% XP penalty to all factions
 * 5. Log prestige event in health_events
 * 6. Grant Phoenix achievement badge
 * 7. Send notification
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's health record
    const { data: health, error: healthError } = await adminClient
      .from('user_health')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (healthError || !health) {
      console.error('Health record lookup failed:', healthError);
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    // Verify user is at 0 lives and awaiting prestige
    if (health.lives > 0 || !health.awaiting_prestige) {
      return NextResponse.json(
        { error: 'Prestige not available (must be at 0 lives and awaiting prestige)' },
        { status: 400 }
      );
    }

    // Calculate new prestige level
    const newPrestigeLevel = (health.prestige_level || 0) + 1;

    // Step 1: Reset lives and HP, increment prestige_level
    const { error: resetError } = await adminClient
      .from('user_health')
      .update({
        lives: 3,
        current_hp: 100,
        awaiting_prestige: false,
        prestige_level: newPrestigeLevel,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (resetError) {
      console.error('Failed to reset health:', resetError);
      return NextResponse.json({ error: 'Prestige reset failed' }, { status: 500 });
    }

    // Step 2: Apply 10% XP penalty to all factions
    // First get current faction stats
    const { data: factionStats, error: factionFetchError } = await adminClient
      .from('user_faction_stats')
      .select('id, faction_id, current_xp')
      .eq('user_id', user.id);

    if (!factionFetchError && factionStats && factionStats.length > 0) {
      // Apply 10% penalty to each faction
      const xpLossDetails: Record<string, { before: number; after: number; loss: number }> = {};

      for (const stat of factionStats) {
        const newXp = Math.floor(stat.current_xp * 0.9);
        const loss = stat.current_xp - newXp;

        xpLossDetails[stat.faction_id] = {
          before: stat.current_xp,
          after: newXp,
          loss: loss
        };

        await adminClient
          .from('user_faction_stats')
          .update({ current_xp: newXp })
          .eq('id', stat.id);
      }

      // Step 3: Log prestige event with XP loss details
      await adminClient.from('health_events').insert({
        user_id: user.id,
        event_type: 'prestige',
        hp_change: 0,
        metadata: {
          prestige_level: newPrestigeLevel,
          lives_restored: 3,
          hp_restored: 100,
          xp_penalty: xpLossDetails
        }
      });
    } else {
      // Log prestige without XP details if no faction stats
      await adminClient.from('health_events').insert({
        user_id: user.id,
        event_type: 'prestige',
        hp_change: 0,
        metadata: {
          prestige_level: newPrestigeLevel,
          lives_restored: 3,
          hp_restored: 100
        }
      });
    }

    // Step 4: Grant Phoenix achievement badge
    // Check if Phoenix achievement type exists, create user_achievement if so
    const { data: phoenixAchievement } = await adminClient
      .from('achievements')
      .select('id')
      .eq('achievement_key', 'phoenix_prestige')
      .single();

    if (phoenixAchievement) {
      // Update or insert user achievement
      const { data: existingUserAchievement } = await adminClient
        .from('user_achievements')
        .select('id, current_progress')
        .eq('user_id', user.id)
        .eq('achievement_id', phoenixAchievement.id)
        .single();

      if (existingUserAchievement) {
        // Increment progress
        await adminClient
          .from('user_achievements')
          .update({
            current_progress: newPrestigeLevel,
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUserAchievement.id);
      } else {
        // Create new user achievement
        await adminClient.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: phoenixAchievement.id,
          current_progress: newPrestigeLevel,
          is_unlocked: true,
          unlocked_at: new Date().toISOString()
        });
      }
    }

    // Step 5: Send notification via notification_log
    await adminClient.from('notification_log').insert({
      user_id: user.id,
      notification_type: 'custom',
      title: 'Phoenix-Prestige abgeschlossen',
      message: `Du wurdest als Prestige ${newPrestigeLevel} wiedergeboren. 3 Leben wiederhergestellt.`,
      data: { prestige_level: newPrestigeLevel },
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      prestige_level: newPrestigeLevel,
      lives: 3,
      current_hp: 100
    });
  } catch (error) {
    console.error('Prestige error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
