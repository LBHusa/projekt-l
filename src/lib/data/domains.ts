import { createBrowserClient } from '@/lib/supabase';
import type { SkillDomain, SkillDomainFaction, SkillDomainWithFactions, FactionId } from '@/lib/database.types';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// ============================================
// SKILL DOMAINS DATA ACCESS
// ============================================

/**
 * Get all domains visible to the current user.
 * Shows: Template domains + user's own domains
 * Hides: Other users' custom domains
 */
export async function getAllDomains(userId?: string): Promise<SkillDomain[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Defensive filtering: Templates OR user's own domains
  // This protects even if RLS is misconfigured
  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .or(`is_template.eq.true,created_by.eq.${resolvedUserId}`)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching domains:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a domain by ID with access control.
 * Returns null if user doesn't have access.
 */
export async function getDomainById(id: string, userId?: string): Promise<SkillDomain | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Only return if template OR user's own domain
  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .eq('id', id)
    .or(`is_template.eq.true,created_by.eq.${resolvedUserId}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or no access
    }
    console.error('Error fetching domain:', error);
    throw error;
  }

  return data;
}

export async function createDomain(domain: {
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}): Promise<SkillDomain> {
  const supabase = createBrowserClient();

  // Get max display_order
  const { data: maxOrder } = await supabase
    .from('skill_domains')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('skill_domains')
    .insert({
      name: domain.name,
      icon: domain.icon || '🎯',
      color: domain.color || '#6366f1',
      description: domain.description || null,
      display_order: (maxOrder?.display_order || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating domain:', error);
    throw error;
  }

  return data;
}

export async function updateDomain(
  id: string,
  updates: Partial<Pick<SkillDomain, 'name' | 'icon' | 'color' | 'description' | 'display_order'>>
): Promise<SkillDomain> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domains')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating domain:', error);
    throw error;
  }

  return data;
}

export async function deleteDomain(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('skill_domains')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting domain:', error);
    throw error;
  }
}

// ============================================
// N:M DOMAIN-FACTION RELATIONSHIPS
// ============================================

/**
 * Get all faction mappings for a domain
 */
export async function getDomainFactions(domainId: string): Promise<SkillDomainFaction[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domain_factions')
    .select('*')
    .eq('domain_id', domainId)
    .order('is_primary', { ascending: false })
    .order('weight', { ascending: false });

  if (error) {
    console.error('Error fetching domain factions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get domain with all faction mappings (with access control)
 */
export async function getDomainWithFactions(domainId: string, userId?: string): Promise<SkillDomainWithFactions | null> {
  const domain = await getDomainById(domainId, userId);
  if (!domain) return null;

  const factions = await getDomainFactions(domainId);

  return {
    ...domain,
    factions,
    created_by: (domain as SkillDomainWithFactions).created_by || null,
    is_template: (domain as SkillDomainWithFactions).is_template || false,
  };
}

/**
 * Set faction mappings for a domain (replaces all existing mappings)
 */
export async function setDomainFactions(
  domainId: string,
  factions: { faction_id: FactionId; weight: number; is_primary: boolean }[]
): Promise<SkillDomainFaction[]> {
  const supabase = createBrowserClient();

  // Delete existing mappings
  const { error: deleteError } = await supabase
    .from('skill_domain_factions')
    .delete()
    .eq('domain_id', domainId);

  if (deleteError) {
    console.error('Error deleting existing domain factions:', deleteError);
    throw deleteError;
  }

  // Insert new mappings
  if (factions.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('skill_domain_factions')
    .insert(
      factions.map((f) => ({
        domain_id: domainId,
        faction_id: f.faction_id,
        weight: f.weight,
        is_primary: f.is_primary,
      }))
    )
    .select();

  if (error) {
    console.error('Error inserting domain factions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get primary faction for a domain
 */
export async function getPrimaryFactionForDomain(domainId: string): Promise<FactionId | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domain_factions')
    .select('faction_id')
    .eq('domain_id', domainId)
    .eq('is_primary', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No primary found, try to get the one with highest weight
      const { data: fallback } = await supabase
        .from('skill_domain_factions')
        .select('faction_id')
        .eq('domain_id', domainId)
        .order('weight', { ascending: false })
        .limit(1)
        .single();
      return (fallback?.faction_id as FactionId) || null;
    }
    return null;
  }

  return (data?.faction_id as FactionId) || null;
}

/**
 * Create a new domain with faction mappings
 */
export async function createDomainWithFactions(
  domain: {
    name: string;
    icon?: string;
    color?: string;
    description?: string;
  },
  factions: { faction_id: FactionId; weight: number; is_primary: boolean }[],
  userId?: string
): Promise<SkillDomainWithFactions> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  // Transform factions to API format
  const factionData = factions.map(f => ({
    factionId: f.faction_id,
    weight: f.weight,
  }));

  const response = await fetch('/api/domains/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: domain.name,
      icon: domain.icon,
      color: domain.color,
      description: domain.description,
      factions: factionData,
      userId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error creating domain:', errorData);
    throw new Error(errorData.error || 'Failed to create domain');
  }

  const result = await response.json();
  
  // Return with factions in expected format
  return {
    ...result.data,
    factions: factions.map(f => ({
      ...f,
      domain_id: result.data.id,
    })),
    created_by: userId,
    is_template: false,
  };
}
