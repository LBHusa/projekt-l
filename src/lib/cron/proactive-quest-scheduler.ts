// ============================================
// Projekt L - Proactive Quest Generation Scheduler
// Phase 3: Lebendiger Buddy
// Generates quest suggestions for inactive factions
// Runs daily at 10:00 AM (after proactive reminders)
// ============================================

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { runProactiveQuestCheck, runMorningQuestCheck } from '@/lib/ai/proactive-quest';

// Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get users who should receive proactive quest suggestions
 */
async function getUsersForProactiveQuests(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_quest_preferences')
    .select('user_id')
    .eq('proactive_enabled', true);

  if (error) {
    console.error('[Proactive Quest Scheduler] Error fetching users:', error);
    return [];
  }

  // Also include users without preferences (default proactive enabled)
  const { data: allUsers, error: allError } = await supabase
    .from('user_profiles')
    .select('user_id');

  if (allError) {
    console.error('[Proactive Quest Scheduler] Error fetching all users:', allError);
    return (data || []).map(u => u.user_id);
  }

  // Combine: users with explicit prefs + users without prefs
  const usersWithPrefs = new Set((data || []).map(u => u.user_id));
  const allUserIds = (allUsers || []).map(u => u.user_id);

  return allUserIds.filter(id => {
    // Include if no prefs (default enabled) or explicitly enabled
    return usersWithPrefs.has(id) || !data?.find(p => p.user_id === id);
  });
}

/**
 * Get users for morning quest check
 */
async function getUsersForMorningQuests(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_quest_preferences')
    .select('user_id')
    .eq('morning_quests_enabled', true);

  if (error) {
    console.error('[Morning Quest Scheduler] Error fetching users:', error);
    return [];
  }

  return (data || []).map(u => u.user_id);
}

/**
 * Run proactive quest generation for all eligible users
 */
async function runProactiveQuestGeneration(): Promise<void> {
  console.log('[Proactive Quest Scheduler] Starting daily check...');

  try {
    const userIds = await getUsersForProactiveQuests();
    console.log(`[Proactive Quest Scheduler] Checking ${userIds.length} users`);

    let suggestionsCreated = 0;

    for (const userId of userIds) {
      try {
        const suggestionId = await runProactiveQuestCheck(userId);
        if (suggestionId) {
          suggestionsCreated++;
        }
      } catch (error) {
        console.error(`[Proactive Quest Scheduler] Error for user ${userId}:`, error);
      }

      // Rate limit - don't spam AI API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Proactive Quest Scheduler] Complete: ${suggestionsCreated} suggestions created`);
  } catch (error) {
    console.error('[Proactive Quest Scheduler] Fatal error:', error);
  }
}

/**
 * Run morning quest generation for eligible users
 */
async function runMorningQuestGeneration(): Promise<void> {
  console.log('[Morning Quest Scheduler] Starting morning check...');

  try {
    const userIds = await getUsersForMorningQuests();
    console.log(`[Morning Quest Scheduler] Checking ${userIds.length} users`);

    let suggestionsCreated = 0;

    for (const userId of userIds) {
      try {
        const suggestionId = await runMorningQuestCheck(userId);
        if (suggestionId) {
          suggestionsCreated++;
        }
      } catch (error) {
        console.error(`[Morning Quest Scheduler] Error for user ${userId}:`, error);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Morning Quest Scheduler] Complete: ${suggestionsCreated} suggestions created`);
  } catch (error) {
    console.error('[Morning Quest Scheduler] Fatal error:', error);
  }
}

/**
 * Initialize the proactive quest scheduler
 */
export function initProactiveQuestScheduler(): void {
  // Morning quests at 08:00 AM
  cron.schedule('0 8 * * *', () => {
    runMorningQuestGeneration();
  });

  // Proactive quest check at 10:30 AM (after proactive reminders)
  cron.schedule('30 10 * * *', () => {
    runProactiveQuestGeneration();
  });

  console.log('[Proactive Quest Scheduler] Initialized - Morning: 08:00, Proactive: 10:30');
}
