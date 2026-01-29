/**
 * TypeScript interfaces for AI-powered onboarding
 * Step 1-8 Onboarding Flow with Claude Analysis
 */

import type { FactionId } from '@/lib/database.types';

// =============================================
// Step 2: "Erzähl mir von dir" Types
// =============================================

/**
 * Education data for career section
 */
export interface EducationData {
  type: 'ausbildung' | 'bachelor' | 'master' | 'promotion' | 'quereinsteiger' | 'freelancer' | '';
  field: string; // Fachrichtung (Freitext)
  graduationYear?: number | 'in_progress'; // Optional
}

/**
 * Free-text responses for all 7 life areas
 */
export interface TellMeAboutYouData {
  // Career has structured data + free text
  karriereEducation: EducationData;
  karriere: string;
  // Other areas are free text only
  hobby: string;
  koerper: string;
  geist: string;
  finanzen: string;
  soziales: string;
  wissen: string;
}

// =============================================
// Step 3-4-5: AI Analysis Result Types
// =============================================

/**
 * AI-generated skill with reasoning
 */
export interface AIGeneratedSkill {
  id: string;
  name: string;
  factionId: FactionId;
  suggestedLevel: number; // 1-100
  experience: 'beginner' | 'intermediate' | 'expert';
  reason: string; // Why this skill was suggested
  accepted: boolean;
  edited: boolean;
}

/**
 * AI-generated habit with reasoning
 */
export interface AIGeneratedHabit {
  id: string;
  name: string;
  factionId: FactionId;
  icon: string;
  suggestedFrequency: number; // 1-7 per week
  reason: string; // Why this habit was suggested
  accepted: boolean;
  edited: boolean;
}

/**
 * Complete AI analysis result from Claude
 */
export interface AIAnalysisResult {
  characterClass: string; // e.g., "Heilerin", "Gelehrter", "Händler"
  characterDescription: string; // 2-3 sentences about the character
  factionLevels: Record<FactionId, number>; // Starting levels per faction (5-60)
  skills: AIGeneratedSkill[];
  habits: AIGeneratedHabit[];
}

// =============================================
// API Request/Response Types
// =============================================

/**
 * Request body for /api/onboarding/analyze
 */
export interface AnalyzeRequest {
  factionRatings: FactionRating[];
  tellMeAboutYou: TellMeAboutYouData;
}

/**
 * Response from /api/onboarding/analyze
 */
export interface AnalyzeResponse {
  success: boolean;
  result?: AIAnalysisResult;
  error?: string;
  fallback?: boolean; // True if using static fallback due to API error
}

/**
 * Request body for /api/onboarding/regenerate
 */
export interface RegenerateRequest {
  originalData: AnalyzeRequest;
  feedback: string;
  regenerateType: 'skills' | 'habits' | 'both';
}

/**
 * Response from /api/onboarding/regenerate
 */
export interface RegenerateResponse {
  success: boolean;
  skills?: AIGeneratedSkill[];
  habits?: AIGeneratedHabit[];
  error?: string;
}

// =============================================
// Onboarding Wizard Types (Extended)
// =============================================

/**
 * Faction rating from Step 1
 */
export interface FactionRating {
  factionId: FactionId;
  importance: number; // 1-5 stars
  currentStatus: number; // 1-10
}

/**
 * Deep dive data (legacy, kept for backward compatibility)
 */
export interface DeepDiveData {
  factionId: FactionId;
  yearsExperience: number;
  mainGoal: string;
}

/**
 * Manual skill entry (for custom additions)
 */
export interface SkillEntry {
  name: string;
  factionId: FactionId;
  experience: 'beginner' | 'intermediate' | 'expert';
}

/**
 * Manual habit entry (for custom additions)
 */
export interface HabitEntry {
  name: string;
  factionId: FactionId;
  frequencyPerWeek: number;
  icon: string;
}

/**
 * Profile data from Step 6
 */
export interface ProfileData {
  displayName: string;
  avatarSeed: string;
  bio: string;
}

/**
 * Notification settings from Step 7
 * Uses quiet hours (Ruhezeiten) instead of fixed reminder time
 */
export interface NotificationSettings {
  enableReminders: boolean;
  /** @deprecated Use quietHoursStart/End instead */
  reminderTime?: string;
  /** Start of quiet hours (no notifications), e.g., "22:00" */
  quietHoursStart: string;
  /** End of quiet hours (notifications resume), e.g., "07:00" */
  quietHoursEnd: string;
  enableTelegram: boolean;
}

/**
 * Selected negative habit from templates
 */
export interface SelectedNegativeHabit {
  templateId: string;
  name: string;
  icon: string;
  affectedFactions: FactionId[];
}

/**
 * Complete onboarding data structure (9-step version)
 */
