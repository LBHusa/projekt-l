// ============================================
// Projekt L - Habit Reminders Data Layer
// ============================================

import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface HabitReminder {
  id: string;
  habit_id: string;
  user_id: string;
  reminder_time: string; // TIME format "HH:MM:SS"
  enabled: boolean;
  days_of_week: string[]; // ['mon', 'tue', ...]
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitReminderInput {
  habit_id: string;
  reminder_time: string; // "HH:MM" or "HH:MM:SS"
  days_of_week?: string[];
  label?: string;
  enabled?: boolean;
}

/**
 * Get all reminders for a habit
 */
export async function getHabitReminders(
  habitId: string
): Promise<HabitReminder[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_reminders')
    .select('*')
    .eq('habit_id', habitId)
    .order('reminder_time');

  if (error) {
    console.error('Error fetching habit reminders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all reminders for current user
 */
export async function getUserReminders(
  userId: string = TEST_USER_ID
): Promise<HabitReminder[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('reminder_time');

  if (error) {
    console.error('Error fetching user reminders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new habit reminder
 */
export async function createHabitReminder(
  input: CreateHabitReminderInput,
  userId: string = TEST_USER_ID
): Promise<HabitReminder> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_reminders')
    .insert({
      habit_id: input.habit_id,
      user_id: userId,
      reminder_time: input.reminder_time,
      days_of_week: input.days_of_week || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      label: input.label || null,
      enabled: input.enabled ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating habit reminder:', error);
    throw error;
  }

  return data;
}

/**
 * Update a habit reminder
 */
export async function updateHabitReminder(
  reminderId: string,
  updates: Partial<CreateHabitReminderInput>
): Promise<HabitReminder> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_reminders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating habit reminder:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle reminder enabled/disabled
 */
export async function toggleHabitReminder(
  reminderId: string,
  enabled: boolean
): Promise<HabitReminder> {
  return updateHabitReminder(reminderId, { enabled });
}

/**
 * Delete a habit reminder
 */
export async function deleteHabitReminder(reminderId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('habit_reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('Error deleting habit reminder:', error);
    throw error;
  }
}

/**
 * Get reminder delivery statistics
 */
export interface ReminderStats {
  totalSent: number;
  delivered: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  clickRate: number;
}

export async function getReminderStats(
  habitId: string,
  daysBack: number = 30
): Promise<ReminderStats> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error} = await supabase
    .from('reminder_delivery_log')
    .select('delivered, clicked, error_message')
    .eq('habit_id', habitId)
    .gte('sent_at', startDate.toISOString());

  if (error || !data) {
    return {
      totalSent: 0,
      delivered: 0,
      clicked: 0,
      failed: 0,
      deliveryRate: 0,
      clickRate: 0,
    };
  }

  const totalSent = data.length;
  const delivered = data.filter(log => log.delivered).length;
  const clicked = data.filter(log => log.clicked).length;
  const failed = data.filter(log => log.error_message).length;

  return {
    totalSent,
    delivered,
    clicked,
    failed,
    deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
    clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
  };
}
