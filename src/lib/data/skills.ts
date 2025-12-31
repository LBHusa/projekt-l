import { createBrowserClient } from '@/lib/supabase';
import type { Skill, SkillWithDomain, SkillConnection, SkillWithHierarchy, SkillAncestor, SkillTreeNode } from '@/lib/database.types';

// ============================================
// SKILLS DATA ACCESS
// ============================================

export async function getSkillsByDomain(domainId: string): Promise<Skill[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching skills:', error);
    throw error;
  }

  return data || [];
}

export async function getRootSkillsByDomain(domainId: string): Promise<Skill[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .is('parent_skill_id', null)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching root skills:', error);
    throw error;
  }

  return data || [];
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching skill:', error);
    throw error;
  }

  return data;
}

export async function getChildSkills(parentSkillId: string): Promise<Skill[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('parent_skill_id', parentSkillId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching child skills:', error);
    throw error;
  }

  return data || [];
}

export async function createSkill(skill: {
  domain_id: string;
  parent_skill_id?: string | null;
  name: string;
  icon?: string;
  description?: string;
}): Promise<Skill> {
  const supabase = createBrowserClient();

  // Get max display_order for domain
  const { data: maxOrder } = await supabase
    .from('skills')
    .select('display_order')
    .eq('domain_id', skill.domain_id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('skills')
    .insert({
      domain_id: skill.domain_id,
      parent_skill_id: skill.parent_skill_id || null,
      name: skill.name,
      icon: skill.icon || '⭐',
      description: skill.description || null,
      display_order: (maxOrder?.display_order || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating skill:', error);
    throw error;
  }

  return data;
}

export async function updateSkill(
  id: string,
  updates: Partial<Pick<Skill, 'name' | 'icon' | 'image_url' | 'description' | 'parent_skill_id' | 'display_order'>>
): Promise<Skill> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating skill:', error);
    throw error;
  }

  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting skill:', error);
    throw error;
  }
}

// ============================================
// SKILL CONNECTIONS DATA ACCESS
// ============================================

export async function getSkillConnections(skillId: string): Promise<SkillConnection[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_connections')
    .select('*')
    .or(`skill_a_id.eq.${skillId},skill_b_id.eq.${skillId}`);

  if (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }

  return data || [];
}

export async function getConnectionsForDomain(domainId: string): Promise<SkillConnection[]> {
  const supabase = createBrowserClient();

  // First get all skill IDs in domain
  const { data: skills } = await supabase
    .from('skills')
    .select('id')
    .eq('domain_id', domainId);

  if (!skills || skills.length === 0) {
    return [];
  }

  const skillIds = skills.map(s => s.id);

  // Get connections where both skills are in domain
  const { data, error } = await supabase
    .from('skill_connections')
    .select('*')
    .in('skill_a_id', skillIds)
    .in('skill_b_id', skillIds);

  if (error) {
    console.error('Error fetching domain connections:', error);
    throw error;
  }

  return data || [];
}

export async function createConnection(connection: {
  skill_a_id: string;
  skill_b_id: string;
  connection_type?: 'prerequisite' | 'synergy' | 'related';
  strength?: number;
}): Promise<SkillConnection> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_connections')
    .insert({
      skill_a_id: connection.skill_a_id,
      skill_b_id: connection.skill_b_id,
      connection_type: connection.connection_type || 'related',
      strength: connection.strength || 5,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating connection:', error);
    throw error;
  }

  return data;
}

export async function deleteConnection(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('skill_connections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting connection:', error);
    throw error;
  }
}

export interface ConnectedSkillInfo {
  connectedSkill: Skill;
  type: 'prerequisite' | 'synergy' | 'related';
  strength: number;
  // Domain info for the connected skill
  domain: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  // Breadcrumb path within the domain (ancestors)
  path: SkillAncestor[];
}

export async function getConnectedSkills(skillId: string): Promise<ConnectedSkillInfo[]> {
  const supabase = createBrowserClient();

  // Get all connections for this skill
  const { data: connections, error } = await supabase
    .from('skill_connections')
    .select('*')
    .or(`skill_a_id.eq.${skillId},skill_b_id.eq.${skillId}`);

  if (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }

  if (!connections || connections.length === 0) {
    return [];
  }

  // Get the connected skill IDs
  const connectedSkillIds = connections.map(conn =>
    conn.skill_a_id === skillId ? conn.skill_b_id : conn.skill_a_id
  );

  // Fetch the connected skills WITH domain info using the view
  const { data: skillsWithDomain, error: skillsError } = await supabase
    .from('skills_with_domain')
    .select('*')
    .in('id', connectedSkillIds);

  if (skillsError) {
    console.error('Error fetching connected skills:', skillsError);
    throw skillsError;
  }

  // For each connected skill, get its ancestors for the path
  const results: ConnectedSkillInfo[] = [];

  for (const conn of connections) {
    const connectedSkillId = conn.skill_a_id === skillId ? conn.skill_b_id : conn.skill_a_id;
    const skillData = skillsWithDomain?.find(s => s.id === connectedSkillId);

    if (!skillData) continue;

    // Get ancestors for path
    let ancestors: SkillAncestor[] = [];
    try {
      const ancestorResult = await getSkillWithAncestors(connectedSkillId);
      if (ancestorResult) {
        ancestors = ancestorResult.ancestors;
      }
    } catch {
      // Ignore ancestor errors, use empty path
    }

    results.push({
      connectedSkill: {
        id: skillData.id,
        domain_id: skillData.domain_id,
        parent_skill_id: skillData.parent_skill_id,
        name: skillData.name,
        icon: skillData.icon,
        image_url: skillData.image_url,
        description: skillData.description,
        display_order: skillData.display_order,
        depth: skillData.depth,
        created_at: skillData.created_at,
        updated_at: skillData.updated_at,
      },
      type: conn.connection_type as 'prerequisite' | 'synergy' | 'related',
      strength: conn.strength,
      domain: {
        id: skillData.domain_id,
        name: skillData.domain_name,
        icon: skillData.domain_icon,
        color: skillData.domain_color,
      },
      path: ancestors,
    });
  }

  return results;
}

