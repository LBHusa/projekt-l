// ============================================
// SKILL TEMPLATES DATA ACCESS
// Phase 1b: Template System for Quick Onboarding
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// Default test user ID (for MVP without auth)
// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

// ============================================
// Types
// ============================================

export interface SkillTemplateSkill {
  name: string;
  icon: string;
  description?: string;
  children?: SkillTemplateSkill[];
}

export interface SkillTemplateData {
  domain: {
    name: string;
    icon: string;
    color: string;
  };
  skills: SkillTemplateSkill[];
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string;
  template_data: SkillTemplateData;
  is_official: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all templates, optionally filtered by category
 */
export async function getTemplates(category?: string): Promise<SkillTemplate[]> {
  const supabase = createBrowserClient();

  let query = supabase
    .from('skill_templates')
    .select('*')
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching skill templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get official templates only
 */
export async function getOfficialTemplates(): Promise<SkillTemplate[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_templates')
    .select('*')
    .eq('is_official', true)
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error fetching official templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<SkillTemplate | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data;
}

/**
 * Get template categories with counts
 */
export async function getTemplateCategories(): Promise<{ category: string; count: number }[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_templates')
    .select('category');

  if (error) {
    console.error('Error fetching template categories:', error);
    return [];
  }

  // Count by category
  const counts: Record<string, number> = {};
  data?.forEach(t => {
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return Object.entries(counts).map(([category, count]) => ({ category, count }));
}

/**
 * Apply a template - creates domain and skills
 */
export async function applyTemplate(
  templateId: string,
  userId?: string
): Promise<{ domainId: string; skillCount: number } | null> {
  const supabase = createBrowserClient();

  // Get the template
  const template = await getTemplate(templateId);
  if (!template) {
    console.error('Template not found');
    return null;
  }

  const { domain, skills } = template.template_data;

  // Create domain
  const { data: newDomain, error: domainError } = await supabase
    .from('skill_domains')
    .insert({
      name: domain.name,
      icon: domain.icon,
      color: domain.color,
      description: `Erstellt aus Template: ${template.name}`,
    })
    .select()
    .single();

  if (domainError) {
    console.error('Error creating domain from template:', domainError);
    return null;
  }

  // Create skills recursively
  let skillCount = 0;

  async function createSkill(
    skill: SkillTemplateSkill,
    parentId: string | null = null
  ): Promise<string | null> {
    const { data: newSkill, error } = await supabase
      .from('skills')
      .insert({
        domain_id: newDomain.id,
        parent_skill_id: parentId,
        name: skill.name,
        icon: skill.icon,
        description: skill.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating skill from template:', error);
      return null;
    }

    skillCount++;

    // Create children
    if (skill.children && skill.children.length > 0) {
      for (const child of skill.children) {
        await createSkill(child, newSkill.id);
      }
    }

    return newSkill.id;
  }

  // Create all root skills
  for (const skill of skills) {
    await createSkill(skill);
  }

  // Update usage count
  await supabase
    .from('skill_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', templateId);

  return {
    domainId: newDomain.id,
    skillCount,
  };
}

/**
 * Create a new template from existing domain
 */
export async function createTemplateFromDomain(
  domainId: string,
  name: string,
  description: string,
  category: string,
  userId?: string
): Promise<SkillTemplate | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Get domain
  const { data: domain, error: domainError } = await supabase
    .from('skill_domains')
    .select('*')
    .eq('id', domainId)
    .single();

  if (domainError || !domain) {
    console.error('Domain not found');
    return null;
  }

  // Get all skills in domain with hierarchy
  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .order('display_order');

  if (skillsError) {
    console.error('Error fetching skills:', skillsError);
    return null;
  }

  // Build hierarchical structure
  function buildSkillTree(parentId: string | null): SkillTemplateSkill[] {
    return (skills || [])
      .filter(s => s.parent_skill_id === parentId)
      .map(s => ({
        name: s.name,
        icon: s.icon,
        description: s.description,
        children: buildSkillTree(s.id),
      }));
  }

  const templateData: SkillTemplateData = {
    domain: {
      name: domain.name,
      icon: domain.icon,
      color: domain.color,
    },
    skills: buildSkillTree(null),
  };

  // Create template
  const { data: template, error } = await supabase
    .from('skill_templates')
    .insert({
      name,
      description,
      category,
      icon: domain.icon,
      template_data: templateData,
      is_official: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }

  return template;
}

/**
 * Delete a template (only if created by user)
 */
export async function deleteTemplate(
  templateId: string,
  userId?: string
): Promise<boolean> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Only delete if user created it or it's not official
  const { error } = await supabase
    .from('skill_templates')
    .delete()
    .eq('id', templateId)
    .eq('created_by', userId);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }

  return true;
}
