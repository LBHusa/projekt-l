// Generated Database Types for Supabase
// Based on migrations/20241226_001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ConnectionType = 'prerequisite' | 'synergy' | 'related';

export interface Database {
  public: {
    Tables: {
      skill_domains: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          description: string | null;
          display_order: number;
          faction_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          color?: string;
          description?: string | null;
          display_order?: number;
          faction_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          color?: string;
          description?: string | null;
          display_order?: number;
          faction_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          domain_id: string;
          parent_skill_id: string | null;
          name: string;
          icon: string;
          image_url: string | null;
          description: string | null;
          display_order: number;
          depth: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          domain_id: string;
          parent_skill_id?: string | null;
          name: string;
          icon?: string;
          image_url?: string | null;
          description?: string | null;
          display_order?: number;
          depth?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain_id?: string;
          parent_skill_id?: string | null;
          name?: string;
          icon?: string;
          image_url?: string | null;
          description?: string | null;
          display_order?: number;
          depth?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      skill_connections: {
        Row: {
          id: string;
          skill_a_id: string;
          skill_b_id: string;
          connection_type: ConnectionType;
          strength: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          skill_a_id: string;
          skill_b_id: string;
          connection_type?: ConnectionType;
          strength?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          skill_a_id?: string;
          skill_b_id?: string;
          connection_type?: ConnectionType;
          strength?: number;
          created_at?: string;
        };
      };
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill_id: string;
          level: number;
          current_xp: number;
          last_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_id: string;
          level?: number;
          current_xp?: number;
          last_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill_id?: string;
          level?: number;
          current_xp?: number;
          last_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      experiences: {
        Row: {
          id: string;
          user_id: string;
          skill_id: string;
          description: string;
          xp_gained: number;
          date: string;
          evidence_urls: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_id: string;
          description: string;
          xp_gained: number;
          date?: string;
          evidence_urls?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill_id?: string;
          description?: string;
          xp_gained?: number;
          date?: string;
          evidence_urls?: string[];
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          avatar_url: string | null;
          total_level: number;
          total_xp: number;
          attributes: {
            str: number;
            dex: number;
            int: number;
            cha: number;
            wis: number;
            vit: number;
          } | null;
          factions: {
            karriere: number;
            hobbys: number;
            koerper: number;
            geist: number;
            finanzen: number;
            soziales: number;
            weisheit: number;
          } | null;
          mental_stats: {
            stimmung: number;
            motivation: number;
            stress: number;
            fokus: number;
            kreativitaet: number;
            soziale_batterie: number;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          avatar_url?: string | null;
          total_level?: number;
          total_xp?: number;
          attributes?: {
            str: number;
            dex: number;
            int: number;
            cha: number;
            wis: number;
            vit: number;
          } | null;
          factions?: {
            karriere: number;
            familie: number;
            hobbys: number;
            fitness: number;
            lernen: number;
            freunde: number;
            finanzen: number;
          } | null;
          mental_stats?: {
            stimmung: number;
            motivation: number;
            stress: number;
            fokus: number;
            kreativitaet: number;
            soziale_batterie: number;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string | null;
          avatar_url?: string | null;
          total_level?: number;
          total_xp?: number;
          attributes?: {
            str: number;
            dex: number;
            int: number;
            cha: number;
            wis: number;
            vit: number;
          } | null;
          factions?: {
            karriere: number;
            familie: number;
            hobbys: number;
            fitness: number;
            lernen: number;
            freunde: number;
            finanzen: number;
          } | null;
          mental_stats?: {
            stimmung: number;
            motivation: number;
            stress: number;
            fokus: number;
            kreativitaet: number;
            soziale_batterie: number;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      skills_with_domain: {
        Row: {
          id: string;
          domain_id: string;
          parent_skill_id: string | null;
          name: string;
          icon: string;
          image_url: string | null;
          description: string | null;
          display_order: number;
          depth: number;
          created_at: string;
          updated_at: string;
          domain_name: string;
          domain_icon: string;
          domain_color: string;
        };
      };
      user_skills_full: {
        Row: {
          id: string;
          user_id: string;
          skill_id: string;
          level: number;
          current_xp: number;
          last_used: string | null;
          created_at: string;
          updated_at: string;
          skill_name: string;
          skill_icon: string;
          skill_description: string | null;
          domain_name: string;
          domain_icon: string;
          domain_color: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      connection_type: ConnectionType;
    };
  };
}

// Convenience type exports
export type SkillDomain = Database['public']['Tables']['skill_domains']['Row'];
export type Skill = Database['public']['Tables']['skills']['Row'];
export type SkillConnection = Database['public']['Tables']['skill_connections']['Row'];
export type UserSkill = Database['public']['Tables']['user_skills']['Row'];
export type Experience = Database['public']['Tables']['experiences']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export type SkillWithDomain = Database['public']['Views']['skills_with_domain']['Row'];
export type UserSkillFull = Database['public']['Views']['user_skills_full']['Row'];

// Hierarchical skill types for 5-level structure
export interface SkillWithHierarchy extends Skill {
  children?: SkillWithHierarchy[];
  path?: SkillAncestor[]; // Breadcrumb path from root to this skill
}

export interface SkillAncestor {
  id: string;
  name: string;
  icon: string;
  depth: number;
}

// Type for skill tree nodes with user progress
export interface SkillTreeNode extends Skill {
  children: SkillTreeNode[];
  userLevel?: number;
  userXp?: number;
}

// =============================================
// Graph Views - Gespeicherte Ansichten
// =============================================

export interface GraphView {
  id: string;
  domain_id: string;
  name: string;
  description: string | null;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  direction: 'TB' | 'LR';
  node_positions: Record<string, { x: number; y: number }>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type GraphViewInsert = Omit<GraphView, 'id' | 'created_at' | 'updated_at'>;
export type GraphViewUpdate = Partial<GraphViewInsert>;

// View State für Runtime (nicht in DB)
export interface ViewState {
  viewport: { x: number; y: number; zoom: number };
  nodePositions: Record<string, { x: number; y: number }>;
  direction: 'TB' | 'LR';
}

// =============================================
// User Attributes - RPG Character Stats
// PRD Section 2.1: Charakter-Statistiken
// =============================================

export interface UserAttributes {
  str: number; // Strength (Stärke)
  dex: number; // Dexterity (Geschicklichkeit)
  int: number; // Intelligence (Intelligenz)
  cha: number; // Charisma
  wis: number; // Wisdom (Weisheit)
  vit: number; // Vitality (Vitalität)
}

// Erweiterte UserProfile mit Attributen
export interface UserProfileWithAttributes extends UserProfile {
  attributes: UserAttributes | null;
}

// =============================================
// User Factions - Life Balance (Lebensbereiche)
// PRD Section 2.15: Factions & Lebensbereiche
// =============================================

export interface UserFactions {
  karriere: number;   // 💼 Karriere/Arbeit
  hobbys: number;     // 🎮 Hobbys/Freizeit
  koerper: number;    // 🏃 Koerper/Fitness
  geist: number;      // 🧠 Geist/Mental
  finanzen: number;   // 💰 Finanzen
  soziales: number;   // 👥 Soziales (Familie + Freunde)
  weisheit: number;   // 📚 Weisheit/Bildung
}

// =============================================
// Mental Stats - Seele & Kopf
// PRD Section 2.14: Mentale Stats
// =============================================

export interface MentalStats {
  stimmung: number;          // 😊 Mood
  motivation: number;        // 🔥 Motivation
  stress: number;            // 😰 Stress (niedrig = gut!)
  fokus: number;             // 🎯 Focus
  kreativitaet: number;      // 💡 Creativity
  soziale_batterie: number;  // 🔋 Social Battery
}

// =============================================
// Factions - Zwei-Ebenen-System
// Phase 1 Implementation
// =============================================

export type FactionId = 'karriere' | 'hobbys' | 'koerper' | 'geist' | 'finanzen' | 'soziales' | 'weisheit';

export interface Faction {
  id: FactionId;
  name: string;
  name_de: string;
  icon: string;
  color: string;
  description: string | null;
  display_order: number;
}

export interface UserFactionStats {
  id: string;
  user_id: string;
  faction_id: FactionId;
  total_xp: number;
  weekly_xp: number;
  monthly_xp: number;
  level: number;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

// Joined type for UI display
export interface FactionWithStats extends Faction {
  stats: UserFactionStats | null;
}

// For XP logging with faction override
export interface ExperienceWithFaction extends Experience {
  faction_id: FactionId | null;
  faction_override: boolean;
}

// =============================================
// Skill-Hierarchie - Phase 1b
// Multi-Domain, Templates, XP-Propagation
// =============================================

export interface SkillDomainAssignment {
  id: string;
  skill_id: string;
  domain_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface SkillTemplateData {
  domain: {
    name: string;
    icon: string;
    color: string;
  };
  skills: SkillTemplateSkill[];
}

export interface SkillTemplateSkill {
  name: string;
  icon: string;
  description?: string;
  children?: SkillTemplateSkill[];
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

// Extended Skill with propagation fields
export interface SkillWithPropagation extends Skill {
  xp_propagation_rate: number;
  aggregate_child_xp: number;
}

// =============================================
// Phase 2: Dashboard & Lebensbereiche
// =============================================

// =============================================
// Habits System
// =============================================

export type HabitType = 'positive' | 'negative';
export type HabitFrequency = 'daily' | 'weekly' | 'specific_days';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  habit_type: HabitType;
  frequency: HabitFrequency;
  target_days: string[];
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  xp_per_completion: number;
  faction_id: FactionId | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  logged_at: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface HabitWithLogs extends Habit {
  logs: HabitLog[];
  completedToday: boolean;
}

// =============================================
// Habit Multi-Faction Support
// =============================================

export interface HabitFaction {
  id: string;
  habit_id: string;
  faction_id: FactionId;
  weight: number; // 1-100, percentage of XP going to this faction
  created_at: string;
}

export interface HabitFactionDisplay {
  faction_id: FactionId;
  faction_name: string;
  faction_icon: string;
  faction_color: string;
  weight: number;
}

export interface HabitWithFactions extends Habit {
  factions: HabitFactionDisplay[];
}

export interface HabitWithFactionsAndLogs extends HabitWithFactions {
  logs: HabitLog[];
  completedToday: boolean;
}

// =============================================
// Karriere (Career)
// =============================================

export type EmploymentType = 'full_time' | 'part_time' | 'freelance' | 'contract' | 'internship';

export interface JobHistory {
  id: string;
  user_id: string;
  company: string;
  position: string;
  employment_type: EmploymentType;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  location: string | null;
  skills_used: string[];
  achievements: string[];
  is_parallel: boolean;
  parent_job_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SalaryPeriod = 'monthly' | 'yearly' | 'hourly';

export interface SalaryEntry {
  id: string;
  user_id: string;
  job_id: string | null;
  amount: number;
  currency: string;
  period: SalaryPeriod;
  bonus: number;
  equity_value: number;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

export type CareerGoalStatus = 'active' | 'achieved' | 'abandoned';

export interface CareerGoalMilestone {
  title: string;
  completed: boolean;
  completed_at: string | null;
}

export interface CareerGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: CareerGoalStatus;
  progress: number;
  milestones: CareerGoalMilestone[];
  created_at: string;
  updated_at: string;
}

// =============================================
// Hobbys (Hobbies)
// =============================================

export type HobbyProjectStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface HobbyProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string;
  status: HobbyProjectStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  total_hours: number;
  related_skill_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HobbyTimeLog {
  id: string;
  project_id: string;
  user_id: string;
  duration_minutes: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

// =============================================
// Gesundheit (Health)
// =============================================

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sports' | 'hiit' | 'yoga' | 'other';
export type WorkoutIntensity = 'low' | 'medium' | 'high';

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_type: WorkoutType;
  name: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: WorkoutIntensity | null;
  exercises: WorkoutExercise[];
  occurred_at: string;
  notes: string | null;
  xp_gained: number;
  related_skill_id: string | null;
  created_at: string;
}

export type MetricType = 'weight' | 'body_fat' | 'muscle_mass' | 'bmi' | 'height' | 'waist' | 'chest' | 'arms';

export interface BodyMetric {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export type TrainingGoal = 'strength' | 'endurance' | 'weight_loss' | 'muscle_gain' | 'flexibility';

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  goal: TrainingGoal | null;
  schedule: Record<string, WorkoutExercise[]>;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Lernen (Learning)
// =============================================

export type BookStatus = 'to_read' | 'reading' | 'read' | 'abandoned';

export interface BookHighlight {
  page: number;
  text: string;
  note: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  cover_url: string | null;
  genre: string | null;
  pages: number | null;
  status: BookStatus;
  rating: number | null;
  current_page: number;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  highlights: BookHighlight[];
  related_skill_id: string | null;
  xp_gained: number;
  created_at: string;
  updated_at: string;
}

export type CourseStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned';

export interface Course {
  id: string;
  user_id: string;
  title: string;
  platform: string | null;
  instructor: string | null;
  url: string | null;
  status: CourseStatus;
  progress: number;
  total_hours: number | null;
  completed_hours: number;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  certificate_url: string | null;
  related_skill_id: string | null;
  xp_gained: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// Freunde (Friends) - Social Events
// =============================================

export type SocialEventType = 'party' | 'dinner' | 'trip' | 'activity' | 'meetup' | 'call' | 'other';

export interface SocialEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: SocialEventType | null;
  occurred_at: string;
  duration_minutes: number | null;
  location: string | null;
  participants: string[];
  participant_count: number;
  photos_urls: string[];
  notes: string | null;
  xp_gained: number;
  created_at: string;
}

// =============================================
// Finanzen (Finance)
// =============================================

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'crypto' | 'cash' | 'loan';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  institution: string | null;
  currency: string;
  current_balance: number;
  is_active: boolean;
  is_excluded_from_net_worth: boolean;
  icon: string | null;
  color: string | null;
  credit_limit: number | null;
  interest_rate: number | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  account_id: string;
  user_id: string;
  transaction_type: TransactionType;
  category: string | null;
  amount: number;
  description: string | null;
  occurred_at: string;
  to_account_id: string | null;
  tags: string[];
  is_recurring: boolean;
  recurring_frequency: string | null;
  next_occurrence: string | null;
  recurrence_end_date: string | null;
  created_at: string;
}

// =============================================
// Recurring Flows (Daueraufträge)
// =============================================

export type RecurringFlowSourceType = 'income' | 'account';
export type RecurringFlowTargetType = 'account' | 'expense' | 'savings';
export type RecurringFlowFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringFlow {
  id: string;
  user_id: string;

  // Quelle
  source_type: RecurringFlowSourceType;
  source_id: string | null;      // account_id wenn source_type = 'account'
  source_category: string | null; // z.B. 'salary' wenn source_type = 'income'

  // Ziel
  target_type: RecurringFlowTargetType;
  target_id: string | null;      // account_id oder savings_goal_id
  target_category: string | null; // z.B. 'housing' wenn target_type = 'expense'

  // Betrag und Frequenz
  amount: number;
  frequency: RecurringFlowFrequency;

  // Beschreibung
  name: string;
  description: string | null;

  // Zeitraum
  start_date: string;
  end_date: string | null;
  next_due_date: string | null;

  // Status
  is_active: boolean;

  // Metadaten
  created_at: string;
  updated_at: string;
}

export interface RecurringFlowCreate {
  source_type: RecurringFlowSourceType;
  source_id?: string | null;
  source_category?: string | null;
  target_type: RecurringFlowTargetType;
  target_id?: string | null;
  target_category?: string | null;
  amount: number;
  frequency: RecurringFlowFrequency;
  name: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

export type AssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'commodity' | 'other';

export interface Investment {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType | null;
  quantity: number;
  average_cost: number | null;
  current_price: number | null;
  purchased_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Net Worth View
export interface UserNetWorth {
  user_id: string;
  net_worth: number;
  cash_total: number;
  investments_total: number;
  crypto_total: number;
  debt_total: number;
  account_count: number;
}

// Extended Net Worth with Level
export interface UserNetWorthExtended extends UserNetWorth {
  net_worth_level: number;
}

// =============================================
// Savings Goals (Sparziele mit Zinseszins)
// =============================================

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  interest_rate: number;
  compounds_per_year: number;
  start_date: string;
  target_date: string | null;
  is_achieved: boolean;
  achieved_at: string | null;
  xp_reward: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalProgress extends SavingsGoal {
  progress_percent: number;
  projected_amount: number;
  days_remaining: number | null;
}

// =============================================
// Finance Achievements (Meilensteine)
// =============================================

export type FinanceAchievementType =
  | 'net_worth_milestone'
  | 'savings_streak'
  | 'goal_reached'
  | 'first_investment'
  | 'budget_master'
  | 'debt_free'
  | 'positive_cashflow'
  | 'diversified';

export interface FinanceAchievement {
  id: string;
  user_id: string;
  achievement_type: FinanceAchievementType;
  achievement_key: string;
  title: string;
  description: string | null;
  icon: string;
  xp_reward: number;
  unlocked_at: string;
  progress_current: number;
  progress_target: number;
  is_unlocked: boolean;
  created_at: string;
}

// Achievement Definitions (für UI)
export interface AchievementDefinition {
  key: string;
  type: FinanceAchievementType;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition: (data: FinanceAchievementData) => boolean;
}

export interface FinanceAchievementData {
  netWorth: number;
  savingsStreak: number;
  goalsReached: number;
  investmentCount: number;
  budgetsKept: number;
  debtTotal: number;
  positiveCashflowMonths: number;
  assetTypes: number;
}

// =============================================
// Finance Streaks
// =============================================

export type FinanceStreakType =
  | 'positive_cashflow'
  | 'savings_contribution'
  | 'budget_kept'
  | 'no_impulse_buy';

export interface FinanceStreak {
  id: string;
  user_id: string;
  streak_type: FinanceStreakType;
  current_streak: number;
  longest_streak: number;
  last_checked_date: string | null;
  last_success_date: string | null;
  xp_per_day: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// Net Worth History (für Charts)
// =============================================

export interface NetWorthHistory {
  id: string;
  user_id: string;
  recorded_at: string;
  net_worth: number;
  cash_total: number;
  investments_total: number;
  crypto_total: number;
  debt_total: number;
  created_at: string;
}

// =============================================
// Transaction Categories (für Sankey)
// =============================================

export interface TransactionCategory {
  id: string;
  user_id: string;
  name: string;
  parent_category: string | null;
  icon: string;
  color: string;
  is_income: boolean;
  is_savings: boolean;
  is_investment: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// =============================================
// Cashflow Summary
// =============================================

export interface MonthlyCashflow {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  net: number;
}

// Für Sankey-Diagramm
export interface MoneyFlowNode {
  id: string;
  name: string;
  color: string;
}

export interface MoneyFlowLink {
  source: string;
  target: string;
  value: number;
}

export interface MoneyFlowData {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
  // Simplified view data
  income: { category: string; amount: number }[];
  expenses: { category: string; amount: number }[];
  savings: number;
  investments: number;
  totalIncome: number;
  totalExpenses: number;
}

// Smart Tips
export interface FinanceSmartTip {
  id: string;
  type: 'warning' | 'suggestion' | 'achievement';
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

// =============================================
// Activity Log
// =============================================

export type ActivityType =
  | 'xp_gained'
  | 'level_up'
  | 'habit_completed'
  | 'workout_logged'
  | 'book_finished'
  | 'course_completed'
  | 'job_started'
  | 'salary_updated'
  | 'goal_achieved'
  | 'project_completed'
  | 'event_logged'
  | 'transaction_added'
  | 'investment_made';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  faction_id: FactionId | null;
  title: string;
  description: string | null;
  xp_amount: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// =============================================
// GEIST: Mood & Journal (Mental/Mind)
// =============================================

export type MoodValue = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface MoodLog {
  id: string;
  user_id: string;
  mood: MoodValue;
  note: string | null;
  xp_gained: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  prompt: string | null;
  word_count: number;
  xp_gained: number;
  created_at: string;
}

export interface MoodStats {
  total_logs: number;
  great_count: number;
  good_count: number;
  okay_count: number;
  bad_count: number;
  terrible_count: number;
  avg_mood_score: number;
  streak_days: number;
}

export interface GeistStats {
  moodStats: MoodStats | null;
  journalCount: number;
  totalWords: number;
  todaysMood: MoodLog | null;
}

// =============================================
// KOERPER: Training / Workout System
// =============================================

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body' | 'cardio';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'kettlebell' | 'resistance_band' | 'none';
export type WorkoutSessionType = 'strength' | 'cardio' | 'flexibility' | 'mixed' | 'hiit';
export type SetType = 'warmup' | 'working' | 'dropset' | 'failure';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | null;
  description: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  name: string | null;
  workout_type: WorkoutSessionType;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  notes: string | null;
  xp_earned: number;
  created_at: string;
}

export interface WorkoutExerciseRecord {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_order: number;
  notes: string | null;
  created_at: string;
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: SetType;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string;
}

// Extended types for UI
export interface WorkoutExerciseWithDetails extends WorkoutExerciseRecord {
  exercise: Exercise;
  sets: ExerciseSet[];
}

export interface WorkoutWithDetails extends WorkoutSession {
  exercises: WorkoutExerciseWithDetails[];
  total_sets: number;
  total_volume_kg: number;
}

export interface PersonalRecord {
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: MuscleGroup;
  max_weight: number;
  reps_at_max: number;
  achieved_at: string;
}

export interface WorkoutStats {
  total_workouts: number;
  total_duration_minutes: number;
  total_xp_earned: number;
  workouts_this_week: number;
  favorite_muscle_group: MuscleGroup | null;
}
