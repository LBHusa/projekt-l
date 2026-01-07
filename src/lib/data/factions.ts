// ============================================
// FACTIONS DATA ACCESS
// Phase 1: Zwei-Ebenen-System
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import type { Faction, FactionId, UserFactionStats, FactionWithStats } from '@/lib/database.types';

// Default test user ID (for MVP without auth)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

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
 */
export async function getUserFactionStats(
  userId: string = TEST_USER_ID
): Promise<UserFactionStats[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_faction_stats')
    .select('*')
    .eq('user_id', userId)
    .order('faction_id');

  if (error) {
    console.error('Error fetching user faction stats:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user's stats for a specific faction
 */
export async function getUserFactionStat(
  factionId: FactionId,
  userId: string = TEST_USER_ID
): Promise<UserFactionStats | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_faction_stats')
    .select('*')
    .eq('user_id', userId)
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
 */
export async function getFactionsWithStats(
  userId: string = TEST_USER_ID
): Promise<FactionWithStats[]> {
  const factions = await getAllFactions();
  const stats = await getUserFactionStats(userId);

  return factions.map(faction => ({
    ...faction,
    stats: stats.find(s => s.faction_id === faction.id) || null,
  }));
}

/**
 * Update faction stats after XP gain
 * Called from addXpToSkill when XP is logged
 */
export async function updateFactionStats(
  factionId: FactionId,
  xpAmount: number,
  userId: string = TEST_USER_ID
): Promise<UserFactionStats> {
  const supabase = createBrowserClient();

  // Call the database function to upsert and recalculate level
  const { error: fnError } = await supabase
    .rpc('update_faction_stats', {
      p_user_id: userId,
      p_faction_id: factionId,
      p_xp_amount: xpAmount,
    });

  if (fnError) {
    console.error('Error updating faction stats:', fnError);
    throw fnError;
  }

  // Return the updated stats
  const updated = await getUserFactionStat(factionId, userId);
  if (!updated) {
    throw new Error(`Failed to get updated faction stats for ${factionId}`);
  }

  return updated;
}

/**
 * Initialize faction stats for a new user
 * Creates entries for all 7 factions with 0 XP
 */
export async function initUserFactionStats(
  userId: string = TEST_USER_ID
): Promise<void> {
  const supabase = createBrowserClient();
  const factions = await getAllFactions();

  const inserts = factions.map(f => ({
    user_id: userId,
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
// ============================================

/**
 * Calculate faction level from total XP
 * Formula: floor(sqrt(xp/100))
 * Level 1: 0-99 XP
 * Level 2: 100-399 XP
 * Level 5: 2,500-3,599 XP
 * Level 10: 10,000-12,099 XP
 */
export function calculateFactionLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

/**
 * Calculate XP needed for a specific level
 * Inverse of calculateFactionLevel
 */
export function xpForFactionLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

/**
 * Calculate progress to next level (0-100%)
 */
export function factionLevelProgress(totalXp: number): number {
  const currentLevel = calculateFactionLevel(totalXp);
  const currentLevelXp = xpForFactionLevel(currentLevel);
  const nextLevelXp = xpForFactionLevel(currentLevel + 1);
  const xpInLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  return Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
}

// ============================================
// DOMAIN-TO-FACTION MAPPING
// ============================================

/**
 * Get the default faction for a skill domain
 * Uses skill_domains.faction_key
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
