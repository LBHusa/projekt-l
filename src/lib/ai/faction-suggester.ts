// ============================================
// AI FACTION SUGGESTER
// Phase 5: AI Smart-Defaults & Kontext-Erkennung
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { FactionId } from '@/lib/database.types';

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set - AI faction suggestions will not work');
    return null;
  }

  return new Anthropic({
    apiKey,
  });
};

export interface FactionSuggestion {
  faction_id: FactionId;
  confidence: number; // 0-100
  reasoning: string;
}

export interface SuggestFactionInput {
  activityDescription: string;
  currentTime?: Date;
  lastActivities?: string[]; // Last 3-5 activities
  duration?: number; // in minutes
  location?: string;
}

/**
 * Get AI-powered faction suggestions based on context
 *
 * @param input - Context information about the activity
 * @returns Array of faction suggestions with confidence scores
 */
export async function suggestFaction(
  input: SuggestFactionInput
): Promise<FactionSuggestion[]> {
  const client = getAnthropicClient();

  if (!client) {
    // Fallback to rule-based suggestions if API not available
    return getRuleBasedSuggestions(input);
  }

  const time = input.currentTime || new Date();
  const hour = time.getHours();
  const dayOfWeek = time.toLocaleDateString('de-DE', { weekday: 'long' });

  // Build context prompt
  const systemPrompt = `Du bist ein KI-Assistent für ein Life-Gamification-System. Deine Aufgabe ist es, basierend auf einer Aktivitätsbeschreibung und Kontext die passende "Faction" (Lebensbereich) vorzuschlagen.

Die 7 Factions sind:
- karriere: Beruf, Arbeit, Business
- koerper: Sport, Ernährung, Fitness, Wohlbefinden
- soziales: Freunde, Familie, Beziehungen, Networking
- finanzen: Geld, Investments, Budgetierung
- hobbys: Kreative Projekte, Freizeit, Leidenschaften
- geist: Meditation, Lernen, Persönlichkeitsentwicklung
- weisheit: Philosophie, tiefes Nachdenken, Reflexion

Analysiere die Aktivität und gib 1-3 Faction-Vorschläge zurück mit:
- faction_id: ID der Faction
- confidence: Sicherheit 0-100%
- reasoning: Kurze Begründung (max 1 Satz)

Beispiele:
- "9-17 Uhr Coding" → karriere (wenn in Arbeitszeit)
- "Abends Coding" → hobbys (wenn außerhalb Arbeitszeit)
- "Nach Gym → Protein Shake" → koerper
- "Meeting mit Kollegen" → karriere oder soziales (je nach Kontext)

Antworte NUR mit einem JSON-Array, keine weiteren Erklärungen.`;

  const userPrompt = `Aktivität: ${input.activityDescription}
Uhrzeit: ${hour}:00 Uhr (${dayOfWeek})
${input.lastActivities ? `Letzte Aktivitäten: ${input.lastActivities.join(', ')}` : ''}
${input.duration ? `Dauer: ${input.duration} Minuten` : ''}
${input.location ? `Ort: ${input.location}` : ''}

Gib 1-3 Faction-Vorschläge zurück.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Parse response
    const content = message.content[0];
    if (content.type === 'text') {
      const suggestions = JSON.parse(content.text) as FactionSuggestion[];

      // Validate and normalize
      return suggestions
        .filter(s => isFactionId(s.faction_id))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    }

    return getRuleBasedSuggestions(input);
  } catch (error) {
    console.error('Error getting AI faction suggestions:', error);
    return getRuleBasedSuggestions(input);
  }
}

/**
 * Fallback rule-based suggestions when AI is not available
 */
function getRuleBasedSuggestions(input: SuggestFactionInput): FactionSuggestion[] {
  const time = input.currentTime || new Date();
  const hour = time.getHours();
  const desc = input.activityDescription.toLowerCase();

  const suggestions: FactionSuggestion[] = [];

  // Rule 1: Time-based work detection
  if (hour >= 9 && hour <= 17) {
    if (desc.includes('code') || desc.includes('work') || desc.includes('meeting') || desc.includes('projekt')) {
      suggestions.push({
        faction_id: 'karriere',
        confidence: 75,
        reasoning: 'Arbeitszeit (9-17 Uhr) deutet auf Karriere hin',
      });
    }
  }

  // Rule 2: Evening activities = hobbies
  if (hour >= 18 || hour <= 6) {
    if (desc.includes('code') || desc.includes('projekt')) {
      suggestions.push({
        faction_id: 'hobby',
        confidence: 70,
        reasoning: 'Abends/Nachts → wahrscheinlich Hobby-Projekt',
      });
    }
  }

  // Rule 3: Health keywords
  if (desc.includes('gym') || desc.includes('sport') || desc.includes('workout') || desc.includes('lauf')) {
    suggestions.push({
      faction_id: 'koerper',
      confidence: 90,
      reasoning: 'Sport/Fitness-Aktivität erkannt',
    });
  }

  // Rule 4: Social keywords
  if (desc.includes('friend') || desc.includes('familie') || desc.includes('date') || desc.includes('treffen')) {
    suggestions.push({
      faction_id: 'soziales',
      confidence: 85,
      reasoning: 'Soziale Interaktion erkannt',
    });
  }

  // Rule 5: Learning/meditation
  if (desc.includes('lernen') || desc.includes('buch') || desc.includes('meditat') || desc.includes('kurs')) {
    suggestions.push({
      faction_id: 'geist',
      confidence: 80,
      reasoning: 'Lern- oder Meditationsaktivität',
    });
  }

  // Rule 6: Finance keywords
  if (desc.includes('invest') || desc.includes('geld') || desc.includes('budget') || desc.includes('sparen')) {
    suggestions.push({
      faction_id: 'finanzen',
      confidence: 85,
      reasoning: 'Finanz-Aktivität erkannt',
    });
  }

  // Default: If no suggestions, suggest karriere during work hours, hobbys otherwise
  if (suggestions.length === 0) {
    suggestions.push({
      faction_id: hour >= 9 && hour <= 17 ? 'karriere' : 'hobby',
      confidence: 50,
      reasoning: 'Keine klaren Hinweise - basierend auf Uhrzeit',
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Type guard for FactionId
 */
function isFactionId(value: unknown): value is FactionId {
  const validFactions: FactionId[] = [
    'karriere',
    'koerper',
    'soziales',
    'finanzen',
    'hobby',
    'geist',
    'wissen',
  ];
  return typeof value === 'string' && validFactions.includes(value as FactionId);
}

/**
 * Store user feedback on faction suggestions
 * This will be used for future ML training
 */
export async function storeFactionFeedback(
  activityDescription: string,
  suggestedFactionId: FactionId,
  actualFactionId: FactionId,
  accepted: boolean,
  userId: string,
  confidenceScore?: number,
  reasoning?: string
): Promise<void> {
  const { createFactionFeedback } = await import('@/lib/data/ai-faction-feedback');

  try {
    await createFactionFeedback(
      {
        activity_description: activityDescription,
        suggested_faction_id: suggestedFactionId,
        actual_faction_id: actualFactionId,
        accepted,
        confidence_score: confidenceScore || 0,
        suggestion_reasoning: reasoning || null,
      },
      userId
    );
  } catch (error) {
    console.error('Error storing faction feedback:', error);
  }
}
