// ============================================
// Projekt L - Beziehungs-Management Types
// ============================================

// Beziehungstypen
export type RelationshipType =
  // Familie
  | 'partner'
  | 'spouse'
  | 'child'
  | 'parent'
  | 'grandparent'
  | 'sibling'
  | 'sibling_in_law'
  | 'parent_in_law'
  | 'child_in_law'
  | 'cousin'
  | 'aunt_uncle'
  | 'niece_nephew'
  | 'step_parent'
  | 'step_child'
  | 'step_sibling'
  // Freunde
  | 'close_friend'
  | 'friend'
  | 'acquaintance'
  // Professionell & Andere
  | 'colleague'
  | 'mentor'
  | 'mentee'
  | 'neighbor'
  | 'other';

export type RelationshipCategory = 'family' | 'friend' | 'professional' | 'other';

export type InteractionType =
  | 'call'
  | 'video_call'
  | 'message'
  | 'meeting'
  | 'activity'
  | 'event'
  | 'gift'
  | 'support'
  | 'quality_time'
  | 'other';

export type InteractionQuality = 'poor' | 'neutral' | 'good' | 'great' | 'exceptional';

// ============================================
// Metadaten für UI
// ============================================

export interface RelationshipTypeMeta {
  label: string;
  labelDe: string;
  icon: string;
  category: RelationshipCategory;
}

export const RELATIONSHIP_TYPE_META: Record<RelationshipType, RelationshipTypeMeta> = {
  // Familie
  partner: { label: 'Partner', labelDe: 'Partner/in', icon: '💕', category: 'family' },
  spouse: { label: 'Spouse', labelDe: 'Ehepartner/in', icon: '💍', category: 'family' },
  child: { label: 'Child', labelDe: 'Kind', icon: '👶', category: 'family' },
  parent: { label: 'Parent', labelDe: 'Elternteil', icon: '👨‍👩‍👧', category: 'family' },
  grandparent: { label: 'Grandparent', labelDe: 'Großeltern', icon: '👴', category: 'family' },
  sibling: { label: 'Sibling', labelDe: 'Geschwister', icon: '👫', category: 'family' },
  sibling_in_law: { label: 'Sibling-in-law', labelDe: 'Schwager/in', icon: '👥', category: 'family' },
  parent_in_law: { label: 'Parent-in-law', labelDe: 'Schwiegereltern', icon: '👪', category: 'family' },
  child_in_law: { label: 'Child-in-law', labelDe: 'Schwiegerkind', icon: '👨‍👩‍👧', category: 'family' },
  cousin: { label: 'Cousin', labelDe: 'Cousin/e', icon: '👦', category: 'family' },
  aunt_uncle: { label: 'Aunt/Uncle', labelDe: 'Tante/Onkel', icon: '🧑', category: 'family' },
  niece_nephew: { label: 'Niece/Nephew', labelDe: 'Nichte/Neffe', icon: '👧', category: 'family' },
  step_parent: { label: 'Step-parent', labelDe: 'Stiefeltern', icon: '👨', category: 'family' },
  step_child: { label: 'Step-child', labelDe: 'Stiefkind', icon: '👦', category: 'family' },
  step_sibling: { label: 'Step-sibling', labelDe: 'Stiefgeschwister', icon: '👫', category: 'family' },
  // Freunde
  close_friend: { label: 'Close Friend', labelDe: 'Enge/r Freund/in', icon: '💛', category: 'friend' },
  friend: { label: 'Friend', labelDe: 'Freund/in', icon: '😊', category: 'friend' },
  acquaintance: { label: 'Acquaintance', labelDe: 'Bekannte/r', icon: '👋', category: 'friend' },
  // Professionell
  colleague: { label: 'Colleague', labelDe: 'Kollege/in', icon: '💼', category: 'professional' },
  mentor: { label: 'Mentor', labelDe: 'Mentor/in', icon: '🎓', category: 'professional' },
  mentee: { label: 'Mentee', labelDe: 'Mentee', icon: '📚', category: 'professional' },
  // Andere
  neighbor: { label: 'Neighbor', labelDe: 'Nachbar/in', icon: '🏠', category: 'other' },
  other: { label: 'Other', labelDe: 'Andere', icon: '👤', category: 'other' },
};

export interface InteractionTypeMeta {
  label: string;
  labelDe: string;
  icon: string;
  baseXp: number;
}

export const INTERACTION_TYPE_META: Record<InteractionType, InteractionTypeMeta> = {
  call: { label: 'Call', labelDe: 'Anruf', icon: '📞', baseXp: 15 },
  video_call: { label: 'Video Call', labelDe: 'Videoanruf', icon: '📹', baseXp: 25 },
  message: { label: 'Message', labelDe: 'Nachricht', icon: '💬', baseXp: 5 },
  meeting: { label: 'Meeting', labelDe: 'Treffen', icon: '🤝', baseXp: 40 },
  activity: { label: 'Activity', labelDe: 'Aktivität', icon: '🎯', baseXp: 50 },
  event: { label: 'Event', labelDe: 'Event', icon: '🎉', baseXp: 60 },
  gift: { label: 'Gift', labelDe: 'Geschenk', icon: '🎁', baseXp: 30 },
  support: { label: 'Support', labelDe: 'Unterstützung', icon: '🤗', baseXp: 45 },
  quality_time: { label: 'Quality Time', labelDe: 'Quality Time', icon: '⏰', baseXp: 55 },
  other: { label: 'Other', labelDe: 'Andere', icon: '📝', baseXp: 10 },
};

export const QUALITY_MULTIPLIER: Record<InteractionQuality, number> = {
  poor: 0.5,
  neutral: 1.0,
  good: 1.5,
  great: 2.0,
  exceptional: 3.0,
};

