// ============================================
// GEIST DATA ACCESS
// Mood & Journal for Mental/Mind Faction
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import type {
  MoodValue,
  MoodLog,
  JournalEntry,
  MoodStats,
  GeistStats,
} from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// MOOD LOGS
// ============================================

/**
 * Save a mood log entry
 */
export async function saveMoodLog(
  mood: MoodValue,
  note?: string,
  userId: string = TEST_USER_ID
): Promise<MoodLog> {
  const response = await fetch("/api/geist/mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, note, userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error saving mood log:", errorData);
    throw new Error(errorData.error || "Failed to save mood log");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get mood history for user
 */
export async function getMoodHistory(
  limit: number = 30,
  daysBack: number = 30,
  userId: string = TEST_USER_ID
): Promise<MoodLog[]> {
  try {
    const response = await fetch(`/api/geist/mood?userId=${userId}&limit=${limit}&daysBack=${daysBack}`);
    if (!response.ok) {
      console.error("Error fetching mood history:", await response.text());
      return [];
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error fetching mood history:", error);
    return [];
  }
}

/**
 * Get today's mood (if logged)
 */
export async function getTodaysMood(
  userId: string = TEST_USER_ID
): Promise<MoodLog | null> {
  try {
    // Use getMoodHistory with 1 day back, limit 1
    const history = await getMoodHistory(1, 1, userId);
    if (history.length > 0) {
      // Check if the mood was logged today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const moodDate = new Date(history[0].created_at);
      if (moodDate >= today) {
        return history[0];
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching today's mood:", error);
    return null;
  }
}


/**
 * Get mood statistics
 */
export async function getMoodStats(
  daysBack: number = 30,
  userId: string = TEST_USER_ID
): Promise<MoodStats | null> {
  try {
    const response = await fetch(`/api/geist/stats?userId=${userId}&days=${daysBack}`);
    if (!response.ok) {
      console.error("Error fetching mood stats:", await response.text());
      return null;
    }
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Error fetching mood stats:", error);
    return null;
  }
}

// ============================================
// JOURNAL ENTRIES
// ============================================

/**
 * Save a journal entry
 */
export async function saveJournalEntry(
  content: string,
  prompt?: string,
  userId: string = TEST_USER_ID
): Promise<JournalEntry> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content,
      prompt: prompt || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving journal entry:', error);
    throw error;
  }

  // Update geist faction stats with XP
  const xpGained = data.xp_gained || 5;
  try {
    await updateFactionStats('geist', xpGained, userId);
  } catch (err) {
    console.error('Error updating geist faction stats:', err);
  }

  // Log activity
  try {
    await logActivity({
      userId,
      activityType: 'xp_gained',
      factionId: 'geist',
      title: '📝 Tagebucheintrag geschrieben',
      description: `${data.word_count} Woerter`,
      xpAmount: xpGained,
      relatedEntityType: 'journal_entry',
      relatedEntityId: data.id,
    });
  } catch (err) {
    console.error('Error logging journal activity:', err);
  }

  return data;
}

/**
 * Get journal entries
 */
export async function getJournalEntries(
  limit: number = 10,
  userId: string = TEST_USER_ID
): Promise<JournalEntry[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching journal entries:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single journal entry
 */
export async function getJournalEntry(
  entryId: string
): Promise<JournalEntry | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching journal entry:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(entryId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get combined Geist stats
 */
export async function getGeistStats(
  userId: string = TEST_USER_ID
): Promise<GeistStats> {
  const supabase = createBrowserClient();

  // Get mood stats
  const moodStats = await getMoodStats(30, userId);

  // Get today's mood
  const todaysMood = await getTodaysMood(userId);

  // Get journal stats
  const { data: journalData, error: journalError } = await supabase
    .from('journal_entries')
    .select('word_count')
    .eq('user_id', userId);

  if (journalError && journalError.code !== 'PGRST116') {
    console.error('Error fetching journal stats:', journalError);
  }

  const journalCount = journalData?.length || 0;
  const totalWords = journalData?.reduce((sum, e) => sum + (e.word_count || 0), 0) || 0;

  return {
    moodStats,
    journalCount,
    totalWords,
    todaysMood,
  };
}

/**
 * Get weekly mood data for chart
 */
export async function getWeeklyMoodData(
  userId: string = TEST_USER_ID
): Promise<{ date: string; mood: MoodValue; score: number }[]> {
  const moods = await getMoodHistory(7, 7, userId);

  return moods.map(m => ({
    date: m.created_at.split('T')[0],
    mood: m.mood,
    score: getMoodScore(m.mood),
  }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMoodEmoji(mood: MoodValue): string {
  const emojis: Record<MoodValue, string> = {
    great: '😄',
    good: '🙂',
    okay: '😐',
    bad: '😔',
    terrible: '😢',
  };
  return emojis[mood];
}

export function getMoodLabel(mood: MoodValue): string {
  const labels: Record<MoodValue, string> = {
    great: 'Grossartig',
    good: 'Gut',
    okay: 'Okay',
    bad: 'Schlecht',
    terrible: 'Sehr schlecht',
  };
  return labels[mood];
}

export function getMoodScore(mood: MoodValue): number {
  const scores: Record<MoodValue, number> = {
    great: 5,
    good: 4,
    okay: 3,
    bad: 2,
    terrible: 1,
  };
  return scores[mood];
}

export function getMoodColor(mood: MoodValue): string {
  const colors: Record<MoodValue, string> = {
    great: '#22C55E',   // green-500
    good: '#84CC16',    // lime-500
    okay: '#EAB308',    // yellow-500
    bad: '#F97316',     // orange-500
    terrible: '#EF4444', // red-500
  };
  return colors[mood];
}

// ============================================
// JOURNAL PROMPTS
// ============================================

export const JOURNAL_PROMPTS = [
  'Wofuer bin ich heute dankbar?',
  'Was hat mich heute gluecklich gemacht?',
  'Was habe ich heute gelernt?',
  'Was moechte ich morgen erreichen?',
  'Wie fuehle ich mich gerade und warum?',
  'Was war heute meine groesste Herausforderung?',
  'Worauf bin ich heute stolz?',
  'Was hat mich heute inspiriert?',
  'Welche positiven Dinge sind mir heute aufgefallen?',
  'Was moechte ich loslassen?',
];

export function getRandomPrompt(): string {
  return JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
}

// ============================================
// MENTAL STATS HISTORY (for chart)
// ============================================

/**
 * Get mental stats history for chart visualization
 * Returns daily aggregated data (if multiple entries per day, averages them)
 */
export async function getMentalStatsHistory(
  daysBack: number = 30,
  userId: string = TEST_USER_ID
): Promise<import('@/lib/database.types').MentalStatsChartData[]> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('mental_stats_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching mental stats history:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Aggregate by day (average if multiple entries per day)
  const grouped = data.reduce((acc, log) => {
    const date = log.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = { mood: [], energy: [], stress: [], focus: [] };
    }
    acc[date].mood.push(log.mood);
    acc[date].energy.push(log.energy);
    acc[date].stress.push(log.stress);
    acc[date].focus.push(log.focus);
    return acc;
  }, {} as Record<string, { mood: number[]; energy: number[]; stress: number[]; focus: number[] }>);

  // Calculate averages and return sorted by date
  type GroupedStats = { mood: number[]; energy: number[]; stress: number[]; focus: number[] };
  return (Object.entries(grouped) as [string, GroupedStats][])
    .map(([date, stats]) => ({
      date,
      mood: Math.round(avg(stats.mood)),
      energy: Math.round(avg(stats.energy)),
      stress: Math.round(avg(stats.stress)),
      focus: Math.round(avg(stats.focus)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Helper: Calculate average of number array
 */
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
