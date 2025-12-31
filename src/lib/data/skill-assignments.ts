// ============================================
// SKILL DOMAIN ASSIGNMENTS DATA ACCESS
// Phase 1b: Multi-Domain Support
// ============================================

import { createBrowserClient } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface SkillDomainAssignment {
  id: string;
  skill_id: string;
  domain_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface SkillDomainInfo {
  domain_id: string;
  domain_name: string;
  domain_icon: string;
  domain_color: string;
  is_primary: boolean;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all domain assignments for a skill
 */
export async function getSkillDomains(skillId: string): Promise<SkillDomainInfo[]> {
  const supabase = createBrowserClient();

  // First get the skill's primary domain
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('domain_id')
    .eq('id', skillId)
    .single();

  if (skillError) {
    console.error('Error fetching skill:', skillError);
    return [];
  }

  // Get all assignments
  const { data: assignments, error: assignError } = await supabase
    .from('skill_domain_assignments')
    .select(`
      domain_id,
      is_primary,
      skill_domains (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('skill_id', skillId);

  if (assignError) {
    console.error('Error fetching skill domain assignments:', assignError);
  }

  // If no assignments, return the primary domain from skill
  if (!assignments || assignments.length === 0) {
    const { data: domain } = await supabase
      .from('skill_domains')
      .select('id, name, icon, color')
      .eq('id', skill.domain_id)
      .single();

    if (domain) {
      return [{
        domain_id: domain.id,
        domain_name: domain.name,
        domain_icon: domain.icon,
        domain_color: domain.color,
        is_primary: true,
      }];
    }
    return [];
  }

  // Map assignments to SkillDomainInfo
  return assignments.map((a: Record<string, unknown>) => {
    const domain = a.skill_domains as Record<string, string>;
    return {
      domain_id: a.domain_id as string,
      domain_name: domain?.name || 'Unknown',
      domain_icon: domain?.icon || '📁',
      domain_color: domain?.color || '#666',
      is_primary: a.is_primary as boolean,
    };
  });
}

/**
 * Assign a skill to an additional domain
 */
export async function assignSkillToDomain(
  skillId: string,
  domainId: string,
  isPrimary: boolean = false
): Promise<SkillDomainAssignment | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domain_assignments')
    .upsert({
      skill_id: skillId,
      domain_id: domainId,
      is_primary: isPrimary,
    }, { onConflict: 'skill_id,domain_id' })
    .select()
    .single();

  if (error) {
    console.error('Error assigning skill to domain:', error);
    return null;
  }

  return data;
}

/**
 * Remove a skill from a domain
 */
export async function removeSkillFromDomain(
  skillId: string,
  domainId: string
): Promise<boolean> {
  const supabase = createBrowserClient();

  // Don't allow removing the primary domain (from skills table)
  const { data: skill } = await supabase
    .from('skills')
    .select('domain_id')
    .eq('id', skillId)
    .single();

  if (skill?.domain_id === domainId) {
    console.error('Cannot remove primary domain from skill');
    return false;
  }

  const { error } = await supabase
    .from('skill_domain_assignments')
    .delete()
    .eq('skill_id', skillId)
    .eq('domain_id', domainId);

  if (error) {
    console.error('Error removing skill from domain:', error);
    return false;
  }

  return true;
}

/**
 * Set a domain as primary for a skill
 */
export async function setPrimaryDomain(
  skillId: string,
  domainId: string
): Promise<boolean> {
  const supabase = createBrowserClient();

  // Update the skill's domain_id
  const { error: skillError } = await supabase
    .from('skills')
    .update({ domain_id: domainId })
    .eq('id', skillId);

  if (skillError) {
    console.error('Error updating skill primary domain:', skillError);
    return false;
  }

  // Update assignment to primary (trigger will handle unsetting others)
  const { error: assignError } = await supabase
    .from('skill_domain_assignments')
    .upsert({
      skill_id: skillId,
      domain_id: domainId,
      is_primary: true,
    }, { onConflict: 'skill_id,domain_id' });

  if (assignError) {
    console.error('Error setting primary domain assignment:', assignError);
    return false;
  }

  return true;
}

/**
 * Get all skills in a domain (including secondary assignments)
 */
export async function getSkillsInDomain(domainId: string): Promise<string[]> {
  const supabase = createBrowserClient();

  // Get skills with this as primary domain
  const { data: primarySkills } = await supabase
    .from('skills')
    .select('id')
    .eq('domain_id', domainId);

  // Get skills with this as secondary domain
  const { data: secondarySkills } = await supabase
    .from('skill_domain_assignments')
    .select('skill_id')
    .eq('domain_id', domainId);

  const skillIds = new Set<string>();

  primarySkills?.forEach(s => skillIds.add(s.id));
  secondarySkills?.forEach(s => skillIds.add(s.skill_id));

  return Array.from(skillIds);
}
