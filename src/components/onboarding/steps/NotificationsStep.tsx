'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, SkipForward, Bell, Moon, MessageCircle } from 'lucide-react';
import type { NotificationSettings } from '../OnboardingWizard';

interface NotificationsStepProps {
  settings: NotificationSettings;
  onUpdate: (settings: NotificationSettings) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const QUIET_START_OPTIONS = [
  '20:00', '21:00', '22:00', '23:00', '00:00',
];

const QUIET_END_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
];

export default function NotificationsStep({
  settings,
  onUpdate,
  onNext,
  onBack,
  onSkip,
}: NotificationsStepProps) {
  const [data, setData] = useState<NotificationSettings>({
    ...settings,
    // Ensure quiet hours have defaults
    quietHoursStart: settings.quietHoursStart || '22:00',
    quietHoursEnd: settings.quietHoursEnd || '07:00',
  });

  useEffect(() => {
    onUpdate(data);
  }, [data, onUpdate]);

  const updateField = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Benachrichtigungen
        </h2>
        <p className="text-adaptive-muted">
          Lass dich erinnern, um am Ball zu bleiben.
        </p>
      </div>

      {/* Reminder Toggle */}
      <div className="p-5 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Benachrichtigungen</h3>
              <p className="text-sm text-adaptive-muted">Erinnerungen für Habits & Quests</p>
            </div>
          </div>

          <button
            onClick={() => updateField('enableReminders', !data.enableReminders)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              data.enableReminders ? 'bg-purple-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                data.enableReminders ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Quiet Hours Selection */}
        {data.enableReminders && (
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-adaptive-muted" />
              <span className="text-sm text-adaptive-muted">Ruhezeiten (keine Benachrichtigungen)</span>
            </div>

            {/* Quiet hours range */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start time */}
              <div>
                <label className="block text-xs text-adaptive-dim mb-2">Ruhe ab</label>
                <div className="flex flex-wrap gap-2">
                  {QUIET_START_OPTIONS.map(time => (
                    <button
                      key={time}
                      onClick={() => updateField('quietHoursStart', time)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        data.quietHoursStart === time
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* End time */}
              <div>
                <label className="block text-xs text-adaptive-dim mb-2">Aktiv ab</label>
                <div className="flex flex-wrap gap-2">
                  {QUIET_END_OPTIONS.map(time => (
                    <button
                      key={time}
                      onClick={() => updateField('quietHoursEnd', time)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        data.quietHoursEnd === time
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual summary */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-sm text-center">
                🔔 Benachrichtigungen aktiv von <strong>{data.quietHoursEnd}</strong> bis <strong>{data.quietHoursStart}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Telegram Integration */}
      <div className="p-5 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Telegram-Verbindung</h3>
              <p className="text-sm text-adaptive-muted">Reminder über Telegram erhalten</p>
            </div>
          </div>

          <button
            onClick={() => updateField('enableTelegram', !data.enableTelegram)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              data.enableTelegram ? 'bg-blue-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                data.enableTelegram ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {data.enableTelegram && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              Du kannst Telegram später in den Einstellungen verbinden.
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-white/5 rounded-lg">
        <p className="text-adaptive-muted text-sm text-center">
          Du kannst diese Einstellungen jederzeit unter Einstellungen &rarr; Benachrichtigungen ändern.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </button>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Überspringen
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-colors"
          >
            Weiter
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
