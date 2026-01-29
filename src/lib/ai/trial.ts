/**
 * AI Trial System
 * Manages 5-hour free AI trial after onboarding completion
 */

import { createClient } from '@/lib/supabase/server';
import { hasLlmApiKey } from '@/lib/data/llm-keys';

// Trial duration in milliseconds (5 hours)
const TRIAL_DURATION_MS = 5 * 60 * 60 * 1000;

export interface TrialStatus {
  /** true if trial is currently active (within 5 hours) */
  isInTrial: boolean;
  /** When the trial ends (null if no trial started) */
  trialEndsAt: Date | null;
  /** Remaining minutes of trial */
  remainingMinutes: number;
  /** Whether user has their own API key configured */
  hasOwnKey: boolean;
  /** Whether user can use AI (either in trial or has own key) */
  canUseAI: boolean;
  /** When the trial started (null if no trial) */
  trialStartedAt: Date | null;
}

/**
 * Get the trial status for a user
 * Logic:
 * 1. If user has own API key -> canUseAI = true (no trial needed)
 * 2. If trial_started_at not set -> Onboarding not complete, no AI access
 * 3. If < 5h since trial_started_at -> Trial active, server key allowed
 * 4. If > 5h since trial_started_at -> Trial expired, own key needed
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  // First check if user has their own API key
  const hasOwnKey = await hasLlmApiKey(userId, 'anthropic');

  if (hasOwnKey) {
    return {
      isInTrial: false,
      trialEndsAt: null,
      remainingMinutes: 0,
      hasOwnKey: true,
      canUseAI: true,
      trialStartedAt: null,
    };
  }

  // Get trial start time from user profile
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('trial_started_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Trial] Error fetching trial status:', error);
    return {
      isInTrial: false,
      trialEndsAt: null,
      remainingMinutes: 0,
      hasOwnKey: false,
      canUseAI: false,
      trialStartedAt: null,
    };
  }

  // No trial started (onboarding not complete)
  if (!profile?.trial_started_at) {
    return {
      isInTrial: false,
      trialEndsAt: null,
      remainingMinutes: 0,
      hasOwnKey: false,
      canUseAI: false,
      trialStartedAt: null,
    };
  }

  const trialStartedAt = new Date(profile.trial_started_at);
  const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DURATION_MS);
  const now = new Date();

  const remainingMs = Math.max(0, trialEndsAt.getTime() - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  const isInTrial = remainingMs > 0;

  return {
    isInTrial,
    trialEndsAt,
    remainingMinutes,
    hasOwnKey: false,
    canUseAI: isInTrial,
    trialStartedAt,
  };
}

/**
 * Check if user can use AI (either in trial or has own key)
 * Shortcut function for API routes
 */
export async function canUserUseAI(userId: string): Promise<{
  allowed: boolean;
  reason?: 'trial_active' | 'own_key' | 'trial_expired' | 'no_trial';
  remainingMinutes?: number;
}> {
  const status = await getTrialStatus(userId);

  if (status.hasOwnKey) {
    return { allowed: true, reason: 'own_key' };
  }

  if (status.isInTrial) {
    return {
      allowed: true,
      reason: 'trial_active',
      remainingMinutes: status.remainingMinutes,
    };
  }

  if (status.trialStartedAt) {
    return { allowed: false, reason: 'trial_expired' };
  }

  return { allowed: false, reason: 'no_trial' };
}

/**
 * Start the trial for a user (called after onboarding completion)
 */
export async function startTrial(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({
      trial_started_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Trial] Error starting trial:', error);
    return false;
  }

  return true;
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return 'Abgelaufen';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }

  return `${mins}min`;
}
