// ============================================
// Projekt L - Proactive Reminder Scheduler
// Notifies users about neglected life domains (factions)
// Runs daily at 10:00 AM
// ============================================

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configure web-push lazily (only when needed)
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (!vapidConfigured && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:lukas@projekt-l.de',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }
}

// Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Faction metadata for notification messages
const FACTION_META: Record<string, { icon: string; name_de: string; motivational: string }> = {
  karriere: {
    icon: '💼',
    name_de: 'Karriere',
    motivational: 'Ein kleiner Schritt heute kann dein Karriereziel naeher bringen.',
  },
  hobbys: {
    icon: '🎨',
    name_de: 'Hobbys',
    motivational: 'Deine Hobbys geben dir Energie. Goenn dir Zeit dafuer!',
  },
  koerper: {
    icon: '🏃',
    name_de: 'Koerper',
    motivational: 'Dein Koerper ist dein wichtigstes Werkzeug. Beweg dich!',
  },
  geist: {
    icon: '🧠',
    name_de: 'Geist',
    motivational: 'Mentale Gesundheit ist genauso wichtig wie koerperliche.',
  },
  finanzen: {
    icon: '💰',
    name_de: 'Finanzen',
    motivational: 'Kleine Finanzentscheidungen heute zahlen sich morgen aus.',
  },
  soziales: {
    icon: '👥',
    name_de: 'Soziales',
    motivational: 'Kontakte pflegen macht gluecklich. Wer koennte sich freuen von dir zu hoeren?',
  },
  weisheit: {
    icon: '📚',
    name_de: 'Weisheit',
    motivational: 'Jeden Tag etwas Neues lernen haelt den Geist jung.',
  },
};

