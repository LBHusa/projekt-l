import { createBrowserClient } from '@/lib/supabase';
import type { SkillDomain } from '@/lib/database.types';

// ============================================
// SKILL DOMAINS DATA ACCESS
// ============================================

export async function getAllDomains(): Promise<SkillDomain[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching domains:', error);
    throw error;
  }

  return data || [];
}

export async function getDomainById(id: string): Promise<SkillDomain | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
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
