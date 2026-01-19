// ============================================
// Projekt L - Contacts Data Layer
// Uses authenticated user from session
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  Contact,
  ContactWithStats,
  ContactFormData,
  ContactFilters,
  RelationshipCategory,
} from '@/lib/types/contacts';
import {
  RELATIONSHIP_TYPE_META,
  getCategoryFromType,
  getDomainIdFromCategory,
  calculateXpForNextLevel,
} from '@/lib/types/contacts';

// ============================================
// CRUD Operations
// ============================================

export async function getContacts(filters?: ContactFilters): Promise<Contact[]> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('last_interaction_at', { ascending: false, nullsFirst: false });

  // Apply filters
  if (filters?.is_archived !== undefined) {
    query = query.eq('is_archived', filters.is_archived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filters?.category) {
    query = query.eq('relationship_category', filters.category);
  }

  if (filters?.relationship_type) {
    query = query.eq('relationship_type', filters.relationship_type);
  }

  if (filters?.is_favorite) {
    query = query.eq('is_favorite', true);
  }

  if (filters?.domain_id) {
    query = query.eq('domain_id', filters.domain_id);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,nickname.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  return data || [];
}

export async function getContactsWithStats(filters?: ContactFilters): Promise<ContactWithStats[]> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  let query = supabase
    .from('contacts_with_stats')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('last_interaction_at', { ascending: false, nullsFirst: false });

  // Apply same filters as getContacts
  if (filters?.is_archived !== undefined) {
    query = query.eq('is_archived', filters.is_archived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filters?.category) {
    query = query.eq('relationship_category', filters.category);
  }

  if (filters?.relationship_type) {
    query = query.eq('relationship_type', filters.relationship_type);
  }

  if (filters?.is_favorite) {
    query = query.eq('is_favorite', true);
  }

  if (filters?.domain_id) {
    query = query.eq('domain_id', filters.domain_id);
  }

  if (filters?.needs_attention) {
    query = query.eq('needs_attention', true);
  }

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,nickname.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contacts with stats:', error);
    throw error;
  }

  return data || [];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching contact:', error);
    throw error;
  }

  return data;
}

export async function getContactWithStatsById(id: string): Promise<ContactWithStats | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contacts_with_stats')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching contact with stats:', error);
    throw error;
  }

  return data;
}

export async function createContact(formData: ContactFormData): Promise<Contact> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  // Bestimme automatisch die Kategorie und Domain
  const category = getCategoryFromType(formData.relationship_type);
  const domainId = getDomainIdFromCategory(category);

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      nickname: formData.nickname || null,
      photo_url: formData.photo_url || null,
      relationship_type: formData.relationship_type,
      relationship_category: category,
      domain_id: domainId,
      birthday: formData.birthday || null,
      anniversary: formData.anniversary || null,
      met_date: formData.met_date || null,
      met_context: formData.met_context || null,
      contact_info: formData.contact_info || {},
      shared_interests: formData.shared_interests || [],
      notes: formData.notes || null,
      tags: formData.tags || [],
      trust_level: formData.trust_level || 50,
      is_favorite: formData.is_favorite || false,
      reminder_frequency_days: formData.reminder_frequency_days || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw error;
  }

  return data;
}

export async function updateContact(
  id: string,
  updates: Partial<ContactFormData>
): Promise<Contact> {
  const supabase = createBrowserClient();

  // Konvertiere leere Strings zu null für Datumsfelder
  const sanitizedUpdates = { ...updates };
  const dateFields = ['birthday', 'anniversary', 'met_date'] as const;
  dateFields.forEach((field) => {
    if (field in sanitizedUpdates && sanitizedUpdates[field] === '') {
      (sanitizedUpdates as Record<string, unknown>)[field] = null;
    }
  });

  // Wenn relationship_type geändert wird, aktualisiere auch category und domain
  const additionalUpdates: Partial<Contact> = {};
  if (sanitizedUpdates.relationship_type) {
    const category = getCategoryFromType(sanitizedUpdates.relationship_type);
    additionalUpdates.relationship_category = category;
    additionalUpdates.domain_id = getDomainIdFromCategory(category);
  }

  const { data, error } = await supabase
    .from('contacts')
    .update({ ...sanitizedUpdates, ...additionalUpdates })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    throw error;
  }

  return data;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase.from('contacts').delete().eq('id', id);

  if (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}

export async function archiveContact(id: string, archived: boolean = true): Promise<Contact> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contacts')
    .update({ is_archived: archived })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error archiving contact:', error);
    throw error;
  }

  return data;
}

export async function toggleFavorite(id: string): Promise<Contact> {
  const contact = await getContactById(id);
  if (!contact) throw new Error('Contact not found');

  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('contacts')
    .update({ is_favorite: !contact.is_favorite })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }

  return data;
}

// ============================================
// Spezielle Abfragen
// ============================================

export async function getContactsByDomain(domainId: string): Promise<ContactWithStats[]> {
  return getContactsWithStats({ domain_id: domainId, is_archived: false });
}

export async function getContactsByCategory(category: RelationshipCategory): Promise<ContactWithStats[]> {
  return getContactsWithStats({ category, is_archived: false });
}

export async function getFavoriteContacts(): Promise<ContactWithStats[]> {
  return getContactsWithStats({ is_favorite: true, is_archived: false });
}

