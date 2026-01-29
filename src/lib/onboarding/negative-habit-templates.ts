/**
 * Negative Habit Templates for Onboarding
 *
 * These are common habits users might want to reduce or eliminate.
 * Key principle: Nothing is inherently bad - but excess can harm.
 * A glass of wine with dinner is fine; daily drinking is not.
 */

import type { FactionId } from '@/lib/database.types';

export interface NegativeHabitTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'substance' | 'digital' | 'lifestyle' | 'productivity';
  /** Factions negatively affected by this habit */
  affectedFactions: FactionId[];
}

/**
 * Pre-defined negative habits for onboarding selection
 */
export const NEGATIVE_HABIT_TEMPLATES: NegativeHabitTemplate[] = [
  {
    id: 'smoking',
    name: 'Rauchen',
    icon: '🚬',
    description: 'Zigaretten oder andere Tabakprodukte',
    category: 'substance',
    affectedFactions: ['koerper', 'finanzen'],
  },
  {
    id: 'alcohol',
    name: 'Alkohol trinken',
    icon: '🍺',
    description: 'Bier, Wein oder andere alkoholische Getränke',
    category: 'substance',
    affectedFactions: ['koerper', 'geist', 'finanzen'],
  },
  {
    id: 'cannabis',
    name: 'Cannabis/Weed',
    icon: '🌿',
    description: 'Kiffen oder andere Cannabis-Produkte',
    category: 'substance',
    affectedFactions: ['koerper', 'geist', 'finanzen'],
  },
  {
    id: 'late-nights',
    name: 'Spät ins Bett',
    icon: '🌙',
    description: 'Zu spät schlafen gehen, Schlafmangel',
    category: 'lifestyle',
    affectedFactions: ['koerper', 'geist'],
  },
  {
    id: 'phone-time',
    name: 'Übermäßige Handyzeit',
    icon: '📱',
    description: 'Zu viel Zeit am Smartphone verbringen',
    category: 'digital',
    affectedFactions: ['geist', 'soziales'],
  },
  {
    id: 'tv-time',
    name: 'Zu viel TV/Streaming',
    icon: '📺',
    description: 'Netflix-Binges, endloses Scrollen',
    category: 'digital',
    affectedFactions: ['geist', 'koerper'],
  },
  {
    id: 'gaming',
    name: 'Übermäßiges Zocken',
    icon: '🎮',
    description: 'Zu viel Zeit mit Videospielen',
    category: 'digital',
    affectedFactions: ['soziales', 'koerper'],
  },
  {
    id: 'junk-food',
    name: 'Junk Food',
    icon: '🍔',
    description: 'Fast Food, Süßigkeiten, ungesundes Essen',
    category: 'lifestyle',
    affectedFactions: ['koerper', 'finanzen'],
  },
  {
    id: 'procrastination',
    name: 'Prokrastination',
    icon: '⏰',
    description: 'Aufgaben aufschieben, Deadlines verpassen',
    category: 'productivity',
    affectedFactions: ['karriere', 'geist'],
  },
  {
    id: 'caffeine',
    name: 'Zu viel Koffein',
    icon: '☕',
    description: 'Übermäßiger Kaffee- oder Energy-Drink-Konsum',
    category: 'substance',
    affectedFactions: ['koerper', 'geist'],
  },
  {
    id: 'social-media',
    name: 'Social Media',
    icon: '📲',
    description: 'Zu viel Zeit auf Instagram, TikTok, X etc.',
    category: 'digital',
    affectedFactions: ['geist', 'soziales', 'karriere'],
  },
  {
    id: 'impulse-buying',
    name: 'Impulskäufe',
    icon: '🛒',
    description: 'Ungeplante Einkäufe, Online-Shopping',
    category: 'lifestyle',
    affectedFactions: ['finanzen', 'geist'],
  },
];

/**
 * Category labels for grouping in UI
 */
export const NEGATIVE_HABIT_CATEGORIES = {
  substance: { label: 'Substanzen', icon: '💊' },
  digital: { label: 'Digital', icon: '💻' },
  lifestyle: { label: 'Lifestyle', icon: '🏠' },
  productivity: { label: 'Produktivität', icon: '📊' },
} as const;

/**
 * Get template by ID
 */
export function getNegativeHabitTemplate(id: string): NegativeHabitTemplate | undefined {
  return NEGATIVE_HABIT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getNegativeHabitsByCategory(category: NegativeHabitTemplate['category']): NegativeHabitTemplate[] {
  return NEGATIVE_HABIT_TEMPLATES.filter(t => t.category === category);
}