export interface OnboardingData {
  // Step 1: Faction ratings
  factionRatings: FactionRating[];
  // Step 2: Free-text responses
  tellMeAboutYou: TellMeAboutYouData;
  // Step 3: AI analysis result
  aiAnalysis: AIAnalysisResult | null;
  // Step 4: Reviewed skills (accepted items from AI)
  skills: AIGeneratedSkill[];
  // Step 5: Negative habits to reduce (NEW)
  negativeHabits: SelectedNegativeHabit[];
  // Step 6: Positive habits (accepted items from AI)
  habits: AIGeneratedHabit[];
  // Step 7: Profile
  profile: ProfileData;
  // Step 8: Notifications
  notifications: NotificationSettings;
  // Legacy fields (for backward compatibility)
  deepDive: DeepDiveData[];
}

// =============================================
// UI Helper Types
// =============================================

/**
 * Questions for "Tell Me About You" step
 */
export const TELL_ME_QUESTIONS: Record<FactionId, string> = {
  karriere: 'Was machst du beruflich? Erzähl mir von deiner aktuellen Arbeit und deinen Aufgaben.',
  hobby: 'Was sind deine Hobbys? Was machst du gerne in deiner Freizeit?',
  koerper: 'Wie hältst du dich fit? Treibst du Sport?',
  geist: 'Wie pflegst du deine mentale Gesundheit? (Meditation, Journaling, etc.)',
  finanzen: 'Was sind deine finanziellen Ziele? (Sparen, Investieren, etc.)',
  soziales: 'Wie pflegst du deine Beziehungen? (Familie, Freunde, Partner)',
  wissen: 'Was lernst du gerade oder möchtest du lernen?',
};

/**
 * Education type options for career section
 */
export const EDUCATION_TYPES = [
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'bachelor', label: 'Studium (Bachelor)' },
  { value: 'master', label: 'Studium (Master/Diplom)' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'quereinsteiger', label: 'Quereinsteiger' },
  { value: 'freelancer', label: 'Freelancer/Selbstständig' },
] as const;

/**
 * Graduation year options
 */
export const GRADUATION_YEARS = [
  { value: 'in_progress', label: 'Noch in Ausbildung/Studium' },
  ...Array.from({ length: 17 }, (_, i) => ({
    value: 2010 + i,
    label: String(2010 + i),
  })),
] as const;

/**
 * Character class mappings based on top factions
 */
export const CHARACTER_CLASSES: Record<string, { name: string; description: string }> = {
  'karriere,finanzen': { name: 'Händler', description: 'Ein geschäftstüchtiger Stratege mit Blick für Profit' },
  'karriere,wissen': { name: 'Gelehrter', description: 'Ein wissbegieriger Experte mit professionellem Fokus' },
  'karriere,soziales': { name: 'Diplomat', description: 'Ein charismatischer Vermittler mit Führungsqualitäten' },
  'koerper,geist': { name: 'Mönch', description: 'Ein ausgeglichener Krieger zwischen Körper und Geist' },
  'koerper,hobby': { name: 'Abenteurer', description: 'Ein aktiver Entdecker mit Freude an Bewegung' },
  'koerper,soziales': { name: 'Krieger', description: 'Ein starker Beschützer mit großem Herzen' },
  'geist,wissen': { name: 'Weiser', description: 'Ein tiefgründiger Denker auf der Suche nach Erkenntnis' },
  'geist,hobby': { name: 'Künstler', description: 'Eine kreative Seele mit innerer Balance' },
  'wissen,hobby': { name: 'Erfinder', description: 'Ein neugieriger Bastler mit Innovationsgeist' },
  'soziales,hobby': { name: 'Barde', description: 'Ein geselliger Unterhalter mit vielen Talenten' },
  'finanzen,wissen': { name: 'Alchemist', description: 'Ein analytischer Forscher mit Gespür für Werte' },
  'finanzen,soziales': { name: 'Gildemeister', description: 'Ein vernetzter Stratege mit Geschäftssinn' },
  'geist,finanzen': { name: 'Orakel', description: 'Ein vorausschauender Planer mit innerer Ruhe' },
  'koerper,finanzen': { name: 'Gladiator', description: 'Ein disziplinierter Kämpfer mit klaren Zielen' },
  'koerper,wissen': { name: 'Ranger', description: 'Ein wissbegieriger Athlet mit Naturverbundenheit' },
  'soziales,wissen': { name: 'Mentor', description: 'Ein weiser Lehrer mit großem sozialen Engagement' },
  'hobby,finanzen': { name: 'Sammler', description: 'Ein leidenschaftlicher Enthusiast mit Wertgespür' },
};

/**
 * Default empty TellMeAboutYouData
 */
export const EMPTY_TELL_ME_DATA: TellMeAboutYouData = {
  karriereEducation: { type: '', field: '', graduationYear: undefined },
  karriere: '',
  hobby: '',
  koerper: '',
  geist: '',
  finanzen: '',
  soziales: '',
  wissen: '',
};

/**
 * Default empty AIAnalysisResult
 */
export const EMPTY_AI_ANALYSIS: AIAnalysisResult = {
  characterClass: '',
  characterDescription: '',
  factionLevels: {
    karriere: 10,
    hobby: 10,
    koerper: 10,
    geist: 10,
    finanzen: 10,
    soziales: 10,
    wissen: 10,
  },
  skills: [],
  habits: [],
};