export async function getUpcomingBirthdays(days: number = 30): Promise<ContactWithStats[]> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  const { data, error } = await supabase
    .from('contacts_upcoming_birthdays')
    .select('*')
    .eq('user_id', userId)
    .lte('days_until_birthday', days);

  if (error) {
    console.error('Error fetching upcoming birthdays:', error);
    throw error;
  }

  // Enriche mit Stats-Feldern
  return (data || []).map((contact) => ({
    ...contact,
    xp_for_next_level: calculateXpForNextLevel(contact.relationship_level),
    progress_percent: Math.round(
      (contact.current_xp / calculateXpForNextLevel(contact.relationship_level)) * 100
    ),
    days_since_interaction: contact.last_interaction_at
      ? Math.floor(
          (Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null,
    needs_attention:
      !contact.last_interaction_at ||
      new Date(contact.last_interaction_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  }));
}

export async function getContactsNeedingAttention(limit: number = 10): Promise<ContactWithStats[]> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  const { data, error } = await supabase
    .from('contacts_needing_attention')
    .select('*')
    .eq('user_id', userId)
    .limit(limit);

  if (error) {
    console.error('Error fetching neglected contacts:', error);
    throw error;
  }

  return (data || []).map((contact) => ({
    ...contact,
    xp_for_next_level: calculateXpForNextLevel(contact.relationship_level),
    progress_percent: Math.round(
      (contact.current_xp / calculateXpForNextLevel(contact.relationship_level)) * 100
    ),
    days_until_birthday: null,
    needs_attention: true,
  }));
}

// ============================================
// Statistiken
// ============================================

export async function getContactsStats(): Promise<{
  total: number;
  byCategory: Record<RelationshipCategory, number>;
  favorites: number;
  needingAttention: number;
}> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();

  const { data, error } = await supabase
    .from('contacts')
    .select('relationship_category, is_favorite')
    .eq('user_id', userId)
    .eq('is_archived', false);

  if (error) {
    console.error('Error fetching contacts stats:', error);
    throw error;
  }

  const contacts = data || [];

  const byCategory: Record<RelationshipCategory, number> = {
    family: 0,
    friend: 0,
    professional: 0,
    other: 0,
  };

  contacts.forEach((c) => {
    byCategory[c.relationship_category as RelationshipCategory]++;
  });

  // Anzahl die Aufmerksamkeit brauchen
  const { count: needingAttentionCount } = await supabase
    .from('contacts_needing_attention')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    total: contacts.length,
    byCategory,
    favorites: contacts.filter((c) => c.is_favorite).length,
    needingAttention: needingAttentionCount || 0,
  };
}

// ============================================
// Helper: Enrich Contact with computed stats
// ============================================

export function enrichContactWithStats(contact: Contact): ContactWithStats {
  const xpForNext = calculateXpForNextLevel(contact.relationship_level);
  const daysAgo = contact.last_interaction_at
    ? Math.floor(
        (Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  let daysUntilBirthday: number | null = null;
  if (contact.birthday) {
    const today = new Date();
    const bday = new Date(contact.birthday);
    bday.setFullYear(today.getFullYear());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    daysUntilBirthday = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    ...contact,
    days_since_interaction: daysAgo,
    days_until_birthday: daysUntilBirthday,
    xp_for_next_level: xpForNext,
    progress_percent: Math.round((contact.current_xp / xpForNext) * 100),
    needs_attention: daysAgo === null || daysAgo > 30,
  };
}

// ============================================
// Bulk Import
// ============================================

export interface BulkImportOptions {
  skipDuplicates?: boolean;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { name: string; error: string }[];
}

export async function bulkImportContacts(
  contacts: ContactFormData[],
  options: BulkImportOptions = {}
): Promise<BulkImportResult> {
  const supabase = createBrowserClient();
  const userId = await getUserIdOrCurrent();
  
  const result: BulkImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  // Get existing contacts for duplicate detection
  let existingNames: Set<string> = new Set();
  if (options.skipDuplicates) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('user_id', userId);

    if (existing) {
      existingNames = new Set(
        existing.map((c) =>
          `${c.first_name}${c.last_name || ''}`.toLowerCase().trim()
        )
      );
    }
  }

  // Process each contact
  for (const contactData of contacts) {
    const fullName = `${contactData.first_name}${contactData.last_name || ''}`.toLowerCase().trim();

    // Skip duplicates if option is set
    if (options.skipDuplicates && existingNames.has(fullName)) {
      result.skipped++;
      continue;
    }

    try {
      // Determine category and domain from relationship type
      const category = getCategoryFromType(contactData.relationship_type);
      const domainId = getDomainIdFromCategory(category);

      // Sanitize date fields
      const sanitizedData = { ...contactData };
      const dateFields = ['birthday', 'anniversary', 'met_date'] as const;
      dateFields.forEach((field) => {
        if (field in sanitizedData && sanitizedData[field] === '') {
          (sanitizedData as Record<string, unknown>)[field] = null;
        }
      });

      const { error } = await supabase.from('contacts').insert({
        user_id: userId,
        ...sanitizedData,
        relationship_category: category,
        domain_id: domainId,
        relationship_level: 1,
        trust_level: 50,
        current_xp: 0,
        interaction_count: 0,
        avg_interaction_quality: 0,
        is_favorite: false,
        is_archived: false,
        shared_interests: contactData.shared_interests || [],
        tags: contactData.tags || [],
      });

      if (error) {
        result.errors.push({
          name: `${contactData.first_name} ${contactData.last_name || ''}`.trim(),
          error: error.message,
        });
      } else {
        result.imported++;
        existingNames.add(fullName);
      }
    } catch (err) {
      result.errors.push({
        name: `${contactData.first_name} ${contactData.last_name || ''}`.trim(),
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return result;
}
