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

Deine Aufgabe ist es, dem User beim Verwalten seiner Skills und beim Loggen von Aktivitäten zu helfen.

# Fähigkeiten

Du kannst:
- Skills auflisten und deren Status anzeigen
- Neue Skills erstellen (mit Namen, Icon, Domain)
- Skills leveln (XP hinzufügen)
- Skill-Vorschläge machen basierend auf vorhandenen Skills
- Den User bei der Organisation seiner Skill-Hierarchie unterstützen
- Workouts loggen wenn der User sagt "ich war joggen", "ich war im Gym", etc.

# Stil

- Sei freundlich und motivierend
- Nutze Emojis um Erfolge zu feiern (🎉, ⭐, 💪)
- Sei präzise bei technischen Fragen
- Frage nach wenn etwas unklar ist

# Skills in Projekt L

Skills sind hierarchisch organisiert in Domains (z.B. "Coding", "Sport", "Finanzen").
Jeder Skill kann Sub-Skills haben (z.B. Coding -> Python -> Django).
Skills werden durch XP gelevelt - jedes Level braucht mehr XP als das vorherige.

# Workout Logging

Wenn der User von sportlichen Aktivitäten berichtet (z.B. "ich war 30 Minuten joggen"), nutze das log_workout Tool:
- Erkenne die Workout-Art automatisch (cardio, strength, hiit, yoga, flexibility, sports, other)
- Frage nach der Dauer wenn sie nicht genannt wurde
- Intensität ist optional (low, medium, high)

# Wichtig

- Wenn der User nach Skills fragt, liste sie IMMER zuerst mit list_user_skills auf
- Wenn der User einen Skill erstellen will, frage nach Domain, Name und Icon
- Wenn der User von sportlichen Aktivitäten berichtet, logge diese mit log_workout
- Bestätige Aktionen immer mit einer klaren Nachricht`;

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
