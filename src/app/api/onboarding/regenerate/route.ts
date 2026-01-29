/**
 * Regenerate API Route
 * POST /api/onboarding/regenerate
 *
 * Regenerates skills or habits based on user feedback using Claude.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FactionId } from '@/lib/database.types';
import type {
  FactionRating,
  TellMeAboutYouData,
  AIGeneratedSkill,
  AIGeneratedHabit,
  RegenerateRequest,
} from '@/lib/onboarding/types';
import { FACTIONS } from '@/lib/ui/constants';

// Shared rate limit with analyze endpoint
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000 / 60);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

function buildRegeneratePrompt(
  factionRatings: FactionRating[],
  tellMeAboutYou: TellMeAboutYouData,
  feedback: string,
  regenerateType: 'skills' | 'habits' | 'both'
): string {
  // Build faction ratings summary
  const ratingsText = factionRatings
    .map(r => {
      const faction = FACTIONS.find(f => f.id === r.factionId);
      return `- ${faction?.name || r.factionId}: Wichtigkeit ${r.importance}/5, Status ${r.currentStatus}/10`;
    })
    .join('\n');

  // Build free text responses
  const responses: string[] = [];
  if (tellMeAboutYou.karriere) responses.push(`Karriere: ${tellMeAboutYou.karriere}`);
  if (tellMeAboutYou.hobby) responses.push(`Hobbys: ${tellMeAboutYou.hobby}`);
  if (tellMeAboutYou.koerper) responses.push(`Fitness: ${tellMeAboutYou.koerper}`);
  if (tellMeAboutYou.geist) responses.push(`Mentale Gesundheit: ${tellMeAboutYou.geist}`);
  if (tellMeAboutYou.finanzen) responses.push(`Finanzen: ${tellMeAboutYou.finanzen}`);
  if (tellMeAboutYou.soziales) responses.push(`Soziales: ${tellMeAboutYou.soziales}`);
  if (tellMeAboutYou.wissen) responses.push(`Wissen/Lernen: ${tellMeAboutYou.wissen}`);

  const typeLabel = regenerateType === 'skills' ? 'Skills' : regenerateType === 'habits' ? 'Habits' : 'Skills und Habits';
  const typeInstruction = regenerateType === 'skills'
    ? 'Generiere 5-10 neue Skills'
    : regenerateType === 'habits'
    ? 'Generiere 3-7 neue Habits'
    : 'Generiere 5-10 Skills und 3-7 Habits';

  return `Du bist ein KI-Assistent für "Projekt L", eine Gamification-App zur Lebensverbesserung.

USER-DATEN:

Bewertung der Lebensbereiche:
${ratingsText}

Freitext-Antworten:
${responses.join('\n')}

USER-FEEDBACK zu den bisherigen Vorschlägen:
"${feedback}"

AUFGABE: ${typeInstruction} basierend auf dem Feedback.

BERÜCKSICHTIGE das Feedback und passe die Vorschläge entsprechend an!

${regenerateType === 'skills' || regenerateType === 'both' ? `
Für Skills:
- name: Skill-Name
- factionId: Zugehöriger Bereich (karriere/hobby/koerper/geist/finanzen/soziales/wissen)
- suggestedLevel: Geschätztes Level (1-100)
- experience: "beginner" / "intermediate" / "expert"
- reason: Kurze Begründung auf Deutsch
` : ''}

${regenerateType === 'habits' || regenerateType === 'both' ? `
Für Habits:
- name: Habit-Name
- factionId: Zugehöriger Bereich
- icon: Ein passendes Emoji
- suggestedFrequency: Vorgeschlagene Frequenz pro Woche (1-7)
- reason: Kurze Begründung auf Deutsch
` : ''}

Antworte NUR mit einem validen JSON-Objekt:
{
  ${regenerateType === 'skills' ? '"skills": [...]' : regenerateType === 'habits' ? '"habits": [...]' : '"skills": [...], "habits": [...]'}
}`;
}

function parseResponse(content: string): { skills?: unknown[]; habits?: unknown[] } {
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Find JSON boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = jsonStr.slice(startIdx, endIdx + 1);
  }

  return JSON.parse(jsonStr);
}

function convertSkills(rawSkills: unknown[]): AIGeneratedSkill[] {
  const validFactionIds: FactionId[] = ['karriere', 'hobby', 'koerper', 'geist', 'finanzen', 'soziales', 'wissen'];

  return rawSkills.map((s: unknown, i: number) => {
    const skill = s as Record<string, unknown>;
    return {
      id: `regen-skill-${i}`,
      name: String(skill.name || ''),
      factionId: validFactionIds.includes(skill.factionId as FactionId)
        ? skill.factionId as FactionId
        : 'wissen',
      suggestedLevel: Math.min(100, Math.max(1, Number(skill.suggestedLevel) || 10)),
      experience: ['beginner', 'intermediate', 'expert'].includes(String(skill.experience))
        ? skill.experience as 'beginner' | 'intermediate' | 'expert'
        : 'beginner',
      reason: String(skill.reason || ''),
      accepted: true,
      edited: false,
    };
  });
}

function convertHabits(rawHabits: unknown[]): AIGeneratedHabit[] {
  const validFactionIds: FactionId[] = ['karriere', 'hobby', 'koerper', 'geist', 'finanzen', 'soziales', 'wissen'];

  return rawHabits.map((h: unknown, i: number) => {
    const habit = h as Record<string, unknown>;
    return {
      id: `regen-habit-${i}`,
      name: String(habit.name || ''),
      factionId: validFactionIds.includes(habit.factionId as FactionId)
        ? habit.factionId as FactionId
        : 'hobby',
      icon: String(habit.icon || '✅'),
      suggestedFrequency: Math.min(7, Math.max(1, Number(habit.suggestedFrequency) || 3)),
      reason: String(habit.reason || ''),
      accepted: true,
      edited: false,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body: RegenerateRequest = await request.json();
    const { originalData, feedback, regenerateType } = body;

    if (!originalData || !feedback || !regenerateType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Rate limiting
    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit erreicht. Bitte warte ${rateLimitCheck.retryAfter} Minuten.`,
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API-Key nicht konfiguriert', success: false },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build prompt
    const prompt = buildRegeneratePrompt(
      originalData.factionRatings,
      originalData.tellMeAboutYou,
      feedback,
      regenerateType
    );

    // Call Claude API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      clearTimeout(timeout);

      // Extract text content
      const textContent = message.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      // Parse response
      const parsed = parseResponse(textContent.text);

      const result: { success: boolean; skills?: AIGeneratedSkill[]; habits?: AIGeneratedHabit[] } = {
        success: true,
      };

      if (parsed.skills && Array.isArray(parsed.skills)) {
        result.skills = convertSkills(parsed.skills);
      }

      if (parsed.habits && Array.isArray(parsed.habits)) {
        result.habits = convertHabits(parsed.habits);
      }

      return NextResponse.json(result);
    } catch (apiError) {
      clearTimeout(timeout);
      console.error('Claude API error:', apiError);
      return NextResponse.json(
        { error: 'Regenerierung fehlgeschlagen', success: false },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json(
      { error: 'Regenerierung fehlgeschlagen', success: false },
      { status: 500 }
    );
  }
}
