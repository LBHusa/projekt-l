// ============================================
// HEALTH INACTIVITY CHECK API ROUTE
// Called by cron scheduler to apply HP damage for inactive users
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client (service role for cross-user operations)
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const INACTIVITY_THRESHOLD_DAYS = 3; // Days without activity before damage starts
const HP_DAMAGE_PER_DAY = 5;         // HP lost per day of inactivity
const MAX_HP_DAMAGE = 25;            // Maximum HP damage from inactivity (5 days)

export async function POST(request: NextRequest) {
  try {
    console.log('[Health Inactivity] Starting inactivity check...');

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVITY_THRESHOLD_DAYS);

    // Get all users with their last activity date from user_faction_stats
    // We check last_activity across all factions to find truly inactive users
    const { data: factionStats, error: queryError } = await adminClient
      .from('user_faction_stats')
      .select('user_id, last_activity')
      .not('last_activity', 'is', null);

    if (queryError) {
      console.error('[Health Inactivity] Error querying faction stats:', queryError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!factionStats || factionStats.length === 0) {
      console.log('[Health Inactivity] No users with activity records found');
      return NextResponse.json({ success: true, users_checked: 0, damage_applied: 0 });
    }

    // Get the MOST RECENT activity per user (across all factions)
    const userLastActivity = new Map<string, Date>();
    for (const stat of factionStats) {
      const activityDate = new Date(stat.last_activity);
      const existing = userLastActivity.get(stat.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(stat.user_id, activityDate);
      }
    }

    // Filter to users who have been inactive for 3+ days
    const inactiveUsers: { userId: string; daysSinceActivity: number }[] = [];
    for (const [userId, lastActivity] of userLastActivity) {
      if (lastActivity < thresholdDate) {
        const daysSinceActivity = Math.floor(
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );
        inactiveUsers.push({ userId, daysSinceActivity });
      }
    }

    console.log(`[Health Inactivity] Found ${inactiveUsers.length} inactive user(s)`);

    let damageApplied = 0;
    let usersProcessed = 0;

    for (const { userId, daysSinceActivity } of inactiveUsers) {
      // Check if user has user_health record and is not awaiting prestige
      const { data: health, error: healthError } = await adminClient
        .from('user_health')
        .select('awaiting_prestige')
        .eq('user_id', userId)
        .single();

      // Skip if user doesn't have health record or is awaiting prestige
      if (healthError) {
        // User might not have health record yet, skip
        console.log(`[Health Inactivity] Skipping user ${userId} - no health record`);
        continue;
      }

      if (health?.awaiting_prestige) {
        console.log(`[Health Inactivity] Skipping user ${userId} - awaiting prestige`);
        continue;
      }

      // Check if we already applied inactivity damage today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingEvent } = await adminClient
        .from('health_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'inactivity')
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (existingEvent && existingEvent.length > 0) {
        console.log(`[Health Inactivity] Skipping user ${userId} - already damaged today`);
        continue;
      }

      // Calculate damage: -5 HP per day inactive, max 25 HP
      const damage = Math.min(daysSinceActivity * HP_DAMAGE_PER_DAY, MAX_HP_DAMAGE);

      // Apply HP damage via apply_hp_change RPC
      const { error: hpError } = await adminClient.rpc('apply_hp_change', {
        p_user_id: userId,
        p_hp_change: -damage,
        p_event_type: 'inactivity',
        p_source_table: null,
        p_source_id: null,
        p_metadata: {
          days_inactive: daysSinceActivity,
          threshold_days: INACTIVITY_THRESHOLD_DAYS,
          damage_per_day: HP_DAMAGE_PER_DAY,
          max_damage: MAX_HP_DAMAGE
        }
      });

      if (hpError) {
        console.error(`[Health Inactivity] Failed to apply damage for user ${userId}:`, hpError);
      } else {
        console.log(`[Health Inactivity] Applied -${damage} HP to user ${userId} (${daysSinceActivity} days inactive)`);
        damageApplied++;
      }

      usersProcessed++;
    }

    console.log(`[Health Inactivity] Check complete - Processed: ${usersProcessed}, Damage applied: ${damageApplied}`);

    return NextResponse.json({
      success: true,
      users_checked: inactiveUsers.length,
      users_processed: usersProcessed,
      damage_applied: damageApplied,
      config: {
        threshold_days: INACTIVITY_THRESHOLD_DAYS,
        damage_per_day: HP_DAMAGE_PER_DAY,
        max_damage: MAX_HP_DAMAGE
      }
    });
  } catch (error) {
    console.error('[Health Inactivity] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
