'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageCircle,
  Cake,
  AlertCircle,
  Check,
  Loader2,
  ExternalLink,
  Send,
} from 'lucide-react';
import {
  getNotificationSettings,
  updateNotificationSettings,
  removePushSubscription,
  removeTelegramConnection,
} from '@/lib/data/notifications';
import type { NotificationSettings } from '@/lib/types/notifications';
import {
  BIRTHDAY_REMINDER_OPTIONS,
  ATTENTION_THRESHOLD_OPTIONS,
} from '@/lib/types/notifications';

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Form State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [birthdayDays, setBirthdayDays] = useState<number[]>([7, 1]);
  const [attentionThreshold, setAttentionThreshold] = useState(30);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getNotificationSettings();
      if (data) {
        setSettings(data);
        setPushEnabled(data.push_enabled);
        setTelegramEnabled(data.telegram_enabled);
        setBirthdayDays(data.birthday_days_before || [7, 1]);
        setAttentionThreshold(data.attention_threshold_days || 30);
        setQuietHoursEnabled(data.quiet_hours_enabled ?? true);
        setQuietHoursStart(data.quiet_hours_start || '22:00');
        setQuietHoursEnd(data.quiet_hours_end || '08:00');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateNotificationSettings({
        push_enabled: pushEnabled,
        telegram_enabled: telegramEnabled,
        birthday_days_before: birthdayDays,
        attention_threshold_days: attentionThreshold,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
      });

      setSaveMessage('Einstellungen gespeichert!');
      setTimeout(() => setSaveMessage(null), 3000);
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEnablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push-Benachrichtigungen werden von deinem Browser nicht unterstützt.');
      return;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Benachrichtigungen wurden blockiert. Bitte erlaube sie in den Browser-Einstellungen.');
        return;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        setSaveMessage('Konfigurationsfehler. Bitte später erneut versuchen.');
        return;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('Push subscription created:', subscription);

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setPushEnabled(true);
      setSaveMessage('Push-Benachrichtigungen aktiviert!');
      setTimeout(() => setSaveMessage(null), 3000);
      loadSettings();
    } catch (error) {
      console.error('Error enabling push:', error);
      setSaveMessage('Fehler beim Aktivieren. Bitte erneut versuchen.');
    }
  }

  async function handleTestNotification() {
    setIsTesting(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setSaveMessage('Test-Benachrichtigung gesendet!');
      } else {
        setSaveMessage(data.error || 'Fehler beim Senden');
      }
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setSaveMessage('Fehler beim Senden');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDisablePush() {
    try {
      await removePushSubscription();
      setPushEnabled(false);
      loadSettings();
    } catch (error) {
      console.error('Error disabling push:', error);
    }
  }

  async function handleDisconnectTelegram() {
    try {
      await removeTelegramConnection();
      setTelegramEnabled(false);
      loadSettings();
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
    }
  }

  function toggleBirthdayDay(day: number) {
    if (birthdayDays.includes(day)) {
      setBirthdayDays(birthdayDays.filter((d) => d !== day));
    } else {
      setBirthdayDays([...birthdayDays, day].sort((a, b) => b - a));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Benachrichtigungen</h1>
          <p className="text-sm text-adaptive-dim">Erinnerungen & Kanäle konfigurieren</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Push Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-adaptive">Browser Push</h3>
                <p className="text-sm text-adaptive-dim">
                  Benachrichtigungen direkt im Browser
                </p>
              </div>
            </div>
            <button
              onClick={pushEnabled ? handleDisablePush : handleEnablePush}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pushEnabled
                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {pushEnabled ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>

          {pushEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
                <Check className="w-4 h-4" />
                Push-Benachrichtigungen sind aktiv
              </div>
              <button
                onClick={handleTestNotification}
                disabled={isTesting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Test-Benachrichtigung senden
              </button>
            </div>
          )}
        </motion.div>

        {/* Telegram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-adaptive">Telegram Bot</h3>
                <p className="text-sm text-adaptive-dim">
                  Benachrichtigungen über @ProjektL_Bot
                </p>
              </div>
            </div>
            {telegramEnabled ? (
              <button
                onClick={handleDisconnectTelegram}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Trennen
              </button>
            ) : (
              <a
                href="https://t.me/ProjektL_Bot?start=connect"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Verbinden
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {telegramEnabled && settings?.telegram_chat_id && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
              <Check className="w-4 h-4" />
              Telegram verbunden (Chat ID: {settings.telegram_chat_id})
            </div>
          )}

          {!telegramEnabled && (
            <p className="text-sm text-adaptive-dim">
              Klicke auf &quot;Verbinden&quot; und starte den Bot in Telegram, um
              Benachrichtigungen zu erhalten.
            </p>
          )}
        </motion.div>

        {/* Birthday Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Cake className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-adaptive">Geburtstags-Erinnerungen</h3>
              <p className="text-sm text-adaptive-dim">Wann möchtest du erinnert werden?</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {BIRTHDAY_REMINDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleBirthdayDay(option.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  birthdayDays.includes(option.value)
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Attention Threshold */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-adaptive">Aufmerksamkeits-Schwelle</h3>
              <p className="text-sm text-adaptive-dim">
                Ab wann braucht ein Kontakt Aufmerksamkeit?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ATTENTION_THRESHOLD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setAttentionThreshold(option.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  attentionThreshold === option.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Quiet Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                {quietHoursEnabled ? (
                  <BellOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-adaptive">Ruhezeiten</h3>
                <p className="text-sm text-adaptive-dim">Keine Benachrichtigungen nachts</p>
              </div>
            </div>
            <button
              onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                quietHoursEnabled ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  quietHoursEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {quietHoursEnabled && (
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-white/40 block mb-1">Von</label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Bis</label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between"
        >
          {saveMessage && (
            <div
              className={`text-sm ${
                saveMessage.includes('Fehler') ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {saveMessage}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Speichern
          </button>
        </motion.div>
      </div>
    </div>
  );
}
