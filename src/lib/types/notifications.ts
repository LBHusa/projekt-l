// ============================================
// Projekt L - Notification Settings Types
// ============================================

export interface NotificationSettings {
  id: string;
  user_id: string;

  // Kanäle
  push_enabled: boolean;
  push_subscription: PushSubscriptionJSON | null;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;

  // Reminder-Einstellungen
  birthday_days_before: number[];
  attention_threshold_days: number;

  // Ruhezeiten
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // TIME format "HH:MM"
  quiet_hours_end: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationSettingsFormData {
  push_enabled: boolean;
  telegram_enabled: boolean;
  birthday_days_before: number[];
  attention_threshold_days: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export type NotificationChannel = 'push' | 'telegram';
export type NotificationType = 'birthday' | 'attention' | 'reminder' | 'custom';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface NotificationLog {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  status: NotificationStatus;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

// ============================================
// UI Metadata
// ============================================

export const NOTIFICATION_CHANNEL_META: Record<NotificationChannel, {
  label: string;
  labelDe: string;
  icon: string;
  description: string;
}> = {
  push: {
    label: 'Browser Push',
    labelDe: 'Browser Push',
    icon: '🔔',
    description: 'Benachrichtigungen direkt im Browser erhalten',
  },
  telegram: {
    label: 'Telegram',
    labelDe: 'Telegram',
    icon: '📱',
    description: 'Benachrichtigungen über Telegram Bot erhalten',
  },
};

export const BIRTHDAY_REMINDER_OPTIONS = [
  { value: 7, label: '1 Woche vorher' },
  { value: 3, label: '3 Tage vorher' },
  { value: 1, label: '1 Tag vorher' },
  { value: 0, label: 'Am Tag selbst' },
];

export const ATTENTION_THRESHOLD_OPTIONS = [
  { value: 14, label: '2 Wochen' },
  { value: 30, label: '1 Monat' },
  { value: 60, label: '2 Monate' },
  { value: 90, label: '3 Monate' },
];
