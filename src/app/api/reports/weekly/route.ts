import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FactionId } from '@/lib/database.types';
import { FACTION_COLORS, FACTIONS } from '@/lib/ui/constants';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface WeeklySummaryData {
  weeklyXp: number;
  habitsCompleted: number;
  achievementsUnlocked: number;
  topFaction: { id: FactionId; name: string; xp: number; icon: string } | null;
  factionBreakdown: { factionId: FactionId; name: string; xp: number; color: string; icon: string }[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const userId = TEST_USER_ID;

    // Calculate week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch data in parallel
    const [
      { data: factionStats },
      { data: activityLogs },
      { data: achievements },
    ] = await Promise.all([
      // Get faction stats with weekly_xp
      supabase
        .from('user_faction_stats')
        .select('faction_id, weekly_xp')
        .eq('user_id', userId),

      // Get this week's activity logs
      supabase
        .from('activity_log')
        .select('activity_type, xp_amount, faction_id')
        .eq('user_id', userId)
        .gte('occurred_at', weekStart.toISOString()),

      // Get achievements unlocked this week
      supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .gte('unlocked_at', weekStart.toISOString()),
    ]);

    // Calculate weekly XP from faction stats
    const weeklyXp = (factionStats || []).reduce((sum, stat) => sum + (stat.weekly_xp || 0), 0);

    // Count habits completed this week
    const habitsCompleted = (activityLogs || []).filter(
      log => log.activity_type === 'habit_completed'
    ).length;

    // Count achievements unlocked this week
    const achievementsUnlocked = (achievements || []).length;

    // Build faction breakdown
    const factionBreakdown = (factionStats || [])
      .map(stat => {
        const factionMeta = FACTIONS.find(f => f.id === stat.faction_id);
        return {
          factionId: stat.faction_id as FactionId,
          name: factionMeta?.name || stat.faction_id,
          xp: stat.weekly_xp || 0,
          color: FACTION_COLORS[stat.faction_id as FactionId] || '#6366F1',
          icon: factionMeta?.icon || '🎯',
        };
      })
      .filter(f => f.xp > 0)
      .sort((a, b) => b.xp - a.xp);

    // Determine top faction
    const topFaction = factionBreakdown.length > 0
      ? {
          id: factionBreakdown[0].factionId,
          name: factionBreakdown[0].name,
          xp: factionBreakdown[0].xp,
          icon: factionBreakdown[0].icon,
        }
      : null;

    const response: WeeklySummaryData = {
      weeklyXp,
      habitsCompleted,
      achievementsUnlocked,
      topFaction,
      factionBreakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Weekly summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly summary' },
      { status: 500 }
    );
  }
}
