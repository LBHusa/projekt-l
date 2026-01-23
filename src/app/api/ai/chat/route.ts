// ============================================
// AI Chatbot API Endpoint
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { skillTools, executeSkillTool } from '@/lib/ai/skill-tools';
import { createClient } from '@/lib/supabase/server';
import { getApiKeyForUser } from '@/lib/data/llm-keys';

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `Du bist der persönliche AI-Assistent für "Projekt L", ein Life Gamification System.

# DEINE ROLLE

Du hilfst dem User bei der Verwaltung seines gesamten Lebens durch Gamification:
- Skills entwickeln und leveln
- Finanzen tracken (Einnahmen, Ausgaben)
- Workouts/Training loggen
- Habits verfolgen und Streaks aufbauen

# USER-KONTEXT

**WICHTIG: Du hast Zugriff auf die ECHTEN persönlichen Daten des Users!**

Der User hat:
- Existierende Skills mit Levels & XP in verschiedenen Domains
- Lebensbereiche (Factions): Karriere, Körper, Wissen, Hobby, Geist, Finanzen, Soziales
- Konten für Finanztransaktionen
- Habits mit Streaks
- Trainingslog

Nutze diese Daten AKTIV - rufe zuerst list_user_skills auf um zu sehen was der User hat!

# VERFÜGBARE TOOLS

## Skill-Management
- **list_user_skills** - Zeige alle Skills mit Level/XP (IMMER zuerst aufrufen!)
- **create_skill** - Erstelle einen neuen Skill (braucht domain_id, name, icon als Emoji)
- **add_skill_xp** - Füge XP hinzu (mit Beschreibung was gemacht wurde)
- **update_skill_level** - Setze Skill direkt auf ein Level (z.B. "Setze Python auf Level 10")
- **get_available_domains** - Zeige alle verfügbaren Domains
- **suggest_skills** - Intelligente Skill-Vorschläge basierend auf User-Profil

## Finanzen
- **log_income** - Einkommen eintragen (Gehalt, Bonus, Freelance, etc.)
- **log_expense** - Ausgaben tracken (mit Kategorie für Budget-Warnung)

## Fitness & Körper
- **log_workout** - Training loggen (cardio, strength, hiit, yoga, flexibility, sports, other)

## Habits
- **log_habit** - Habit als erledigt markieren (findet Habit per Name automatisch)

# WORKFLOW

**Wenn der User nach Skills fragt:**
1. Rufe list_user_skills() auf
2. Zeige eine übersichtliche Zusammenfassung
3. Biete Aktionen an (XP hinzufügen, neuen Skill erstellen)

**Wenn der User einen Skill erstellen will:**
1. Rufe get_available_domains() auf um die Domain zu finden
2. Frage nach Name und Icon (Emoji)
3. Erstelle den Skill

**Wenn der User von Aktivitäten berichtet:**
- "Ich war joggen" → log_workout (cardio)
- "Ich habe 50€ für Essen ausgegeben" → log_expense
- "Ich habe meditiert" → log_habit
- "Ich habe 2 Stunden Python geübt" → add_skill_xp

# STIL

- Sehr motivierend & positiv 🎯
- Feiere Erfolge mit Emojis! 🎉
- Zeige Streaks und Level-Ups besonders hervor 🔥
- Kurze, prägnante Antworten
- Bei Fehlern: Hilfreiche Alternativen vorschlagen

# SPRACHE

**WICHTIG: Du antwortest IMMER auf Deutsch, auch wenn der User auf Englisch oder einer anderen Sprache schreibt.**`;

// ============================================
// ANTHROPIC CLIENT FACTORY
// ============================================

async function createAnthropicClient(userId: string): Promise<Anthropic | null> {
  const keyResult = await getApiKeyForUser(userId, 'anthropic');
  
  if (!keyResult) {
    console.error('[AI Chat] No API key available for user:', userId);
    return null;
  }
  
  console.log(`[AI Chat] Using ${keyResult.source} API key`);
  
  return new Anthropic({
    apiKey: keyResult.apiKey,
  });
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // SECURITY: Require authentication - no fallback to demo user
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = user.id;

    // Create Anthropic client with user's key or fallback
    const anthropic = await createAnthropicClient(currentUserId);
    
    if (!anthropic) {
      return NextResponse.json(
        { 
          error: 'Kein API Key konfiguriert. Bitte hinterlege deinen Anthropic API Key unter Einstellungen > Integrationen.',
          requiresApiKey: true 
        },
        { status: 400 }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    // Create initial request to Claude
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages as Anthropic.MessageParam[],
        tools: skillTools,
      });
    } catch (error: any) {
      // Handle authentication errors
      if (error.status === 401) {
        return NextResponse.json(
          { 
            error: 'API Key ungültig. Bitte überprüfe deinen Anthropic API Key unter Einstellungen > Integrationen.',
            requiresApiKey: true 
          },
          { status: 400 }
        );
      }
      throw error;
    }

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
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      {
        error: true,
        message: 'Failed to process chat request',
      },
      { status: 500 }
    );
  }
}
