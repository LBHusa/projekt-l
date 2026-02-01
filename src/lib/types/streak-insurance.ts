// ============================================
// Streak Insurance Token Types
// ============================================

export type TokenType = 'standard' | 'premium';
export type TokenReason = 'login_bonus' | 'achievement' | 'purchase' | 'trial_bonus';

export interface StreakInsuranceToken {
  id: string;
  user_id: string;
  token_type: TokenType;
  reason: TokenReason;
  is_used: boolean;
  used_at: string | null;
  used_for_habit_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface UseTokenResult {
  success: boolean;
  token?: StreakInsuranceToken;
  error?: string;
}

export interface TokenStats {
  available: number;
  used: number;
  expired: number;
}
