// ============================================
// Projekt L - Notification Settings Data Layer
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  NotificationSettings,
  NotificationSettingsFormData,
  PushSubscriptionJSON,
} from '@/lib/types/notifications';

// Test-User ID (TODO: Replace with auth)
// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

/**
 * Get notification settings for current user
 */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', await getUserIdOrCurrent())
    .single();

  if (error) {
    // Wenn keine Settings existieren, ist das okay
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error loading notification settings:', error);
    throw error;
  }

  return data;
}

/**
 * Create notification settings for current user
 */
export async function createNotificationSettings(
  settings: Partial<NotificationSettingsFormData>
): Promise<NotificationSettings> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .insert({
      user_id: await getUserIdOrCurrent(),
      ...settings,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification settings:', error);
    throw error;
  }

  return data;
}

/**
 * Update notification settings for current user
 */
export async function updateNotificationSettings(
  updates: Partial<NotificationSettingsFormData>
): Promise<NotificationSettings> {
  const supabase = createBrowserClient();

  // Erst prüfen ob Settings existieren, sonst erstellen
  const existing = await getNotificationSettings();
  if (!existing) {
    return createNotificationSettings(updates);
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .update(updates)
    .eq('user_id', await getUserIdOrCurrent())
    .select()
    .single();

  if (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }

  return data;
}

/**
 * Save push subscription for current user
 */
export async function savePushSubscription(
  subscription: PushSubscriptionJSON
): Promise<NotificationSettings> {
  return updateNotificationSettings({
    push_enabled: true,
    push_subscription: subscription,
  } as unknown as Partial<NotificationSettingsFormData>);
}

/**
 * Remove push subscription for current user
 */
export async function removePushSubscription(): Promise<NotificationSettings> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .update({
      push_enabled: false,
      push_subscription: null,
    })
    .eq('user_id', await getUserIdOrCurrent())
    .select()
    .single();

  if (error) {
    console.error('Error removing push subscription:', error);
    throw error;
  }

  return data;
}

/**
 * Save Telegram chat ID for current user
 */
export async function saveTelegramChatId(
  chatId: string
): Promise<NotificationSettings> {
  return updateNotificationSettings({
    telegram_enabled: true,
    telegram_chat_id: chatId,
  } as unknown as Partial<NotificationSettingsFormData>);
}

/**
 * Remove Telegram connection for current user
 */
export async function removeTelegramConnection(): Promise<NotificationSettings> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .update({
      telegram_enabled: false,
      telegram_chat_id: null,
    })
    .eq('user_id', await getUserIdOrCurrent())
    .select()
    .single();

  if (error) {
    console.error('Error removing Telegram connection:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle birthday reminder day
 */
export async function toggleBirthdayReminderDay(
  day: number,
  enabled: boolean,
  currentDays: number[]
): Promise<NotificationSettings> {
  const newDays = enabled
    ? [...currentDays, day].sort((a, b) => b - a)
    : currentDays.filter((d) => d !== day);

  return updateNotificationSettings({
    birthday_days_before: newDays,
  });
}

/**
 * Update attention threshold
 */
export async function updateAttentionThreshold(
  days: number
): Promise<NotificationSettings> {
  return updateNotificationSettings({
    attention_threshold_days: days,
  });
}

/**
 * Update quiet hours
 */
export async function updateQuietHours(
  enabled: boolean,
  start?: string,
  end?: string
): Promise<NotificationSettings> {
  return updateNotificationSettings({
    quiet_hours_enabled: enabled,
    ...(start && { quiet_hours_start: start }),
    ...(end && { quiet_hours_end: end }),
  });
}