export const QUALITY_META: Record<InteractionQuality, { label: string; labelDe: string; color: string }> = {
  poor: { label: 'Poor', labelDe: 'Schlecht', color: '#ef4444' },
  neutral: { label: 'Neutral', labelDe: 'Neutral', color: '#6b7280' },
  good: { label: 'Good', labelDe: 'Gut', color: '#22c55e' },
  great: { label: 'Great', labelDe: 'Super', color: '#3b82f6' },
  exceptional: { label: 'Exceptional', labelDe: 'Außergewöhnlich', color: '#a855f7' },
};

export const CATEGORY_META: Record<RelationshipCategory, { label: string; labelDe: string; icon: string; color: string }> = {
  family: { label: 'Family', labelDe: 'Familie', icon: '👨‍👩‍👧‍👦', color: '#ec4899' },
  friend: { label: 'Friends', labelDe: 'Freunde', icon: '🤝', color: '#06b6d4' },
  professional: { label: 'Professional', labelDe: 'Beruflich', icon: '💼', color: '#3b82f6' },
  other: { label: 'Other', labelDe: 'Andere', icon: '👤', color: '#6b7280' },
};

// ============================================
// Entity Interfaces
// ============================================

// Kontakt-Informationen (JSONB Struktur)
export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
    [key: string]: string | undefined;
  };
}

// Haupt-Kontakt Interface
export interface Contact {
  id: string;
  user_id: string;

  // Basis-Info
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;

  // Beziehung
  relationship_type: RelationshipType;
  relationship_category: RelationshipCategory;
  domain_id: string | null;

  // Level & XP
  relationship_level: number;
  trust_level: number;
  current_xp: number;

  // Wichtige Daten
  birthday: string | null;
  anniversary: string | null;
  met_date: string | null;
  met_context: string | null;

  // Kontakt-Info
  contact_info: ContactInfo;

  // Zusätzliches
  shared_interests: string[];
  notes: string | null;
  tags: string[];

  // Statistiken
  last_interaction_at: string | null;
  interaction_count: number;
  avg_interaction_quality: number;

  // Flags
  is_favorite: boolean;
  is_archived: boolean;
  reminder_frequency_days: number | null;
  suppress_attention_reminder: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Kontakt mit berechneten Feldern (aus View)
export interface ContactWithStats extends Contact {
  xp_for_next_level: number;
  progress_percent: number;
  days_until_birthday: number | null;
  days_since_interaction: number | null;
  needs_attention: boolean;
}

// Interaktion Interface
export interface ContactInteraction {
  id: string;
  contact_id: string;
  user_id: string;

  interaction_type: InteractionType;
  title: string | null;
  description: string | null;

  quality: InteractionQuality;
  xp_gained: number;
  duration_minutes: number | null;

  occurred_at: string;

  related_skill_id: string | null;
  evidence_urls: string[];

  location: string | null;
  participants: string[];

  created_at: string;
}

// Wichtige Daten
export interface ContactImportantDate {
  id: string;
  contact_id: string;

  title: string;
  date_value: string;
  is_recurring: boolean;

  reminder_days_before: number[];
  notes: string | null;

  created_at: string;
}

// ============================================
// Form Types
// ============================================

// Kontakt erstellen/bearbeiten
export interface ContactFormData {
  first_name: string;
  last_name?: string;
  nickname?: string;
  photo_url?: string;

  relationship_type: RelationshipType;

  birthday?: string;
  anniversary?: string;
  met_date?: string;
  met_context?: string;

  contact_info?: ContactInfo;
  shared_interests?: string[];
  notes?: string;
  tags?: string[];

  trust_level?: number;
  is_favorite?: boolean;
  reminder_frequency_days?: number;
  suppress_attention_reminder?: boolean;
}

// Interaktion erstellen
export interface InteractionFormData {
  contact_id: string;
  interaction_type: InteractionType;

  title?: string;
  description?: string;

  quality: InteractionQuality;
  duration_minutes?: number;

  occurred_at?: string;

  related_skill_id?: string;
  location?: string;
  participants?: string[];
}

// Filter für Kontakte
export interface ContactFilters {
  category?: RelationshipCategory;
  relationship_type?: RelationshipType;
  is_favorite?: boolean;
  is_archived?: boolean;
  needs_attention?: boolean;
  search?: string;
  tags?: string[];
  domain_id?: string;
}

// ============================================
// Helper Functions
// ============================================

export function getDisplayName(contact: Contact): string {
  if (contact.nickname) return contact.nickname;
  return contact.last_name
    ? `${contact.first_name} ${contact.last_name}`
    : contact.first_name;
}

export function calculateXpForNextLevel(level: number): number {
  return Math.ceil(100 * Math.pow(level, 1.5));
}

export function calculateInteractionXp(
  interactionType: InteractionType,
  quality: InteractionQuality,
  durationMinutes?: number
): number {
  const baseXp = INTERACTION_TYPE_META[interactionType].baseXp;
  const qualityMultiplier = QUALITY_MULTIPLIER[quality];

  // Bonus für längere Interaktionen (max 2x bei 120+ Minuten)
  let durationMultiplier = 1;
  if (durationMinutes) {
    durationMultiplier = Math.min(2, 1 + durationMinutes / 120);
  }

  return Math.round(baseXp * qualityMultiplier * durationMultiplier);
}

export function getCategoryFromType(type: RelationshipType): RelationshipCategory {
  return RELATIONSHIP_TYPE_META[type].category;
}

export function getDomainIdFromCategory(category: RelationshipCategory): string | null {
  switch (category) {
    case 'family':
      return '77777777-7777-7777-7777-777777777777'; // Familie Domain
    case 'friend':
      return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // Soziales Domain
    default:
      return null;
  }
}
