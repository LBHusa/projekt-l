// ============================================
// HEALTH DATA ACCESS
// Uses authenticated user from session
// Phase 2: Konsequenzen & HP/Death System
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type { UserHealth, HealthEvent } from '@/lib/database.types';

// ============================================
// HEALTH STATUS CRUD
// ============================================

/**
 * Get user's current health status
 * Auto-initializes if no record exists (100 HP, 3 lives)
 */
export async function getUserHealth(userId?: string): Promise<UserHealth | null> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_health')
    .select('*')
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record - initialize
      return initUserHealth(resolvedUserId);
    }
    console.error('Error fetching user health:', error);
    throw error;
  }

  return data;
}

/**
 * Initialize health record for new user
 * Called automatically by getUserHealth if no record exists
 */
export async function initUserHealth(userId?: string): Promise<UserHealth> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_health')
    .insert({
      user_id: resolvedUserId,
      current_hp: 100,
      max_hp: 100,
      lives: 3,
      max_lives: 3,
      prestige_level: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error initializing user health:', error);
    throw error;
  }

  return data;
}

/**
 * Get recent health events (for activity feed/debug)
 */
export async function getHealthEvents(
  userId?: string,
  limit: number = 20
): Promise<HealthEvent[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('health_events')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching health events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Apply HP change to user via RPC
 * Returns the new health state after the change
 */
export async function applyHpChange(
  hpChange: number,
  eventType: string = 'heal_manual',
  sourceTable?: string | null,
  sourceId?: string | null,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<{
  new_hp: number;
  new_lives: number;
  death_occurred: boolean;
  awaiting_prestige: boolean;
}> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('apply_hp_change', {
    p_user_id: resolvedUserId,
    p_hp_change: hpChange,
    p_event_type: eventType,
    p_source_table: sourceTable ?? null,
    p_source_id: sourceId ?? null,
    p_metadata: metadata ?? {}
  });

  if (error) {
    console.error('Error applying HP change:', error);
    throw error;
  }

  // RPC returns array with single row
  const result = Array.isArray(data) ? data[0] : data;
  return result;
}

/**
 * Perform prestige (reset after game over)
 */
export async function performPrestige(userId?: string): Promise<{
  new_prestige_level: number;
  new_hp: number;
  new_lives: number;
}> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('perform_prestige', {
    p_user_id: resolvedUserId
  });

  if (error) {
    console.error('Error performing prestige:', error);
    throw error;
  }

  // RPC returns array with single row
  const result = Array.isArray(data) ? data[0] : data;
  return result;
}

// ============================================
// HEALTH UTILITIES
// ============================================

/**
 * Calculate HP percentage (for UI bars)
 */
export function getHpPercentage(health: UserHealth): number {
  return Math.max(0, Math.min(100, (health.current_hp / health.max_hp) * 100));
}

/**
 * Check if user is in danger zone (< 20 HP)
 */
export function isInDangerZone(health: UserHealth): boolean {
  return getHpPercentage(health) < 20;
}

/**
 * Get HP status level for UI theming
 */
export function getHpStatus(
  health: UserHealth
): 'flourishing' | 'normal' | 'struggling' | 'danger' {
  const percentage = getHpPercentage(health);

  if (percentage >= 80) return 'flourishing';
  if (percentage >= 50) return 'normal';
  if (percentage >= 20) return 'struggling';
  return 'danger';
}

/**
 * Get HP color based on status (for UI)
 */
export function getHpColor(health: UserHealth): string {
  const status = getHpStatus(health);

  switch (status) {
    case 'flourishing':
      return 'text-green-500';
    case 'normal':
      return 'text-yellow-500';
    case 'struggling':
      return 'text-orange-500';
    case 'danger':
      return 'text-red-500';
  }
}

/**
 * Get HP bar color class based on status (for progress bars)
 */
export function getHpBarColor(health: UserHealth): string {
  const status = getHpStatus(health);

  switch (status) {
    case 'flourishing':
      return 'bg-green-500';
    case 'normal':
      return 'bg-yellow-500';
    case 'struggling':
      return 'bg-orange-500';
    case 'danger':
      return 'bg-red-500';
  }
}

/**
 * Format HP display string
 */
export function formatHpDisplay(health: UserHealth): string {
  return `${health.current_hp}/${health.max_hp} HP`;
}

/**
 * Format lives display string
 */
export function formatLivesDisplay(health: UserHealth): string {
  return `${health.lives}/${health.max_lives}`;
}

/**
 * Check if user is in game over state
 */
export function isGameOver(health: UserHealth): boolean {
  return health.awaiting_prestige === true;
}

/**
 * Calculate HP change preview (for UI)
 * Returns what the new HP would be after applying change
 */
export function previewHpChange(
  health: UserHealth,
  hpChange: number
): { newHp: number; wouldDie: boolean } {
  const newHp = Math.max(0, Math.min(health.max_hp, health.current_hp + hpChange));
  const wouldDie = health.current_hp > 0 && newHp === 0;

  return { newHp, wouldDie };
}
