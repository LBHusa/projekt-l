// ============================================
// Projekt L - Contact Interactions Data Layer
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import type {
  ContactInteraction,
  InteractionFormData,
  InteractionType,
  InteractionQuality,
} from '@/lib/types/contacts';
import {
  INTERACTION_TYPE_META,
  QUALITY_MULTIPLIER,
  calculateInteractionXp,
} from '@/lib/types/contacts';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// CRUD Operations
// ============================================

export async function getInteractionsByContact(
  contactId: string,
  limit: number = 50
): Promise<ContactInteraction[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching interactions:', error);
    throw error;
  }

  return data || [];
}

export async function getRecentInteractions(days: number = 7): Promise<ContactInteraction[]> {
  const supabase = createBrowserClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .gte('occurred_at', cutoffDate.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching recent interactions:', error);
    throw error;
  }

  return data || [];
}

export async function getInteractionById(id: string): Promise<ContactInteraction | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching interaction:', error);
    throw error;
  }

  return data;
}

export async function createInteraction(formData: InteractionFormData): Promise<ContactInteraction> {
  const supabase = createBrowserClient();

  // Berechne XP
  const xpGained = calculateInteractionXp(
    formData.interaction_type,
    formData.quality,
    formData.duration_minutes
  );

  const { data, error } = await supabase
    .from('contact_interactions')
    .insert({
      contact_id: formData.contact_id,
      user_id: TEST_USER_ID,
      interaction_type: formData.interaction_type,
      title: formData.title || null,
      description: formData.description || null,
      quality: formData.quality,
      xp_gained: xpGained,
      duration_minutes: formData.duration_minutes || null,
      occurred_at: formData.occurred_at || new Date().toISOString(),
      related_skill_id: formData.related_skill_id || null,
      location: formData.location || null,
      participants: formData.participants || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating interaction:', error);
    throw error;
  }

  return data;
}

export async function deleteInteraction(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase.from('contact_interactions').delete().eq('id', id);

  if (error) {
    console.error('Error deleting interaction:', error);
    throw error;
  }
}

// ============================================
// Quick Interactions (Shortcut für häufige Typen)
// ============================================

export async function logQuickInteraction(
  contactId: string,
  type: InteractionType,
  quality: InteractionQuality = 'good'
): Promise<ContactInteraction> {
  return createInteraction({
    contact_id: contactId,
    interaction_type: type,
    quality,
  });
}

export async function logCall(
  contactId: string,
  quality: InteractionQuality = 'good',
  durationMinutes?: number
): Promise<ContactInteraction> {
  return createInteraction({
    contact_id: contactId,
    interaction_type: 'call',
    quality,
    duration_minutes: durationMinutes,
  });
}

export async function logMessage(
  contactId: string,
  quality: InteractionQuality = 'neutral'
): Promise<ContactInteraction> {
  return createInteraction({
    contact_id: contactId,
    interaction_type: 'message',
    quality,
  });
}

export async function logMeeting(
  contactId: string,
  quality: InteractionQuality = 'good',
  durationMinutes?: number,
  title?: string
): Promise<ContactInteraction> {
  return createInteraction({
    contact_id: contactId,
    interaction_type: 'meeting',
    quality,
    duration_minutes: durationMinutes,
    title,
  });
}

// ============================================
// Statistiken
// ============================================

export interface InteractionStats {
  total: number;
  last30Days: number;
  last7Days: number;
  avgQuality: number;
  totalXp: number;
  byType: Record<InteractionType, number>;
  qualityDistribution: Record<InteractionQuality, number>;
}

export async function getInteractionStats(contactId: string): Promise<InteractionStats> {
  const supabase = createBrowserClient();

  const { data: all, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('contact_id', contactId);

  if (error) {
    console.error('Error fetching interaction stats:', error);
    throw error;
  }

  const interactions = all || [];

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const last30Days = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= thirtyDaysAgo
  );
  const last7Days = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= sevenDaysAgo
  );

  const qualityValues: Record<InteractionQuality, number> = {
    poor: 1,
    neutral: 2,
    good: 3,
    great: 4,
    exceptional: 5,
  };

  const avgQuality =
    interactions.length > 0
      ? interactions.reduce(
          (sum, i) => sum + qualityValues[i.quality as InteractionQuality],
          0
        ) / interactions.length
      : 0;

  const byType: Record<InteractionType, number> = {
    call: 0,
    video_call: 0,
    message: 0,
    meeting: 0,
    activity: 0,
    event: 0,
    gift: 0,
    support: 0,
    quality_time: 0,
    other: 0,
  };

  const qualityDistribution: Record<InteractionQuality, number> = {
    poor: 0,
    neutral: 0,
    good: 0,
    great: 0,
    exceptional: 0,
  };

  interactions.forEach((i) => {
    byType[i.interaction_type as InteractionType]++;
    qualityDistribution[i.quality as InteractionQuality]++;
  });

  return {
    total: interactions.length,
    last30Days: last30Days.length,
    last7Days: last7Days.length,
    avgQuality,
    totalXp: interactions.reduce((sum, i) => sum + i.xp_gained, 0),
    byType,
    qualityDistribution,
  };
}

