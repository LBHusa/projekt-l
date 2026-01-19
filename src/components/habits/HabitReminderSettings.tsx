'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, BellOff } from 'lucide-react';
import {
  getHabitReminders,
  createHabitReminder,
  updateHabitReminder,
  toggleHabitReminder,
  deleteHabitReminder,
  type HabitReminder,
} from '@/lib/data/habit-reminders';

interface HabitReminderSettingsProps {
  habitId: string;
}

const DAYS = [
  { value: 'mon', label: 'Mo' },
  { value: 'tue', label: 'Di' },
  { value: 'wed', label: 'Mi' },
  { value: 'thu', label: 'Do' },
  { value: 'fri', label: 'Fr' },
  { value: 'sat', label: 'Sa' },
  { value: 'sun', label: 'So' },
];

export default function HabitReminderSettings({ habitId }: HabitReminderSettingsProps) {
  const [reminders, setReminders] = useState<HabitReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    reminder_time: '09:00',
    days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'],
    label: '',
  });

  useEffect(() => {
    loadReminders();
  }, [habitId]);

  async function loadReminders() {
    try {
      const data = await getHabitReminders(habitId);
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddReminder() {
    try {
      await createHabitReminder({
        habit_id: habitId,
        reminder_time: newReminder.reminder_time,
        days_of_week: newReminder.days_of_week,
        label: newReminder.label || undefined,
      });
      await loadReminders();
      setShowAddForm(false);
      setNewReminder({
        reminder_time: '09:00',
        days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'],
        label: '',
      });
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  }

  async function handleToggleReminder(reminderId: string, enabled: boolean) {
    try {
      await toggleHabitReminder(reminderId, enabled);
      await loadReminders();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    if (!confirm('Erinnerung wirklich löschen?')) return;
    try {
      await deleteHabitReminder(reminderId);
      await loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  }

  function toggleDay(day: string) {
    setNewReminder((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  }

  if (loading) {
    return <div className="text-[var(--foreground-muted)]">Lade Erinnerungen...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Erinnerungen
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Hinzufügen
        </button>
      </div>

      {/* Existing Reminders */}
      {reminders.length > 0 ? (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-all ${
                reminder.enabled
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                  : 'bg-white/5 border-[var(--orb-border)] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold">
                      {reminder.reminder_time.substring(0, 5)}
                    </span>
                    {reminder.label && (
                      <span className="text-sm text-[var(--foreground-muted)]">{reminder.label}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {DAYS.map((day) => (
                      <span
                        key={day.value}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          reminder.days_of_week.includes(day.value)
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-white/5 text-[var(--foreground-muted)]'
                        }`}
                      >
                        {day.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleReminder(reminder.id, !reminder.enabled)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    title={reminder.enabled ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {reminder.enabled ? (
                      <Bell className="w-5 h-5 text-[var(--accent-primary)]" />
                    ) : (
                      <BellOff className="w-5 h-5 text-[var(--foreground-muted)]" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[var(--foreground-muted)]">
          <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Noch keine Erinnerungen eingerichtet</p>
        </div>
      )}

      {/* Add Reminder Form */}
      {showAddForm && (
        <div className="p-4 bg-white/5 border border-[var(--accent-primary)]/30 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Uhrzeit</label>
            <input
              type="time"
              value={newReminder.reminder_time}
              onChange={(e) =>
                setNewReminder((prev) => ({ ...prev, reminder_time: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Wochentage</label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newReminder.days_of_week.includes(day.value)
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-white/5 text-adaptive hover:bg-white/10'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Label (optional)</label>
            <input
              type="text"
              value={newReminder.label}
              onChange={(e) => setNewReminder((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="z.B. Morgens, Abends"
              className="w-full px-3 py-2 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddReminder}
              disabled={newReminder.days_of_week.length === 0}
              className="flex-1 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
            >
              Speichern
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
