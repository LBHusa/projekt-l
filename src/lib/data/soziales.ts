import { createBrowserClient } from '@/lib/supabase';
import type { SocialEvent, SocialEventType } from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_type?: SocialEventType | null;
  occurred_at: string; // ISO datetime string
  duration_minutes?: number | null;
  location?: string | null;
  participants: string[]; // Array of contact UUIDs
  notes?: string | null;
}

// ============================================
// XP CALCULATIONS
// ============================================

function calculateEventXp(event: {
  participant_count: number;
  duration_minutes?: number | null;
  event_type?: string | null;
}): number {
  // Base XP for social interaction
  let xp = 15;

  // Bonus for group size
  if (event.participant_count >= 10) xp += 25;      // Grosse Gruppe
  else if (event.participant_count >= 5) xp += 15;  // Mittlere Gruppe
  else if (event.participant_count >= 2) xp += 5;   // Kleine Gruppe

  // Bonus for longer events
  const hours = (event.duration_minutes || 0) / 60;
  if (hours >= 4) xp += 20;       // 4+ Stunden
  else if (hours >= 2) xp += 10;  // 2+ Stunden

  return xp;
}

// ============================================
// GET FUNCTIONS
// ============================================

/**
 * Get all social events for a user, sorted by date descending
 */
export async function getEvents(
  userId: string = TEST_USER_ID
): Promise<SocialEvent[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('social_events')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching social events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get upcoming events within the next N days
 */
export async function getUpcomingEvents(
  userId: string = TEST_USER_ID,
  days: number = 30
): Promise<SocialEvent[]> {
  const supabase = createBrowserClient();

  const now = new Date().toISOString();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const future = futureDate.toISOString();

  const { data, error } = await supabase
    .from('social_events')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', now)
    .lte('occurred_at', future)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get events by type
 */
export async function getEventsByType(
  eventType: SocialEventType,
  userId: string = TEST_USER_ID
): Promise<SocialEvent[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('social_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching events by type:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// CREATE FUNCTION
// ============================================

/**
 * Create a new social event
 * Auto-calculates participant_count from participants array length
 * Awards XP based on group size and duration
 */
export async function createEvent(
  input: CreateEventInput,
  userId: string = TEST_USER_ID
): Promise<SocialEvent> {
  const supabase = createBrowserClient();

  // Auto-calculate participant_count from participants array
  const participant_count = input.participants.length;

  // Calculate XP before insert
  const xpGained = calculateEventXp({
    participant_count,
    duration_minutes: input.duration_minutes,
    event_type: input.event_type,
  });

  const { data, error } = await supabase
    .from('social_events')
    .insert({
      ...input,
      user_id: userId,
      participant_count,
      photos_urls: [], // Default empty array
      xp_gained: xpGained,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating social event:', error);
    throw error;
  }

  // Update faction stats with XP
  if (xpGained > 0) {
    try {
      await updateFactionStats('soziales', xpGained, userId);
    } catch (err) {
      console.error('Error updating faction stats for social event:', err);
    }
  }

  // Log activity for feed
  try {
    await logActivity({
      userId,
      activityType: 'event_logged',
      factionId: 'soziales',
      title: `Event: "${data.title}"`,
      description: `${participant_count} Teilnehmer`,
      xpAmount: xpGained,
      relatedEntityType: 'social_event',
      relatedEntityId: data.id,
      metadata: {
        event_type: data.event_type,
        participant_count,
        location: data.location,
      },
    });
  } catch (err) {
    console.error('Error logging social event activity:', err);
  }

  return data;
}

// ============================================
// UPDATE FUNCTION
// ============================================

/**
 * Update an existing social event
 * Recalculates participant_count if participants array is being updated
 */
export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>
): Promise<SocialEvent> {
  const supabase = createBrowserClient();

  // Prepare update data
  const updateData: any = { ...input };

  // Recalculate participant_count if participants array is being updated
  if (input.participants) {
    updateData.participant_count = input.participants.length;
  }

  const { data, error } = await supabase
    .from('social_events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating social event:', error);
    throw error;
  }

  return data;
}

// ============================================
// DELETE FUNCTION
// ============================================

/**
 * Delete a social event
 */
export async function deleteEvent(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('social_events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting social event:', error);
    throw error;
  }
}

// ============================================
// STATS FUNCTION (Optional)
// ============================================

export interface SocialEventStats {
  totalEvents: number;
  eventsThisMonth: number;
  eventsThisWeek: number;
  mostCommonType: SocialEventType | null;
  totalParticipants: number;
  avgParticipantsPerEvent: number;
}

/**
 * Get event statistics for a user
 */
export async function getEventStats(
  userId: string = TEST_USER_ID
): Promise<SocialEventStats> {
  const events = await getEvents(userId);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const eventsThisWeek = events.filter(
    e => new Date(e.occurred_at) >= weekAgo
  ).length;

  const eventsThisMonth = events.filter(
    e => new Date(e.occurred_at) >= monthAgo
  ).length;

  // Calculate most common type
  const typeCounts: Record<string, number> = {};
  events.forEach(e => {
    if (e.event_type) {
      typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
    }
  });

  const mostCommonType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as SocialEventType | null || null;

  const totalParticipants = events.reduce(
    (sum, e) => sum + e.participant_count, 0
  );

  const avgParticipantsPerEvent = events.length > 0
    ? Math.round(totalParticipants / events.length)
    : 0;

  return {
    totalEvents: events.length,
    eventsThisMonth,
    eventsThisWeek,
    mostCommonType,
    totalParticipants,
    avgParticipantsPerEvent,
  };
}
