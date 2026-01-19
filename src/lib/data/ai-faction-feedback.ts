// ============================================
// AI FACTION FEEDBACK DATA ACCESS
// Phase 5: ML Training Data Collection
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import type { FactionId } from '@/lib/database.types';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

// ============================================
// TYPES
// ============================================

export interface AiFactionFeedback {
  id: string;
  user_id: string;
  activity_description: string;
  activity_timestamp: string;
  activity_hour: number;
  activity_day_of_week: string;
  duration_minutes: number | null;
  location: string | null;
  suggested_faction_id: FactionId;
  confidence_score: number;
  suggestion_reasoning: string | null;
  actual_faction_id: FactionId;
  accepted: boolean;
  created_at: string;
}

export interface CreateFeedbackInput {
  activity_description: string;
  activity_timestamp?: Date;
  duration_minutes?: number | null;
  location?: string | null;
  suggested_faction_id: FactionId;
  confidence_score: number;
  suggestion_reasoning?: string | null;
  actual_faction_id: FactionId;
  accepted: boolean;
}

export interface SuggestionAccuracy {
  user_id: string;
  total_suggestions: number;
  accepted_suggestions: number;
  acceptance_rate_percent: number;
  avg_confidence: number;
  avg_confidence_when_accepted: number;
  avg_confidence_when_rejected: number;
}

export interface ConfusionMatrixEntry {
  suggested_faction_id: FactionId;
  actual_faction_id: FactionId;
  frequency: number;
  avg_confidence: number;
  times_accepted: number;
}

// ============================================
// CREATE
// ============================================

/**
 * Store user feedback on AI faction suggestion
 */
export async function createFactionFeedback(
  input: CreateFeedbackInput,
  userId?: string
): Promise<AiFactionFeedback> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const timestamp = input.activity_timestamp || new Date();

  const { data, error } = await supabase
    .from('ai_faction_suggestions_feedback')
    .insert({
      user_id: resolvedUserId,
      activity_description: input.activity_description,
      activity_timestamp: timestamp.toISOString(),
      activity_hour: timestamp.getHours(),
      activity_day_of_week: timestamp.toLocaleDateString('de-DE', { weekday: 'long' }),
      duration_minutes: input.duration_minutes || null,
      location: input.location || null,
      suggested_faction_id: input.suggested_faction_id,
      confidence_score: input.confidence_score,
      suggestion_reasoning: input.suggestion_reasoning || null,
      actual_faction_id: input.actual_faction_id,
      accepted: input.accepted,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating faction feedback:', error);
    throw error;
  }

  return data;
}

// ============================================
// READ
// ============================================

/**
 * Get user's faction feedback history
 */
export async function getFactionFeedback(
  userId?: string,
  limit: number = 100
): Promise<AiFactionFeedback[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('ai_faction_suggestions_feedback')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('activity_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching faction feedback:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get suggestion accuracy stats for a user
 */
export async function getSuggestionAccuracy(
  userId?: string
): Promise<SuggestionAccuracy | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('ai_faction_suggestion_accuracy')
    .select('*')
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching suggestion accuracy:', error);
    return null;
  }

  return data;
}

/**
 * Get confusion matrix for all users (admin/analytics)
 */
export async function getConfusionMatrix(): Promise<ConfusionMatrixEntry[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('ai_faction_confusion_matrix')
    .select('*');

  if (error) {
    console.error('Error fetching confusion matrix:', error);
    return [];
  }

  return data || [];
}

/**
 * Get recent activities that can help with context (last N activities)
 */
export async function getRecentActivities(
  userId?: string,
  limit: number = 5
): Promise<string[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('title, description')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }

  return data.map(a => a.title || a.description || '').filter(Boolean);
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get feedback grouped by hour of day
 */
export async function getFeedbackByHour(
  userId?: string
): Promise<Record<number, { total: number; accepted: number }>> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('ai_faction_suggestions_feedback')
    .select('activity_hour, accepted')
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching feedback by hour:', error);
    return {};
  }

  const byHour: Record<number, { total: number; accepted: number }> = {};

  for (const entry of data || []) {
    if (!byHour[entry.activity_hour]) {
      byHour[entry.activity_hour] = { total: 0, accepted: 0 };
    }
    byHour[entry.activity_hour].total++;
    if (entry.accepted) {
      byHour[entry.activity_hour].accepted++;
    }
  }

  return byHour;
}

/**
 * Get most commonly suggested factions for a user
 */
export async function getCommonSuggestions(
  userId?: string
): Promise<Array<{ faction_id: FactionId; count: number; acceptance_rate: number }>> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('ai_faction_suggestions_feedback')
    .select('suggested_faction_id, accepted')
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching common suggestions:', error);
    return [];
  }

  const counts: Record<
    FactionId,
    { total: number; accepted: number }
  > = {} as Record<FactionId, { total: number; accepted: number }>;

  for (const entry of data || []) {
    const factionId = entry.suggested_faction_id as FactionId;
    if (!counts[factionId]) {
      counts[factionId] = { total: 0, accepted: 0 };
    }
    counts[factionId].total++;
    if (entry.accepted) {
      counts[factionId].accepted++;
    }
  }

  return Object.entries(counts).map(([faction_id, stats]) => ({
    faction_id: faction_id as FactionId,
    count: stats.total,
    acceptance_rate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
  }));
}
