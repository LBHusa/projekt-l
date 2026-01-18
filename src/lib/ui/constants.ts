/**
 * Zentrale UI-Konstanten für Projekt L
 * Single Source of Truth für Colors, Icons, Factions
 */

import type { FactionId } from '@/lib/database.types';

// =============================================
// FACTIONS
// =============================================

/**
 * Reihenfolge der Factions für Radar-Diagramm (im Uhrzeigersinn von oben)
 */
export const FACTION_ORDER: FactionId[] = [
  'karriere',
  'hobby',
  'koerper',
  'geist',
  'finanzen',
  'soziales',
  'wissen',
];

/**
 * Farben für jede Faction (neue 7 Bereiche)
 */
export const FACTION_COLORS: Record<FactionId, string> = {
  karriere: '#3B82F6',   // Blue - Beruf
  hobby: '#8B5CF6',     // Purple - Freizeit
  koerper: '#10B981',    // Green - Körper/Fitness
  geist: '#F59E0B',      // Amber - Geist/Mental
  finanzen: '#14B8A6',   // Teal - Finanzen
  soziales: '#EC4899',   // Pink - Soziales
  wissen: '#6366F1',   // Indigo - Weisheit/Lernen
};

/**
 * Faction-Metadaten (ID, Name, Icon) - neue 7 Bereiche
 */
export const FACTIONS: { id: FactionId; name: string; icon: string }[] = [
  { id: 'karriere', name: 'Karriere', icon: '💼' },
  { id: 'hobby', name: 'Hobby', icon: '🎨' },
  { id: 'koerper', name: 'Körper', icon: '💪' },
  { id: 'geist', name: 'Geist & Seele', icon: '🧠' },
  { id: 'finanzen', name: 'Finanzen', icon: '💰' },
  { id: 'soziales', name: 'Soziales', icon: '👥' },
  { id: 'wissen', name: 'Wissen', icon: '📚' },
];

// =============================================
// HABITS
// =============================================

/**
 * Verfügbare Icons für Habits
 */
export const HABIT_ICONS = [
  '✅', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴',
  '📝', '🎯', '💰', '🎨', '🎸', '🧹', '📱',
];

/**
 * Verfügbare Farben für Habits
 */
export const HABIT_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// =============================================
// COMMON UI
// =============================================

/**
 * Allgemeine Icons für Skills/Domains
 */
export const COMMON_ICONS = [
  '⭐', '🔥', '💡', '🎯', '🚀', '💻', '📚', '🧪',
  '🎨', '⚡', '🔧', '📊', '🌍', '🎮', '🎵', '📷',
];

/**
 * Allgemeine Farbpalette
 */
export const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

/**
 * Wochentage (Deutsch)
 */
export const DAYS = [
  { key: 'mon', label: 'Mo' },
  { key: 'tue', label: 'Di' },
  { key: 'wed', label: 'Mi' },
  { key: 'thu', label: 'Do' },
  { key: 'fri', label: 'Fr' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'So' },
] as const;

// =============================================
// ACTIVITY TYPES
// =============================================

/**
 * Farben für Activity-Typen (Tailwind-Klassen)
 */
export const ACTIVITY_COLORS: Record<string, string> = {
  xp_gained: 'text-yellow-400 bg-yellow-400/20',
  level_up: 'text-purple-400 bg-purple-400/20',
  workout_logged: 'text-green-400 bg-green-400/20',
  book_finished: 'text-blue-400 bg-blue-400/20',
  course_completed: 'text-cyan-400 bg-cyan-400/20',
  job_started: 'text-amber-400 bg-amber-400/20',
  salary_update: 'text-emerald-400 bg-emerald-400/20',
  goal_achieved: 'text-pink-400 bg-pink-400/20',
  social_event: 'text-indigo-400 bg-indigo-400/20',
  habit_completed: 'text-orange-400 bg-orange-400/20',
};

// =============================================
// SIZE VARIANTS
// =============================================

export const SIZE_CLASSES = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
  xl: 'w-52 h-52',
} as const;

export const TEXT_SIZE_CLASSES = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
} as const;

export const MODAL_SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;