// Minimum days without activity to trigger notification
const NEGLECT_THRESHOLD_DAYS = 7;

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(
  quietHoursEnabled: boolean,
  quietStart: string,
  quietEnd: string,
  userTimezone: string
): boolean {
  if (!quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = now.toLocaleTimeString('de-DE', {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }

  return currentTime >= quietStart && currentTime < quietEnd;
}

interface NeglectedFaction {
  faction_id: string;
  days_since_activity: number;
}

/**
 * Find the most neglected faction for a user (7+ days without activity)
 */
async function findNeglectedFaction(userId: string): Promise<NeglectedFaction | null> {
  // Get all faction stats for user
  const { data: stats, error } = await supabase
    .from('user_faction_stats')
    .select('faction_id, last_activity')
    .eq('user_id', userId);

  if (error || !stats || stats.length === 0) {
    return null;
  }

  const now = new Date();
  let mostNeglected: NeglectedFaction | null = null;

  for (const stat of stats) {
    const lastActivity = stat.last_activity ? new Date(stat.last_activity) : null;

    // Calculate days since last activity
    let daysSince: number;
    if (!lastActivity) {
      // Never active - use a high value (but reasonable)
      daysSince = 30;
    } else {
      daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Only consider if above threshold
    if (daysSince >= NEGLECT_THRESHOLD_DAYS) {
      if (!mostNeglected || daysSince > mostNeglected.days_since_activity) {
        mostNeglected = {
          faction_id: stat.faction_id,
          days_since_activity: daysSince,
        };
      }
    }
  }

  return mostNeglected;
}

/**
 * Check if user was already notified about this faction today
 */
async function wasNotifiedToday(userId: string, factionId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('proactive_notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('faction_id', factionId)
    .gte('sent_at', `${today}T00:00:00Z`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Proactive Scheduler] Error checking notification log:', error);
    return true; // Err on the side of caution
  }

  return data !== null;
}

/**
 * Send push notification for neglected faction
 */
async function sendPushNotification(
  userId: string,
  factionId: string,
  daysNeglected: number,
  subscription: any
): Promise<boolean> {
  const meta = FACTION_META[factionId] || {
    icon: '❓',
    name_de: factionId,
    motivational: 'Zeit fuer etwas Neues!',
  };

  const payload = JSON.stringify({
    title: `${meta.icon} ${meta.name_de} vermisst dich!`,
    body: `${daysNeglected} Tage ohne Aktivitaet. ${meta.motivational}`,
    url: '/',
    tag: `proactive-${factionId}`,
    renotify: false,
    data: {
      type: 'proactive_reminder',
      factionId,
      daysNeglected,
    },
  });

  try {
    ensureVapidConfigured();
    await webpush.sendNotification(subscription, payload);

    // Log successful delivery
    await supabase.from('proactive_notification_log').insert({
      user_id: userId,
      faction_id: factionId,
      days_neglected: daysNeglected,
      notification_type: 'neglected_faction',
      channel: 'push',
      delivered: true,
    });

    console.log(`[Proactive Scheduler] Sent notification: ${meta.name_de} (${daysNeglected} days) to user ${userId.substring(0, 8)}...`);
    return true;
  } catch (error: any) {
    console.error('[Proactive Scheduler] Error sending push:', error);

    // Log failed delivery
    await supabase.from('proactive_notification_log').insert({
      user_id: userId,
      faction_id: factionId,
      days_neglected: daysNeglected,
      notification_type: 'neglected_faction',
      channel: 'push',
      delivered: false,
      error_message: error.message,
    });

    // Handle expired subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('notification_settings')
        .update({ push_enabled: false, push_subscription: null })
        .eq('user_id', userId);
    }

    return false;
  }
}

/**
 * Main function to check and send proactive reminders
 */
async function checkProactiveReminders(): Promise<void> {
  try {
    console.log('[Proactive Scheduler] Starting daily proactive reminder check...');

    // Get all users with push notifications enabled
    const { data: users, error } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        push_subscription,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        user_profiles!inner (
          timezone
        )
      `)
      .eq('push_enabled', true)
      .not('push_subscription', 'is', null);

    if (error) {
      console.error('[Proactive Scheduler] Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('[Proactive Scheduler] No users with push notifications enabled');
      return;
    }

    console.log(`[Proactive Scheduler] Checking ${users.length} users for neglected factions...`);

    let notificationsSent = 0;
    let usersSkipped = 0;

    for (const user of users) {
      try {
        // user_profiles is returned as array from join, take first element
        const userProfile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
        const timezone = userProfile?.timezone || 'Europe/Berlin';

        // Check quiet hours
        if (isQuietHours(
          user.quiet_hours_enabled,
          user.quiet_hours_start,
          user.quiet_hours_end,
          timezone
        )) {
          usersSkipped++;
          continue;
        }

        // Find most neglected faction
        const neglectedFaction = await findNeglectedFaction(user.user_id);
        if (!neglectedFaction) {
          continue; // No neglected factions - user is active!
        }

        // Check if already notified today
        if (await wasNotifiedToday(user.user_id, neglectedFaction.faction_id)) {
          continue;
        }

        // Send notification
        const sent = await sendPushNotification(
          user.user_id,
          neglectedFaction.faction_id,
          neglectedFaction.days_since_activity,
          user.push_subscription
        );

        if (sent) {
          notificationsSent++;
        }
      } catch (err) {
        console.error(`[Proactive Scheduler] Error processing user ${user.user_id}:`, err);
      }
    }

    console.log(`[Proactive Scheduler] Complete: ${notificationsSent} notifications sent, ${usersSkipped} users in quiet hours`);
  } catch (error) {
    console.error('[Proactive Scheduler] Fatal error:', error);
  }
}

/**
 * Initialize the proactive reminder scheduler
 * Runs daily at 10:00 AM server time
 */
export function initProactiveScheduler(): void {
  // Run at 10:00 AM every day
  cron.schedule('0 10 * * *', () => {
    checkProactiveReminders();
  });

  console.log('[Proactive Scheduler] Initialized - Running daily at 10:00 AM');
}
