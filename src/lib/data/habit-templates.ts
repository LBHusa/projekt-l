import type { FactionId } from '@/lib/database.types';
import type { HabitFormData } from '@/components/habits/HabitForm';

export interface HabitTemplate extends HabitFormData {
  id: string;
  category: FactionId;
  usage_count?: number;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // Körper (3)
  {
    id: 'koerper-workout',
    category: 'koerper',
    name: 'Morgen-Workout',
    description: 'Starte den Tag mit Bewegung',
    icon: '💪',
    color: '#10B981',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 25,
    factions: [{ faction_id: 'koerper', weight: 100 }],
  },
  {
    id: 'koerper-hydration',
    category: 'koerper',
    name: '2 Liter Wasser trinken',
    description: 'Bleib hydriert über den Tag',
    icon: '💧',
    color: '#14B8A6',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 15,
    factions: [{ faction_id: 'koerper', weight: 100 }],
  },
  {
    id: 'koerper-steps',
    category: 'koerper',
    name: '10.000 Schritte',
    description: 'Tägliches Bewegungsziel erreichen',
    icon: '🏃',
    color: '#10B981',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 20,
    factions: [{ faction_id: 'koerper', weight: 100 }],
  },

  // Geist (3)
  {
    id: 'geist-meditation',
    category: 'geist',
    name: '10 Min Meditation',
    description: 'Mentale Klarheit durch Meditation',
    icon: '🧘',
    color: '#F59E0B',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 20,
    factions: [{ faction_id: 'geist', weight: 100 }],
  },
  {
    id: 'geist-journal',
    category: 'geist',
    name: 'Tagebuch schreiben',
    description: 'Gedanken und Erlebnisse festhalten',
    icon: '📝',
    color: '#F59E0B',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 15,
    factions: [{ faction_id: 'geist', weight: 100 }],
  },
  {
    id: 'geist-gratitude',
    category: 'geist',
    name: '3 Dinge Dankbarkeit',
    description: 'Fokussiere auf das Positive',
    icon: '✅',
    color: '#F59E0B',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 10,
    factions: [{ faction_id: 'geist', weight: 100 }],
  },

  // Weisheit (2)
  {
    id: 'weisheit-reading',
    category: 'wissen',
    name: '30 Min Lesen',
    description: 'Täglich Wissen aufbauen',
    icon: '📚',
    color: '#6366F1',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 25,
    factions: [{ faction_id: 'wissen', weight: 100 }],
  },
  {
    id: 'weisheit-language',
    category: 'wissen',
    name: 'Sprache üben',
    description: '15 Min Sprachenlernen (App oder Buch)',
    icon: '📚',
    color: '#6366F1',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['mon', 'wed', 'fri'],
    xp_per_completion: 20,
    factions: [{ faction_id: 'wissen', weight: 100 }],
  },

  // Karriere (2)
  {
    id: 'karriere-deepwork',
    category: 'karriere',
    name: 'Deep Work Session',
    description: '90 Min fokussiertes Arbeiten',
    icon: '🎯',
    color: '#3B82F6',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    xp_per_completion: 30,
    factions: [{ faction_id: 'karriere', weight: 100 }],
  },
  {
    id: 'karriere-inbox',
    category: 'karriere',
    name: 'Inbox Zero',
    description: 'E-Mails abarbeiten und archivieren',
    icon: '📝',
    color: '#3B82F6',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['mon', 'wed', 'fri'],
    xp_per_completion: 15,
    factions: [{ faction_id: 'karriere', weight: 100 }],
  },

  // Finanzen (2)
  {
    id: 'finanzen-tracking',
    category: 'finanzen',
    name: 'Ausgaben tracken',
    description: 'Alle Ausgaben des Tages eintragen',
    icon: '💰',
    color: '#14B8A6',
    habit_type: 'positive',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 15,
    factions: [{ faction_id: 'finanzen', weight: 100 }],
  },
  {
    id: 'finanzen-no-spend',
    category: 'finanzen',
    name: 'Kein-Geld-Tag',
    description: 'Keinen Cent ausgeben heute',
    icon: '💰',
    color: '#14B8A6',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['tue', 'thu'],
    xp_per_completion: 25,
    factions: [{ faction_id: 'finanzen', weight: 100 }],
  },

  // Soziales (2)
  {
    id: 'soziales-reach-out',
    category: 'soziales',
    name: 'Jemanden kontaktieren',
    description: 'Freunde/Familie anrufen oder schreiben',
    icon: '👥',
    color: '#EC4899',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['mon', 'wed', 'fri', 'sun'],
    xp_per_completion: 20,
    factions: [{ faction_id: 'soziales', weight: 100 }],
  },
  {
    id: 'soziales-quality-time',
    category: 'soziales',
    name: 'Quality Time',
    description: 'Mindestens 1h ungeteilte Aufmerksamkeit',
    icon: '👥',
    color: '#EC4899',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['sat', 'sun'],
    xp_per_completion: 30,
    factions: [{ faction_id: 'soziales', weight: 100 }],
  },

  // Hobbys (2)
  {
    id: 'hobbys-creative',
    category: 'hobby',
    name: 'Kreativzeit',
    description: 'Malen, Musik, Basteln - 30 Min',
    icon: '🎨',
    color: '#8B5CF6',
    habit_type: 'positive',
    frequency: 'specific_days',
    target_days: ['wed', 'sat', 'sun'],
    xp_per_completion: 25,
    factions: [{ faction_id: 'hobby', weight: 100 }],
  },
  {
    id: 'hobbys-screen-free',
    category: 'hobby',
    name: 'Bildschirmfreie Zeit',
    description: '1h ohne Handy/PC/TV',
    icon: '📱',
    color: '#8B5CF6',
    habit_type: 'negative',
    frequency: 'daily',
    target_days: [],
    xp_per_completion: 20,
    factions: [{ faction_id: 'hobby', weight: 100 }],
  },
];

// Helper functions
export function getTemplatesByCategory(category?: FactionId): HabitTemplate[] {
  if (!category) return HABIT_TEMPLATES;
  return HABIT_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): HabitTemplate | undefined {
  return HABIT_TEMPLATES.find(t => t.id === id);
}
