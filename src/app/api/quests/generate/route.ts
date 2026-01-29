/**
 * AI Quest Generation API Endpoint
 * POST /api/quests/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getUserQuestContext,
  generateQuests,
  saveQuests,
} from '@/lib/ai/questGenerator'
import { canUserUseAI } from '@/lib/ai/trial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { questType = 'daily', count = 1 } = body

    // Validate quest type
    if (!['daily', 'weekly', 'story'].includes(questType)) {
      return NextResponse.json(
        { error: 'Invalid quest type. Must be daily, weekly, or story' },
        { status: 400 }
      )
    }

    // Validate count
    if (count < 1 || count > 5) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check trial status before proceeding
    const trialCheck = await canUserUseAI(user.id)

    if (!trialCheck.allowed) {
      if (trialCheck.reason === 'trial_expired') {
        return NextResponse.json(
          {
            error: 'trial_expired',
            message:
              'Deine kostenlose Testphase ist abgelaufen. Bitte hinterlege deinen eigenen API-Key unter Einstellungen > Integrationen.',
            requiresApiKey: true,
            remainingMinutes: 0,
          },
          { status: 403 }
        )
      }

      if (trialCheck.reason === 'no_trial') {
        return NextResponse.json(
          {
            error: 'no_trial',
            message:
              'Bitte schließe zuerst das Onboarding ab, um den KI-Assistenten zu nutzen.',
          },
          { status: 403 }
        )
      }
    }

    // Check if ANTHROPIC_API_KEY is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            'AI Quest Generation is not configured. Please add ANTHROPIC_API_KEY to environment variables.',
        },
        { status: 503 }
      )
    }

    // Get user context for quest generation
    const context = await getUserQuestContext(user.id)

    // Generate quests using AI
    const generatedQuests = await generateQuests(context, questType, count)

    // Save quests to database
    const savedQuests = await saveQuests(generatedQuests, user.id)

    return NextResponse.json(
      {
        success: true,
        quests: savedQuests,
        message: `Successfully generated ${savedQuests.length} ${questType} quest(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Quest generation error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid AI API key configuration' },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to generate quests' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/quests/generate - Get quest generation status/info
 */
export async function GET() {
  const isConfigured = !!process.env.ANTHROPIC_API_KEY

  return NextResponse.json({
    configured: isConfigured,
    model: 'claude-3-5-sonnet-20241022',
    supportedTypes: ['daily', 'weekly', 'story'],
    maxQuestsPerRequest: 5,
  })
}
