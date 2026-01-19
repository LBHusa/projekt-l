import { createBrowserClient } from '@/lib/supabase';
import type { UserSkill, UserSkillFull, Experience, UserProfile, FactionId, XpDistributionResult } from '@/lib/database.types';
import { addXp, xpForLevel } from '@/lib/xp';
import { getFactionForSkill, updateFactionStats } from './factions';
import { getDomainFactions, getPrimaryFactionForDomain } from './domains';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// ============================================
// USER SKILLS DATA ACCESS
// ============================================

// Default test user ID (for MVP without auth)
// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

export async function getUserSkills(userId?: string): Promise<UserSkillFull[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_skills_full')
    .select('*')
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching user skills:', error);
    throw error;
  }

  return data || [];
}

export async function getUserSkillsByDomain(
  domainId: string,
  userId?: string
): Promise<UserSkillFull[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Get skills for domain with user progress
  const { data, error } = await supabase
    .from('user_skills_full')
    .select('*')
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching user skills:', error);
    throw error;
  }

  // Filter by domain (domain_name comes from the view)
  // We need a different approach - let's do a join
  return data || [];
}

export async function getUserSkillForSkill(
  skillId: string,
  userId?: string
): Promise<UserSkill | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('skill_id', skillId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching user skill:', error);
    throw error;
  }

  return data;
}

// Alias for getUserSkillForSkill
export const getUserSkillBySkillId = getUserSkillForSkill;

export async function ensureUserSkill(
  skillId: string,
  userId?: string
): Promise<UserSkill> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Try to get existing
  const existing = await getUserSkillForSkill(skillId, userId);
  if (existing) {
    return existing;
  }

  // Create new
  const { data, error } = await supabase
    .from('user_skills')
    .insert({
      user_id: resolvedUserId,
      skill_id: skillId,
      level: 1,
      current_xp: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user skill:', error);
    throw error;
  }

  return data;
}

export interface AddXpOptions {
  skillId: string;
  xpAmount: number;
  description: string;
  userId?: string;
  factionOverride?: FactionId; // Optional: Override the default faction
}

export interface AddXpResult {
  userSkill: UserSkill;
  experience: Experience;
  leveledUp: boolean;
  factionId: FactionId | null;
  factionLeveledUp?: boolean;
  xpDistribution?: XpDistributionResult[];
}

export async function addXpToSkill(
  skillId: string,
  xpAmount: number,
  description: string,
  userId?: string,
  factionOverride?: FactionId
): Promise<AddXpResult> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  // Use API route to bypass RLS
  const response = await fetch("/api/skills/xp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skillId,
      xp: xpAmount,
      description,
      userId,
      factionOverride,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add XP");
  }

  const result = await response.json();
  
  return {
    userSkill: result.data.userSkill,
    experience: result.data.experience,
    leveledUp: result.data.leveledUp,
    factionId: result.data.factionId,
    factionLeveledUp: result.data.factionLeveledUp,
    xpDistribution: result.data.xpDistribution,
  };
}

/**
/**
 * Distribute XP to multiple factions based on domain weights
 * Uses N:M skill_domain_factions mappings
 */
async function distributeXpToFactions(
  domainId: string,
  xpAmount: number,
  userId: string
): Promise<XpDistributionResult[]> {
  const domainFactions = await getDomainFactions(domainId);

  if (domainFactions.length === 0) {
    // Fallback to legacy faction_key
    const primaryFaction = await getPrimaryFactionForDomain(domainId);
    if (primaryFaction) {
      await updateFactionStats(primaryFaction, xpAmount, userId);
      return [{ faction_id: primaryFaction, xp_distributed: xpAmount }];
    }
    return [];
  }

  // Calculate total weight for normalization
  const totalWeight = domainFactions.reduce((sum, df) => sum + df.weight, 0);
  if (totalWeight === 0) return [];

  const results: XpDistributionResult[] = [];

  // Distribute XP proportionally
  for (const df of domainFactions) {
    const distributedXp = Math.round((xpAmount * df.weight) / totalWeight);
    if (distributedXp > 0) {
      await updateFactionStats(df.faction_id, distributedXp, userId);
      results.push({
        faction_id: df.faction_id,
        xp_distributed: distributedXp,
      });
    }
  }

  return results;
}

/**
 * Propagate XP to parent skills recursively
 * Default rate is 50% of XP to parent
 */
async function propagateXpToParent(
  skillId: string,
  xpAmount: number,
  userId: string
): Promise<void> {
  const supabase = createBrowserClient();

  // Get skill with parent info
  const { data: skill, error } = await supabase
    .from('skills')
    .select('parent_skill_id, xp_propagation_rate')
    .eq('id', skillId)
    .single();

  if (error || !skill?.parent_skill_id) {
    return; // No parent, stop propagation
  }

  const propagationRate = skill.xp_propagation_rate || 0.5;
  const propagatedXp = Math.floor(xpAmount * propagationRate);

  if (propagatedXp < 1) {
    return; // Too small to propagate
  }

  // Update parent skill's aggregate_child_xp (fetch current value first)
  const { data: parentSkillData } = await supabase
    .from('skills')
    .select('aggregate_child_xp')
    .eq('id', skill.parent_skill_id)
    .single();

  const currentAggregate = parentSkillData?.aggregate_child_xp || 0;

  await supabase
    .from('skills')
    .update({
      aggregate_child_xp: currentAggregate + propagatedXp
    })
    .eq('id', skill.parent_skill_id);

  // Ensure parent user_skill exists and add XP
  const { data: existingParentSkill } = await supabase
    .from('user_skills')
    .select('id, current_xp, level')
    .eq('user_id', userId)
    .eq('skill_id', skill.parent_skill_id)
    .single();

  if (existingParentSkill) {
    // Update existing
    const newXp = existingParentSkill.current_xp + propagatedXp;
    await supabase
      .from('user_skills')
      .update({
        current_xp: newXp,
        last_used: new Date().toISOString(),
      })
      .eq('id', existingParentSkill.id);
  } else {
    // Create new
    await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_id: skill.parent_skill_id,
        level: 1,
        current_xp: propagatedXp,
        last_used: new Date().toISOString(),
      });
  }

  // Recursively propagate to grandparent
  await propagateXpToParent(skill.parent_skill_id, propagatedXp, userId);
}

