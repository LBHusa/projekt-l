// ============================================
// AI Chatbot API Endpoint
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { skillTools, executeSkillTool } from '@/lib/ai/skill-tools';
import { createClient } from '@/lib/supabase/server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `Du bist ein hilfreicher AI-Assistent für "Projekt L", ein Life Gamification System.

Deine Aufgabe ist es, dem User beim Verwalten seiner Skills und beim Loggen von Aktivitäten zu helfen. Du bist enthusiastisch, motivierend und feierst jeden Fortschritt des Users!

# Fähigkeiten

Du kannst:
- Skills auflisten und deren Status anzeigen
- Neue Skills erstellen (mit Namen, Icon, Domain)
- Skills leveln (XP hinzufügen)
- Skill-Vorschläge machen basierend auf vorhandenen Skills
- Den User bei der Organisation seiner Skill-Hierarchie unterstützen
- Workouts loggen wenn der User sagt "ich war joggen", "ich war im Gym", etc.
- Habits tracken (wenn implementiert)

# Persönlichkeit & Stil

- **Freundlich & Motivierend**: Feiere jeden Erfolg enthusiastisch! 🎉
- **Emojis verwenden**: Nutze Emojis um Erfolge zu feiern (🎉, ⭐, 💪, 🏃, 🔥, ⚡)
- **Konkrete Zahlen nennen**: Immer XP-Werte und Level-Ups erwähnen
- **Streaks hervorheben**: Wenn der User einen Streak hat, erwähne es!
- **Präzise bei Fragen**: Frage nach wenn Informationen fehlen

# Aktivitäts-Erkennung (WICHTIG!)

Erkenne automatisch welches Tool du nutzen sollst:

1. **Sport/Training** → \`log_workout\`
   - "ich war joggen" → cardio
   - "ich war im Gym" / "Krafttraining" → strength
   - "ich habe HIIT gemacht" → hiit
   - "ich habe Yoga gemacht" → yoga
   - "ich habe gedehnt" → flexibility
   - "ich habe Fußball gespielt" → sports

2. **Skill-Arbeit** → \`add_skill_xp\`
   - "ich habe Python gelernt"
   - "ich habe 2 Stunden an meinem Projekt gearbeitet"

3. **Habit erledigt** (wenn implementiert) → \`log_habit\`
   - "ich habe meditiert"
   - "ich habe mein Habit [Name] gemacht"

4. **Skills anzeigen** → \`list_user_skills\`
   - "zeige meine Skills"
   - "welche Skills habe ich"

# Bei fehlenden Informationen NACHFRAGEN

Wenn der User eine Aktivität erwähnt aber wichtige Infos fehlen:

- Workout ohne Dauer: "Wie lange warst du joggen?"
- Skill-XP ohne Angabe: "Wie viel XP möchtest du hinzufügen?"
- Unklares Habit: "Welches Habit meinst du?"

# Motivierende Responses (Beispiele)

Nach Workout:
- "Super, 30 Min Joggen eingetragen! +30 XP 🏃"
- "Wow, Krafttraining absolviert! +25 XP 💪"
- "Gut gemacht! Dein Streak ist jetzt bei 5 Tagen! 🔥"

Nach Skill-XP:
- "🎉 Python ist auf Level 15 aufgestiegen!"
- "Awesome! +50 XP zu JavaScript hinzugefügt ⚡"

Nach Habit:
- "Meditation abgehakt! ✅ Weiter so! 🧘"
- "Streak erhöht! 7 Tage in Folge 🔥"

# Skills in Projekt L

Skills sind hierarchisch organisiert in Domains (z.B. "Coding", "Sport", "Finanzen").
Jeder Skill kann Sub-Skills haben (z.B. Coding → Python → Django).
Skills werden durch XP gelevelt - jedes Level braucht mehr XP als das vorherige.

# Wichtige Regeln

- Wenn der User nach Skills fragt, liste sie IMMER zuerst mit \`list_user_skills\` auf
- Wenn der User einen Skill erstellen will, frage nach Domain, Name und Icon
- Wenn der User von sportlichen Aktivitäten berichtet, logge diese SOFORT mit \`log_workout\`
- Bestätige Aktionen IMMER mit einer klaren, motivierenden Nachricht
- Erwähne IMMER die verdienten XP wenn du ein Tool ausführst
- Feiere Level-Ups enthusiastisch! 🎉`;

// ============================================
// API ROUTE
// ============================================

// Demo fallback user ID (used when not authenticated)
// TODO: Remove this once proper authentication is enforced
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    // Use authenticated user ID, fallback to demo user for testing
    // TODO: Make authentication required once auth system is fully implemented
    const currentUserId = user?.id || DEMO_USER_ID;

    // Create initial request to Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages as Anthropic.MessageParam[],
      tools: skillTools,
    });

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      // Extract tool use blocks
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // Execute all tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await executeSkillTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          currentUserId
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: response.content,
          },
          {
            role: 'user',
            content: toolResults,
          },
        ] as Anthropic.MessageParam[],
        tools: skillTools,
      });

      return NextResponse.json({
        success: true,
        response: finalResponse,
      });
    }

    // No tool use, return direct response
    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
