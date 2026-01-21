/**
 * LLM API Key Settings API
 * POST: Save API key
 * GET: Get key info (not the key itself!)
 * DELETE: Delete API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  saveLlmApiKey,
  getLlmKeyInfo,
  deleteLlmApiKey,
  type LlmProvider,
} from '@/lib/data/llm-keys';

// ============================================
// GET - Get key info (hasKey, prefix, provider)
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider from query params (default: anthropic)
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get('provider') || 'anthropic') as LlmProvider;

    const keyInfo = await getLlmKeyInfo(user.id, provider);

    return NextResponse.json({
      success: true,
      ...keyInfo,
    });
  } catch (error) {
    console.error('GET /api/settings/llm-key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Save API key (encrypted)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, provider = 'anthropic' } = body as {
      apiKey?: string;
      provider?: LlmProvider;
    };

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API Key erforderlich' },
        { status: 400 }
      );
    }

    // Trim whitespace
    const trimmedKey = apiKey.trim();

    // Basic validation
    if (trimmedKey.length < 20) {
      return NextResponse.json(
        { error: 'API Key zu kurz' },
        { status: 400 }
      );
    }

    const result = await saveLlmApiKey(user.id, provider, trimmedKey);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Fehler beim Speichern' },
        { status: 400 }
      );
    }

    // Get updated key info to return
    const keyInfo = await getLlmKeyInfo(user.id, provider);

    return NextResponse.json({
      success: true,
      message: 'API Key gespeichert',
      ...keyInfo,
    });
  } catch (error) {
    console.error('POST /api/settings/llm-key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Remove API key
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider from query params (default: anthropic)
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get('provider') || 'anthropic') as LlmProvider;

    const result = await deleteLlmApiKey(user.id, provider);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Fehler beim Löschen' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API Key gelöscht',
    });
  } catch (error) {
    console.error('DELETE /api/settings/llm-key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