// ============================================
// EXPERIENCES DATA ACCESS
// ============================================

export async function getExperiencesForSkill(
  skillId: string,
  userId?: string,
  limit: number = 10
): Promise<Experience[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('skill_id', skillId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching experiences:', error);
    throw error;
  }

  return data || [];
}

export async function getRecentExperiences(
  userId?: string,
  limit: number = 10
): Promise<Experience[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent experiences:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// USER PROFILE DATA ACCESS
// ============================================

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return data;
}

async function updateUserTotalXp(userId: string, xpToAdd: number): Promise<void> {
  const supabase = createBrowserClient();

  // Get current profile
  const profile = await getUserProfile(userId);
  if (!profile) {
    return;
  }

  const newTotalXp = profile.total_xp + xpToAdd;

  // Calculate new total level (simplified - every 1000 XP = 1 level)
  const newTotalLevel = Math.floor(newTotalXp / 1000) + 1;

  await supabase
    .from('user_profiles')
    .update({
      total_xp: newTotalXp,
      total_level: newTotalLevel,
    })
    .eq('user_id', userId);
}

// ============================================
// AGGREGATE DATA ACCESS
// ============================================

/**
 * Get the total count of all skills in the database
 */
export async function getTotalSkillCount(): Promise<number> {
  const supabase = createBrowserClient();

  const { count, error } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting skills:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get the count of skills the user has interacted with
 */
export async function getUserActiveSkillCount(
  userId?: string
): Promise<number> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { count, error } = await supabase
    .from('user_skills')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error counting user skills:', error);
    return 0;
  }

  return count || 0;
}

export async function getDomainStats(
  domainId: string,
  userId?: string
): Promise<{
  totalSkills: number;
  activeSkills: number;
  averageLevel: number;
  totalXp: number;
}> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  // Get skills count in domain
  const { count: totalSkills } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })
    .eq('domain_id', domainId);

  // Get user skills for domain
  const { data: skills } = await supabase
    .from('skills')
    .select('id')
    .eq('domain_id', domainId);

  if (!skills || skills.length === 0) {
    return {
      totalSkills: totalSkills || 0,
      activeSkills: 0,
      averageLevel: 0,
      totalXp: 0,
    };
  }

  const skillIds = skills.map(s => s.id);

  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', resolvedUserId)
    .in('skill_id', skillIds);

  if (!userSkills || userSkills.length === 0) {
    return {
      totalSkills: totalSkills || 0,
      activeSkills: 0,
      averageLevel: 0,
      totalXp: 0,
    };
  }

  const totalXp = userSkills.reduce((sum, us) => {
    // Calculate total XP including current XP and all previous levels
    let xp = us.current_xp;
    for (let l = 1; l < us.level; l++) {
      xp += xpForLevel(l);
    }
    return sum + xp;
  }, 0);

  const averageLevel =
    userSkills.reduce((sum, us) => sum + us.level, 0) / userSkills.length;

  return {
    totalSkills: totalSkills || 0,
    activeSkills: userSkills.length,
    averageLevel: Math.round(averageLevel),
    totalXp,
  };
}

// ============================================
// ATTRIBUTE CALCULATION
// ============================================

type UserAttributes = {
  str: number;
  dex: number;
  int: number;
  cha: number;
  wis: number;
  vit: number;
};

const FACTION_TO_ATTR: Record<FactionId, keyof UserAttributes> = {
  koerper: 'str',
  hobby: 'dex',
  wissen: 'int',
  soziales: 'cha',
  geist: 'wis',
  karriere: 'vit',
  finanzen: 'vit',
};

/**
 * Calculate user attributes based on XP gained in the last 30 days
 * Maps faction activity to RPG attributes (STR, DEX, INT, CHA, WIS, VIT)
 */
export async function calculateAttributes(
  userId?: string
): Promise<UserAttributes> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: experiences } = await supabase
    .from('experiences')
    .select('faction_id, xp_gained')
    .eq('user_id', resolvedUserId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .not('faction_id', 'is', null);

  const xpByAttr: Record<keyof UserAttributes, number> = {
    str: 0,
    dex: 0,
    int: 0,
    cha: 0,
    wis: 0,
    vit: 0,
  };

  for (const exp of experiences || []) {
    const attr = FACTION_TO_ATTR[exp.faction_id as FactionId];
    if (attr) xpByAttr[attr] += exp.xp_gained;
  }

  // Base 10 + bonus from XP (every 500 XP = +1, max 100)
  return {
    str: Math.min(100, 10 + Math.floor(xpByAttr.str / 500)),
    dex: Math.min(100, 10 + Math.floor(xpByAttr.dex / 500)),
    int: Math.min(100, 10 + Math.floor(xpByAttr.int / 500)),
    cha: Math.min(100, 10 + Math.floor(xpByAttr.cha / 500)),
    wis: Math.min(100, 10 + Math.floor(xpByAttr.wis / 500)),
    vit: Math.min(100, 10 + Math.floor(xpByAttr.vit / 500)),
  };
}