// ============================================
// HIERARCHICAL SKILL FUNCTIONS (5-Level Structure)
// ============================================

/**
 * Get complete skill tree for a domain
 * Returns all skills organized in a tree structure
 */
export async function getSkillTree(domainId: string): Promise<SkillWithHierarchy[]> {
  const supabase = createBrowserClient();

  // Get all skills for domain ordered by depth and display_order
  const { data: skills, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .order('depth', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching skill tree:', error);
    throw error;
  }

  if (!skills || skills.length === 0) {
    return [];
  }

  // Build tree structure
  return buildSkillTree(skills);
}

/**
 * Build a tree structure from flat skill list
 */
function buildSkillTree(skills: Skill[]): SkillWithHierarchy[] {
  const skillMap = new Map<string, SkillWithHierarchy>();
  const rootSkills: SkillWithHierarchy[] = [];

  // First pass: create map of all skills with empty children array
  skills.forEach(skill => {
    skillMap.set(skill.id, { ...skill, children: [] });
  });

  // Second pass: assign children to parents
  skills.forEach(skill => {
    const skillNode = skillMap.get(skill.id)!;

    if (skill.parent_skill_id) {
      const parent = skillMap.get(skill.parent_skill_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(skillNode);
      } else {
        // Parent not in this domain, treat as root
        rootSkills.push(skillNode);
      }
    } else {
      rootSkills.push(skillNode);
    }
  });

  return rootSkills;
}

/**
 * Get skills at a specific depth level within a domain
 */
export async function getSkillsByDepth(domainId: string, depth: number): Promise<Skill[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .eq('depth', depth)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching skills by depth:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get skill with its ancestors (for breadcrumb navigation)
 */
export async function getSkillWithAncestors(skillId: string): Promise<{
  skill: Skill;
  ancestors: SkillAncestor[];
} | null> {
  const supabase = createBrowserClient();

  // Get the skill itself
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single();

  if (skillError) {
    if (skillError.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching skill:', skillError);
    throw skillError;
  }

  // Get ancestors using recursive CTE via RPC function
  const { data: ancestors, error: ancestorsError } = await supabase
    .rpc('get_skill_ancestors', { skill_uuid: skillId });

  if (ancestorsError) {
    console.error('Error fetching ancestors:', ancestorsError);
    // If RPC fails, try manual traversal
    const manualAncestors = await getAncestorsManually(skill);
    return { skill, ancestors: manualAncestors };
  }

  return {
    skill,
    ancestors: (ancestors || []) as SkillAncestor[]
  };
}

/**
 * Manual ancestor traversal (fallback if RPC not available)
 */
async function getAncestorsManually(skill: Skill): Promise<SkillAncestor[]> {
  const supabase = createBrowserClient();
  const ancestors: SkillAncestor[] = [];
  let currentSkill = skill;

  while (currentSkill.parent_skill_id) {
    const { data: parent, error } = await supabase
      .from('skills')
      .select('*')
      .eq('id', currentSkill.parent_skill_id)
      .single();

    if (error || !parent) break;

    ancestors.unshift({
      id: parent.id,
      name: parent.name,
      icon: parent.icon,
      depth: parent.depth,
    });

    currentSkill = parent;
  }

  return ancestors;
}

/**
 * Get all descendant skills of a parent (recursive)
 */
export async function getDescendants(parentSkillId: string): Promise<Skill[]> {
  const supabase = createBrowserClient();

  // Get the parent skill to know its domain
  const { data: parent } = await supabase
    .from('skills')
    .select('domain_id')
    .eq('id', parentSkillId)
    .single();

  if (!parent) return [];

  // Get all skills in domain
  const { data: allSkills, error } = await supabase
    .from('skills')
    .select('*')
    .eq('domain_id', parent.domain_id);

  if (error || !allSkills) return [];

  // Build set of descendant IDs
  const descendants: Skill[] = [];
  const toProcess = [parentSkillId];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    const children = allSkills.filter(s => s.parent_skill_id === currentId);

    children.forEach(child => {
      descendants.push(child);
      toProcess.push(child.id);
    });
  }

  return descendants;
}

/**
 * Get skills at a specific level with their immediate children
 * Useful for displaying a level with expandable items
 */
export async function getSkillsWithChildren(
  domainId: string,
  parentId: string | null = null
): Promise<SkillWithHierarchy[]> {
  const supabase = createBrowserClient();

  // Get skills at this level
  const query = supabase
    .from('skills')
    .select('*')
    .eq('domain_id', domainId)
    .order('display_order', { ascending: true });

  if (parentId === null) {
    query.is('parent_skill_id', null);
  } else {
    query.eq('parent_skill_id', parentId);
  }

  const { data: skills, error } = await query;

  if (error) {
    console.error('Error fetching skills with children:', error);
    throw error;
  }

  if (!skills || skills.length === 0) return [];

  // Get all children for these skills
  const skillIds = skills.map(s => s.id);
  const { data: children } = await supabase
    .from('skills')
    .select('*')
    .in('parent_skill_id', skillIds)
    .order('display_order', { ascending: true });

  // Attach children to parents
  return skills.map(skill => ({
    ...skill,
    children: (children || []).filter(c => c.parent_skill_id === skill.id),
  }));
}
