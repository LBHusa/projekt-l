// ============================================
// Projekt L - Habit Reminder Scheduler
// Runs every minute via node-cron
// ============================================

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:lukas@projekt-l.de',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DueReminder {
  reminder_id: string;
  habit_id: string;
  habit_name: string;
  habit_icon: string;
  user_id: string;
  reminder_time: string;
  push_subscription: any;
  timezone: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

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

/**
 * Get current day of week in lowercase (mon, tue, etc.)
 */
function getCurrentDayOfWeek(timezone: string): string {
  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayIndex = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getDay();
  return dayNames[dayIndex];
}

/**
 * Main function to check and send due reminders
 */
async function checkDueReminders(): Promise<void> {
  try {
    console.log('[Reminder Scheduler] Checking due reminders...');

    // Get all enabled reminders with habit and user info
    const { data: reminders, error } = await supabase
      .from('habit_reminders')
      .select(`
        id,
        habit_id,
        user_id,
        reminder_time,
        days_of_week,
        habits!inner (
          name,
          icon,
          is_active
        ),
        user_profiles!inner (
          timezone
        )
      `)
      .eq('enabled', true)
      .eq('habits.is_active', true);

    if (error) {
      console.error('[Reminder Scheduler] Error fetching reminders:', error);
      return;
    }

    if (!reminders || reminders.length === 0) {
      console.log('[Reminder Scheduler] No active reminders found');
      return;
    }

    console.log(`[Reminder Scheduler] Found ${reminders.length} active reminders`);

    // Process each reminder
    for (const reminder of reminders) {
      try {
        await processReminder(reminder);
      } catch (err) {
        console.error(`[Reminder Scheduler] Error processing reminder ${reminder.id}:`, err);
      }
    }

    console.log('[Reminder Scheduler] Check complete');
  } catch (error) {
    console.error('[Reminder Scheduler] Fatal error:', error);
  }
}

/**
 * Process a single reminder
 */
async function processReminder(reminder: any): Promise<void> {
  const timezone = reminder.user_profiles?.timezone || 'Europe/Berlin';
  const currentDay = getCurrentDayOfWeek(timezone);

  // Check if reminder should fire today
  if (!reminder.days_of_week.includes(currentDay)) {
    return;
  }

  // Get current time in user's timezone
  const now = new Date();
  const currentTime = now.toLocaleTimeString('de-DE', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Check if it's time to send (within current minute)
  const reminderTime = reminder.reminder_time.substring(0, 5); // HH:MM
  if (currentTime !== reminderTime) {
    return;
  }

  // Check if already sent in the last 2 minutes (prevent duplicates)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const { data: recentLog } = await supabase
    .from('reminder_delivery_log')
    .select('id')
    .eq('reminder_id', reminder.id)
    .gte('sent_at', twoMinutesAgo.toISOString())
    .limit(1)
    .single();

  if (recentLog) {
    console.log(`[Reminder Scheduler] Already sent reminder ${reminder.id} recently`);
    return;
  }

  // Get user's notification settings
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('push_enabled, push_subscription, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
    .eq('user_id', reminder.user_id)
    .single();

  if (!settings?.push_enabled || !settings.push_subscription) {
    console.log(`[Reminder Scheduler] Push not enabled for user ${reminder.user_id}`);
    return;
  }

  // Check quiet hours
  if (isQuietHours(
    settings.quiet_hours_enabled,
    settings.quiet_hours_start,
    settings.quiet_hours_end,
    timezone
  )) {
    console.log(`[Reminder Scheduler] Skipping reminder ${reminder.id} (quiet hours)`);
    return;
  }

  // Send push notification
  await sendReminderPush(
    reminder.id,
    reminder.habit_id,
    reminder.user_id,
    reminder.habits.name,
    reminder.habits.icon,
    settings.push_subscription
  );
}

/**
 * Send push notification for reminder
 */
async function sendReminderPush(
  reminderId: string,
  habitId: string,
  userId: string,
  habitName: string,
  habitIcon: string,
  subscription: any
): Promise<void> {
  const payload = JSON.stringify({
    title: `${habitIcon} ${habitName}`,
    body: 'Zeit für deine Gewohnheit!',
    url: '/habits',
    tag: `habit-reminder-${habitId}`,
    renotify: true,
    data: {
      type: 'habit_reminder',
      habitId,
      reminderId,
      actions: ['complete', 'snooze', 'view'],
    },
  });

  try {
    await webpush.sendNotification(subscription, payload);

    // Log successful delivery
    await supabase.from('reminder_delivery_log').insert({
      reminder_id: reminderId,
      habit_id: habitId,
      user_id: userId,
      scheduled_time: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      delivered: true,
    });

    console.log(`[Reminder Scheduler] Sent reminder for habit: ${habitName}`);
  } catch (error: any) {
    console.error('[Reminder Scheduler] Error sending push:', error);

    // Log failed delivery
    await supabase.from('reminder_delivery_log').insert({
      reminder_id: reminderId,
      habit_id: habitId,
      user_id: userId,
      scheduled_time: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      delivered: false,
      error_message: error.message,
      error_code: error.statusCode?.toString(),
    });

    // Handle expired subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('notification_settings')
        .update({ push_enabled: false, push_subscription: null })
        .eq('user_id', userId);
    }
  }
}

/**
 * Initialize the cron scheduler
 */
export function initReminderScheduler(): void {
  // Run every minute
  cron.schedule('* * * * *', () => {
    checkDueReminders();
  });

  console.log('[Reminder Scheduler] ✅ Initialized - Running every minute');
}
