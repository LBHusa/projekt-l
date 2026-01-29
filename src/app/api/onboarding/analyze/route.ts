/**
 * AI Analysis API Route
 * POST /api/onboarding/analyze
 *
 * Uses Claude to analyze user's onboarding responses and generate
 * personalized skills, habits, and character class.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FactionId } from '@/lib/database.types';
import type {
  FactionRating,
  TellMeAboutYouData,
  AIAnalysisResult,
  AIGeneratedSkill,
  AIGeneratedHabit,
} from '@/lib/onboarding/types';
import { FACTIONS } from '@/lib/ui/constants';

// Rate limiting: 5 requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface AnalyzeRequestBody {
  factionRatings: FactionRating[];
  tellMeAboutYou: TellMeAboutYouData;
}

interface ClaudeAnalysisResponse {
  characterClass: string;
  characterDescription: string;
  factionLevels: Record<string, number>;
  skills: {
    name: string;
    factionId: string;
    suggestedLevel: number;
    experience: string;
    reason: string;
  }[];
  habits: {
    name: string;
    factionId: string;
    icon: string;
    suggestedFrequency: number;
    reason: string;
  }[];
}

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

function buildPrompt(factionRatings: FactionRating[], tellMeAboutYou: TellMeAboutYouData): string {
  // Build faction ratings summary
  const ratingsText = factionRatings
    .map(r => {
      const faction = FACTIONS.find(f => f.id === r.factionId);
      return `- ${faction?.name || r.factionId}: Wichtigkeit ${r.importance}/5, Status ${r.currentStatus}/10`;
    })
    .join('\n');

  // Build education text
  let educationText = '';
  if (tellMeAboutYou.karriereEducation.type) {
    const typeMap: Record<string, string> = {
      ausbildung: 'Ausbildung',
      bachelor: 'Bachelor-Studium',
      master: 'Master/Diplom-Studium',
      promotion: 'Promotion',
      quereinsteiger: 'Quereinsteiger',
      freelancer: 'Freelancer/Selbstständig',
    };
    educationText = `Bildungsweg: ${typeMap[tellMeAboutYou.karriereEducation.type] || tellMeAboutYou.karriereEducation.type}`;
    if (tellMeAboutYou.karriereEducation.field) {
      educationText += ` in ${tellMeAboutYou.karriereEducation.field}`;
    }
    if (tellMeAboutYou.karriereEducation.graduationYear) {
      educationText += ` (${tellMeAboutYou.karriereEducation.graduationYear === 'in_progress' ? 'noch in Ausbildung' : tellMeAboutYou.karriereEducation.graduationYear})`;
    }
  }

  // Build free text responses
  const responses: string[] = [];
  if (tellMeAboutYou.karriere) responses.push(`Karriere: ${tellMeAboutYou.karriere}`);
  if (tellMeAboutYou.hobby) responses.push(`Hobbys: ${tellMeAboutYou.hobby}`);
  if (tellMeAboutYou.koerper) responses.push(`Fitness: ${tellMeAboutYou.koerper}`);
  if (tellMeAboutYou.geist) responses.push(`Mentale Gesundheit: ${tellMeAboutYou.geist}`);
  if (tellMeAboutYou.finanzen) responses.push(`Finanzen: ${tellMeAboutYou.finanzen}`);
  if (tellMeAboutYou.soziales) responses.push(`Soziales: ${tellMeAboutYou.soziales}`);
  if (tellMeAboutYou.wissen) responses.push(`Wissen/Lernen: ${tellMeAboutYou.wissen}`);

  return `Du bist ein KI-Assistent für "Projekt L", eine Gamification-App zur Lebensverbesserung mit 7 Lebensbereichen.

Die 7 Lebensbereiche (Factions):
- karriere: Karriere/Beruf (💼)
- hobby: Hobby/Freizeit (🎨)
- koerper: Körper/Fitness (💪)
- geist: Geist & Seele (🧠)
- finanzen: Finanzen (💰)
- soziales: Soziales/Beziehungen (👥)
- wissen: Wissen/Bildung (📚)

USER-EINGABEN:

Bewertung der Lebensbereiche:
${ratingsText}

${educationText ? educationText + '\n' : ''}
Freitext-Antworten:
${responses.join('\n')}

AUFGABE: Analysiere die Eingaben und erstelle PERSONALISIERTE Vorschläge.

GENERIERE:
1. characterClass: Eine passende Charakter-Klasse (z.B. "Gelehrter", "Heilerin", "Händler", "Künstler", "Mönch", "Abenteurer", "Diplomat", "Erfinder", "Weiser", "Krieger", "Barde", "Alchemist")
2. characterDescription: 2-3 Sätze Beschreibung des Charakters auf Deutsch, basierend auf den Eingaben
3. factionLevels: Startlevel pro Bereich (5-60), basierend auf currentStatus und Freitext
4. skills: 5-10 PERSONALISIERTE Skills basierend auf den konkreten Eingaben, mit:
   - name: Skill-Name
   - factionId: Zugehöriger Bereich (karriere/hobby/koerper/geist/finanzen/soziales/wissen)
   - suggestedLevel: Geschätztes Level (1-100)
   - experience: "beginner" / "intermediate" / "expert"
   - reason: Kurze Begründung auf Deutsch, warum dieser Skill passt (bezogen auf die Eingaben)
5. habits: 3-7 PERSONALISIERTE Habits basierend auf den Eingaben, mit:
   - name: Habit-Name
   - factionId: Zugehöriger Bereich
   - icon: Ein passendes Emoji
   - suggestedFrequency: Vorgeschlagene Frequenz pro Woche (1-7)
   - reason: Kurze Begründung auf Deutsch

WICHTIGE REGELN:
- Skills und Habits müssen KONKRET zur Person passen (nicht generisch!)
- Berücksichtige den Bildungsweg bei Karriere-Skills
- Nur Bereiche mit Freitext-Eingaben bekommen spezifische Vorschläge
- Alles auf DEUTSCH
- JSON-Format ohne Markdown-Codeblocks

Antworte NUR mit einem validen JSON-Objekt in diesem Format:
{
  "characterClass": "string",
  "characterDescription": "string",
  "factionLevels": {"karriere": number, "hobby": number, "koerper": number, "geist": number, "finanzen": number, "soziales": number, "wissen": number},
  "skills": [...],
  "habits": [...]
}`;
}

function parseClaudeResponse(content: string): ClaudeAnalysisResponse {
  // Try to extract JSON from the response
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

  // Try to find JSON object boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = jsonStr.slice(startIdx, endIdx + 1);
  }

  return JSON.parse(jsonStr);
}

function convertToAIResult(
  parsed: ClaudeAnalysisResponse,
  factionRatings: FactionRating[]
): AIAnalysisResult {
  // Validate and convert faction levels
  const validFactionIds: FactionId[] = ['karriere', 'hobby', 'koerper', 'geist', 'finanzen', 'soziales', 'wissen'];
  const factionLevels: Record<FactionId, number> = {
    karriere: 10, hobby: 10, koerper: 10, geist: 10, finanzen: 10, soziales: 10, wissen: 10,
  };

  if (parsed.factionLevels) {
    for (const [key, value] of Object.entries(parsed.factionLevels)) {
      if (validFactionIds.includes(key as FactionId)) {
        factionLevels[key as FactionId] = Math.min(60, Math.max(5, value));
      }
    }
  }

  // Convert skills
  const skills: AIGeneratedSkill[] = (parsed.skills || []).map((s, i) => ({
    id: `ai-skill-${i}`,
    name: s.name,
    factionId: validFactionIds.includes(s.factionId as FactionId) ? s.factionId as FactionId : 'wissen',
    suggestedLevel: Math.min(100, Math.max(1, s.suggestedLevel || 10)),
    experience: ['beginner', 'intermediate', 'expert'].includes(s.experience)
      ? s.experience as 'beginner' | 'intermediate' | 'expert'
      : 'beginner',
    reason: s.reason || '',
    accepted: true,
    edited: false,
  }));

  // Convert habits
  const habits: AIGeneratedHabit[] = (parsed.habits || []).map((h, i) => ({
    id: `ai-habit-${i}`,
    name: h.name,
    factionId: validFactionIds.includes(h.factionId as FactionId) ? h.factionId as FactionId : 'hobby',
    icon: h.icon || '✅',
    suggestedFrequency: Math.min(7, Math.max(1, h.suggestedFrequency || 3)),
    reason: h.reason || '',
    accepted: true,
    edited: false,
  }));

  return {
    characterClass: parsed.characterClass || 'Abenteurer',
    characterDescription: parsed.characterDescription || 'Ein Abenteurer auf dem Weg der Selbstverbesserung.',
    factionLevels,
    skills,
    habits,
  };
}

function generateFallbackResult(factionRatings: FactionRating[]): AIAnalysisResult {
  const defaultSkills: Record<FactionId, string[]> = {
    karriere: ['Projektmanagement', 'Kommunikation', 'Zeitmanagement'],
    hobby: ['Kreatives Schaffen', 'Entspannung'],
    koerper: ['Ausdauer', 'Kraft', 'Beweglichkeit'],
    geist: ['Achtsamkeit', 'Selbstreflexion'],
    finanzen: ['Budgetierung', 'Sparen'],
    soziales: ['Beziehungspflege', 'Empathie'],
    wissen: ['Lerntechniken', 'Wissensmanagement'],
  };

  const defaultHabits: Record<FactionId, { name: string; icon: string }[]> = {
    karriere: [{ name: 'Deep Work Session', icon: '💼' }],
    hobby: [{ name: 'Kreative Zeit', icon: '🎨' }],
    koerper: [{ name: 'Training', icon: '💪' }],
    geist: [{ name: 'Meditation', icon: '🧘' }],
    finanzen: [{ name: 'Finanzen checken', icon: '💰' }],
    soziales: [{ name: 'Freunde kontaktieren', icon: '👥' }],
    wissen: [{ name: 'Lesen', icon: '📚' }],
  };

  const skills: AIGeneratedSkill[] = [];
  const habits: AIGeneratedHabit[] = [];

  const sortedFactions = [...factionRatings].sort((a, b) => b.importance - a.importance).slice(0, 4);

  sortedFactions.forEach((rating) => {
    const factionSkills = defaultSkills[rating.factionId] || [];
    factionSkills.slice(0, 2).forEach(skillName => {
      skills.push({
        id: `fallback-skill-${skills.length}`,
        name: skillName,
        factionId: rating.factionId,
        suggestedLevel: Math.floor(rating.currentStatus * 5),
        experience: rating.currentStatus > 7 ? 'expert' : rating.currentStatus > 4 ? 'intermediate' : 'beginner',
        reason: `Vorschlag für ${FACTIONS.find(f => f.id === rating.factionId)?.name || rating.factionId}`,
        accepted: true,
        edited: false,
      });
    });
  });

  sortedFactions.slice(0, 3).forEach((rating) => {
    const factionHabits = defaultHabits[rating.factionId] || [];
    factionHabits.forEach(habit => {
      habits.push({
        id: `fallback-habit-${habits.length}`,
        name: habit.name,
        factionId: rating.factionId,
        icon: habit.icon,
        suggestedFrequency: rating.importance >= 4 ? 5 : 3,
        reason: `Empfohlen für ${FACTIONS.find(f => f.id === rating.factionId)?.name || rating.factionId}`,
        accepted: true,
        edited: false,
      });
    });
  });

  const top1 = sortedFactions[0]?.factionId || 'wissen';
  const top2 = sortedFactions[1]?.factionId || 'hobby';

  const factionLevels: Record<FactionId, number> = {
    karriere: 10, hobby: 10, koerper: 10, geist: 10, finanzen: 10, soziales: 10, wissen: 10,
  };
  factionRatings.forEach(r => {
    factionLevels[r.factionId] = Math.max(5, Math.floor(r.currentStatus * 5));
  });

  return {
    characterClass: 'Abenteurer',
    characterDescription: 'Ein Abenteurer auf dem Weg der Selbstverbesserung.',
    factionLevels,
    skills,
    habits,
  };
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
    const body: AnalyzeRequestBody = await request.json();
    const { factionRatings, tellMeAboutYou } = body;

    if (!factionRatings || !tellMeAboutYou) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if fallback is requested
    const url = new URL(request.url);
    if (url.searchParams.get('fallback') === 'true') {
      const fallbackResult = generateFallbackResult(factionRatings);
      return NextResponse.json({
        success: true,
        result: fallbackResult,
        fallback: true,
      });
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
      console.warn('ANTHROPIC_API_KEY not configured, using fallback');
      const fallbackResult = generateFallbackResult(factionRatings);
      return NextResponse.json({
        success: true,
        result: fallbackResult,
        fallback: true,
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build prompt
    const prompt = buildPrompt(factionRatings, tellMeAboutYou);

    // Call Claude API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
      const parsed = parseClaudeResponse(textContent.text);
      const result = convertToAIResult(parsed, factionRatings);

      // Save analysis to database for reference
      try {
        await supabase.from('onboarding_responses').insert({
          user_id: user.id,
          step_name: 'ai_analysis',
          response_data: {
            input: { factionRatings, tellMeAboutYou },
            output: result,
            model: 'claude-sonnet-4-20250514',
            timestamp: new Date().toISOString(),
          },
        });
      } catch (dbError) {
        console.warn('Could not save AI analysis to database:', dbError);
      }

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (apiError) {
      clearTimeout(timeout);

      if (apiError instanceof Error && apiError.name === 'AbortError') {
        console.error('Claude API timeout');
        const fallbackResult = generateFallbackResult(factionRatings);
        return NextResponse.json({
          success: true,
          result: fallbackResult,
          fallback: true,
        });
      }

      throw apiError;
    }
  } catch (error) {
    console.error('AI analysis error:', error);

    // Return fallback on any error
    try {
      const body: AnalyzeRequestBody = await request.clone().json();
      const fallbackResult = generateFallbackResult(body.factionRatings);
      return NextResponse.json({
        success: true,
        result: fallbackResult,
        fallback: true,
      });
    } catch {
      return NextResponse.json(
        { error: 'Analyse fehlgeschlagen' },
        { status: 500 }
      );
    }
  }
}
