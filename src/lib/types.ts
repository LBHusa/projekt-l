// Projekt L - TypeScript Types

// ============================================
// Skill Domain (Root-Orbs auf dem Dashboard)
// ============================================
export interface SkillDomain {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Skill (einzelner Skill innerhalb einer Domain)
// ============================================
export interface Skill {
  id: string;
  domain_id: string;
  parent_skill_id: string | null;
  name: string;
  icon: string;
  image_url: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// User-Skill-Fortschritt
// ============================================
export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  level: number;
  current_xp: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Skill mit User-Fortschritt (kombiniert)
// ============================================
export interface SkillWithProgress extends Skill {
  level: number;
  current_xp: number;
  xp_for_next_level: number;
  progress_percent: number;
  last_used: string | null;
}

// ============================================
// Skill-Verbindungen
// ============================================
export type ConnectionType = 'prerequisite' | 'synergy' | 'related';

export interface SkillConnection {
  id: string;
  skill_a_id: string;
  skill_b_id: string;
  connection_type: ConnectionType;
  strength: number; // 1-10
  created_at: string;
}

// ============================================
// Experience (XP-Eintrag)
// ============================================
export interface Experience {
  id: string;
  user_id: string;
  skill_id: string;
  description: string;
  xp_gained: number;
  date: string;
  evidence_urls: string[];
  created_at: string;
}

// ============================================
// User Profile
// ============================================
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  total_level: number;
  total_xp: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// UI State Types
// ============================================
export interface NavigationState {
  currentView: 'dashboard' | 'domain' | 'skill';
  currentDomainId: string | null;
  currentSkillId: string | null;
}

// ============================================
// Form Types
// ============================================
export interface CreateSkillForm {
  name: string;
  domain_id: string;
  parent_skill_id: string | null;
  icon: string;
  description: string;
  initial_level: number;
}

export interface UpdateSkillForm {
  name?: string;
  icon?: string;
  description?: string;
}

export interface AddXPForm {
  skill_id: string;
  xp_amount: number;
  description: string;
}