// ============================================
// Globale Interaktions-Statistiken
// ============================================

export async function getGlobalInteractionStats(): Promise<{
  totalInteractions: number;
  last7Days: number;
  last30Days: number;
  totalXpGained: number;
  avgQuality: number;
  mostActiveContact: { id: string; count: number } | null;
}> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error fetching global interaction stats:', error);
    throw error;
  }

  const interactions = data || [];

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const qualityValues: Record<InteractionQuality, number> = {
    poor: 1,
    neutral: 2,
    good: 3,
    great: 4,
    exceptional: 5,
  };

  const avgQuality =
    interactions.length > 0
      ? interactions.reduce(
          (sum, i) => sum + qualityValues[i.quality as InteractionQuality],
          0
        ) / interactions.length
      : 0;

  // Finde aktivsten Kontakt
  const contactCounts: Record<string, number> = {};
  interactions.forEach((i) => {
    contactCounts[i.contact_id] = (contactCounts[i.contact_id] || 0) + 1;
  });

  let mostActiveContact: { id: string; count: number } | null = null;
  Object.entries(contactCounts).forEach(([id, count]) => {
    if (!mostActiveContact || count > mostActiveContact.count) {
      mostActiveContact = { id, count };
    }
  });

  return {
    totalInteractions: interactions.length,
    last7Days: interactions.filter(
      (i) => new Date(i.occurred_at).getTime() >= sevenDaysAgo
    ).length,
    last30Days: interactions.filter(
      (i) => new Date(i.occurred_at).getTime() >= thirtyDaysAgo
    ).length,
    totalXpGained: interactions.reduce((sum, i) => sum + i.xp_gained, 0),
    avgQuality,
    mostActiveContact,
  };
}

// ============================================
// Interaktion mit Kontakt-Info (für Timeline)
// ============================================

export interface InteractionWithContact extends ContactInteraction {
  contact_name: string;
  contact_photo_url: string | null;
}

export async function getRecentInteractionsWithContacts(
  limit: number = 20
): Promise<InteractionWithContact[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contact_interactions')
    .select(
      `
      *,
      contacts:contact_id (
        first_name,
        last_name,
        nickname,
        photo_url
      )
    `
    )
    .eq('user_id', TEST_USER_ID)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching interactions with contacts:', error);
    throw error;
  }

  return (data || []).map((item) => {
    const contact = item.contacts as {
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      photo_url: string | null;
    };
    return {
      ...item,
      contacts: undefined,
      contact_name: contact.nickname ||
        (contact.last_name
          ? `${contact.first_name} ${contact.last_name}`
          : contact.first_name),
      contact_photo_url: contact.photo_url,
    };
  });
}
