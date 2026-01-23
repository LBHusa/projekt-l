// ============================================
// FACTIONS DATA ACCESS
// Uses authenticated user from session
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type { Faction, FactionId, UserFactionStats, FactionWithStats } from '@/lib/database.types';

// Maximum faction level for radar chart scaling
export const MAX_FACTION_LEVEL = 20;

// ============================================
// FACTIONS CRUD
// ============================================

/**
 * Get all factions (7 fixed life areas)
 */
export async function getAllFactions(): Promise<Faction[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('factions')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching factions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single faction by ID
 */
export async function getFaction(factionId: FactionId): Promise<Faction | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('factions')
    .select('*')
    .eq('id', factionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching faction:', error);
    throw error;
  }

  return data;
}

// ============================================
// USER FACTION STATS
// ============================================

/**
 * Get user's stats for all factions
 * @param userId - Optional user ID. If not provided, uses current authenticated user
 */
export async function getUserFactionStats(
  userId?: string
): Promise<UserFactionStats[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_faction_stats')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('faction_id');

  if (error) {
    console.error('Error fetching user faction stats:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user's stats for a specific faction
 * @param factionId - The faction ID
 * @param userId - Optional user ID. If not provided, uses current authenticated user
 */
export async function getUserFactionStat(
  factionId: FactionId,
  userId?: string
): Promise<UserFactionStats | null> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_faction_stats')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('faction_id', factionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user faction stat:', error);
    throw error;
  }

  return data;
}

/**
 * Get all factions with user stats joined
 * @param userId - Optional user ID. If not provided, uses current authenticated user
 */
export async function getFactionsWithStats(
  userId?: string
): Promise<FactionWithStats[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const factions = await getAllFactions();
  const stats = await getUserFactionStats(userId);

  return factions.map(faction => ({
    ...faction,
    stats: stats.find(s => s.faction_id === faction.id) || null,
  }));
}

/**
 * Update faction stats after XP gain
 * @param factionId - The faction ID
 * @param xpAmount - XP to add
 * @param userId - Optional user ID. If not provided, uses current authenticated user
 */
export async function updateFactionStats(
  factionId: FactionId,
  xpAmount: number,
  userId?: string
): Promise<UserFactionStats> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  // Call the database function to upsert and recalculate level
  const { error: fnError } = await supabase
    .rpc('update_faction_stats', {
      p_user_id: resolvedUserId,
      p_faction_id: factionId,
      p_xp_amount: xpAmount,
    });

  if (fnError) {
    console.error('Error updating faction stats:', fnError);
    throw fnError;
  }

  // Return the updated stats
  const updated = await getUserFactionStat(factionId, resolvedUserId);
  if (!updated) {
    throw new Error(`Failed to get updated faction stats for ${factionId}`);
  }

  return updated;
}

/**
 * Initialize faction stats for a new user
 * @param userId - Optional user ID. If not provided, uses current authenticated user
 */
export async function initUserFactionStats(userId?: string): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const factions = await getAllFactions();

  const inserts = factions.map(f => ({
    user_id: resolvedUserId,
    faction_id: f.id,
    total_xp: 0,
    weekly_xp: 0,
    monthly_xp: 0,
    level: 1,
  }));

  const { error } = await supabase
    .from('user_faction_stats')
    .upsert(inserts, { onConflict: 'user_id,faction_id' });

  if (error) {
    console.error('Error initializing user faction stats:', error);
    throw error;
  }
}

// ============================================
// LEVEL CALCULATION
// Matches src/lib/xp.ts formula for consistency with database
// Formula: 100 * level^1.5 per level (accumulated)
// ============================================

/**
 * Calculate XP needed for a specific level
 * Formula: floor(100 * level^1.5)
 */
export function xpForFactionLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate total XP needed to reach a specific level
 * (sum of xpForFactionLevel for all levels up to and including the target)
 */
export function totalXpForFactionLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForFactionLevel(i);
  }
  return total;
}

/**
 * Calculate faction level from total XP
 * Uses iterative calculation matching database function
 */
export function calculateFactionLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  let accumulatedXp = 0;

  while (accumulatedXp + xpForFactionLevel(level) <= totalXp) {
    accumulatedXp += xpForFactionLevel(level);
    level++;
  }

  return Math.max(1, level - 1);
}

/**
 * Calculate progress to next level (0-100%)
 * Progress is calculated as: xpInLevel / xpForNextLevel
 *
 * The model is:
 * - At level 1, you have totalXp XP
 * - You need xpForLevel(2) = 282 XP to reach level 2
 * - Progress = totalXp / 282
 *
 * At level 2 (382+ totalXp):
 * - You have (totalXp - 382) XP in level 2
 * - You need xpForLevel(3) = 519 XP to reach level 3
 * - Progress = (totalXp - 382) / 519
 */
export function factionLevelProgress(totalXp: number): number {
  if (totalXp <= 0) return 0;

  const currentLevel = calculateFactionLevel(totalXp);

  // Calculate XP threshold for current level (total XP to reach this level)
  const levelThreshold = totalXpForFactionLevel(currentLevel);

  // XP within current level
  const xpInLevel = totalXp - levelThreshold;

  // XP needed to reach next level
  const xpNeeded = xpForFactionLevel(currentLevel + 1);

  if (xpNeeded <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100)));
}

// ============================================
// DOMAIN-TO-FACTION MAPPING
// ============================================

/**
 * Get the default faction for a skill domain
 */
export async function getFactionForDomain(domainId: string): Promise<FactionId | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skill_domains')
    .select('faction_key')
    .eq('id', domainId)
    .single();

  if (error) {
    console.error('Error fetching domain faction:', error);
    return null;
  }

  return (data?.faction_key as FactionId) || null;
}

/**
 * Get the faction for a skill (via its domain)
 */
export async function getFactionForSkill(skillId: string): Promise<FactionId | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('skills')
    .select('domain_id')
    .eq('id', skillId)
    .single();

  if (error) {
    console.error('Error fetching skill domain:', error);
    return null;
  }

  if (!data?.domain_id) return null;
  return getFactionForDomain(data.domain_id);
}
