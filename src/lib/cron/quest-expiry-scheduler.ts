// ============================================
// Projekt L - Quest Expiry Notification Scheduler
// Runs every hour to warn users 24h before quest expiry
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

// Quest type icons for notifications
const QUEST_TYPE_ICONS: Record<string, string> = {
  daily: '📅',
  weekly: '📆',
  story: '📖',
};

interface ExpiringQuest {
  id: string;
  user_id: string;
  type: string;
  title: string;
  expires_at: string;
}

interface UserSettings {
  user_id: string;
  push_enabled: boolean;
  push_subscription: any;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

/**
 * Calculate hours until quest expires
 */
function hoursUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Format remaining time for notification message
 */
function formatRemainingTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} Minuten`;
  } else if (hours < 24) {
    const h = Math.floor(hours);
    return h === 1 ? '1 Stunde' : `${h} Stunden`;
  } else {
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 Tag' : `${days} Tage`;
  }
}

/**
 * Check if current time is within user's quiet hours
 */
function isUserInQuietHours(settings: UserSettings): boolean {
  if (!settings.quiet_hours_enabled) return false;

  const timezone = settings.timezone || 'Europe/Berlin';
  const now = new Date();
  const currentTime = now.toLocaleTimeString('de-DE', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const quietStart = settings.quiet_hours_start;
  const quietEnd = settings.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }

  return currentTime >= quietStart && currentTime < quietEnd;
}

/**
 * Send expiry notification and mark quest as notified
 */
async function sendExpiryNotification(
  quest: ExpiringQuest,
  subscription: any,
  hoursRemaining: number
): Promise<boolean> {
  const icon = QUEST_TYPE_ICONS[quest.type] || '⚔️';
  const timeRemaining = formatRemainingTime(hoursRemaining);

  const payload = JSON.stringify({
    title: `${icon} Quest laeuft bald ab!`,
    body: `"${quest.title}" - noch ${timeRemaining} Zeit!`,
    url: '/quests',
    tag: `quest-expiry-${quest.id}`,
    renotify: false,
    data: {
      type: 'quest_expiry',
      questId: quest.id,
      questTitle: quest.title,
      expiresAt: quest.expires_at,
    },
  });

  try {
    ensureVapidConfigured();
    await webpush.sendNotification(subscription, payload);

    // Mark quest as notified
    await supabase
      .from('quests')
      .update({ expiry_notified_at: new Date().toISOString() })
      .eq('id', quest.id);

    console.log(`[Quest Expiry] Sent notification for quest: ${quest.title}`);
    return true;
  } catch (error: any) {
    console.error(`[Quest Expiry] Error sending notification for quest ${quest.id}:`, error.message);

    // Handle expired subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('notification_settings')
        .update({ push_enabled: false, push_subscription: null })
        .eq('user_id', quest.user_id);
    }
    return false;
  }
}

/**
 * Main function to check expiring quests and send notifications
 */
async function checkExpiringQuests(): Promise<void> {
  try {
    console.log('[Quest Expiry] Checking for expiring quests...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find active quests expiring within 24 hours that haven't been notified
    const { data: expiringQuests, error: questError } = await supabase
      .from('quests')
      .select('id, user_id, type, title, expires_at')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .is('expiry_notified_at', null)
      .lte('expires_at', in24Hours.toISOString())
      .gt('expires_at', now.toISOString());

    if (questError) {
      console.error('[Quest Expiry] Error fetching quests:', questError);
      return;
    }

    if (!expiringQuests || expiringQuests.length === 0) {
      console.log('[Quest Expiry] No expiring quests found');
      return;
    }

    console.log(`[Quest Expiry] Found ${expiringQuests.length} expiring quest(s)`);

    // Group quests by user
    const questsByUser = new Map<string, ExpiringQuest[]>();
    for (const quest of expiringQuests) {
      const userQuests = questsByUser.get(quest.user_id) || [];
      userQuests.push(quest);
      questsByUser.set(quest.user_id, userQuests);
    }

    // Process each user's expiring quests
    let sentCount = 0;
    let skippedCount = 0;

    for (const [userId, quests] of questsByUser) {
      // Get user's notification settings
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id, push_enabled, push_subscription, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
        .eq('user_id', userId)
        .single();

      // Get user's timezone from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', userId)
        .single();

      if (!settings?.push_enabled || !settings.push_subscription) {
        console.log(`[Quest Expiry] Push not enabled for user ${userId}`);
        skippedCount += quests.length;
        continue;
      }

      const userSettings: UserSettings = {
        ...settings,
        timezone: profile?.timezone || 'Europe/Berlin',
      };

      // Check quiet hours
      if (isUserInQuietHours(userSettings)) {
        console.log(`[Quest Expiry] Skipping user ${userId} (quiet hours)`);
        skippedCount += quests.length;
        continue;
      }

      // Send notification for each expiring quest
      for (const quest of quests) {
        const hoursRemaining = hoursUntilExpiry(quest.expires_at);
        const success = await sendExpiryNotification(quest, settings.push_subscription, hoursRemaining);
        if (success) {
          sentCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`[Quest Expiry] Check complete - Sent: ${sentCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('[Quest Expiry] Fatal error:', error);
  }
}

/**
 * Initialize the quest expiry notification scheduler
 * Runs every hour at minute 0
 */
export function initQuestExpiryScheduler(): void {
  // Run at the start of every hour
  cron.schedule('0 * * * *', () => {
    checkExpiringQuests();
  });

  console.log('[Quest Expiry] Scheduler initialized - Running every hour');
}
