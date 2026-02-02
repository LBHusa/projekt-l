/**
 * Memory Search API
 * GET /api/ai/memory/search?q=...
 *
 * Searches user's conversation memory using semantic search
 * CRITICAL: Always filters by authenticated user's ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchUserMemory, checkHealth } from '@/lib/ai/memory-rag';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameter
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const minScore = parseFloat(searchParams.get('minScore') || '0.7');
    const roleFilter = searchParams.get('role') as 'user' | 'assistant' | undefined;
    const sourceFilter = searchParams.get('source') as 'web' | 'telegram' | 'api' | undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Check Qdrant health first
    const health = await checkHealth();
    if (!health.qdrantAvailable) {
      return NextResponse.json(
        { error: 'Memory service unavailable' },
        { status: 503 }
      );
    }

    if (!health.collectionExists) {
      return NextResponse.json({
        results: [],
        message: 'No memory data yet',
      });
    }

    // Search memory (ALWAYS filtered by user.id)
    const results = await searchUserMemory(query, user.id, {
      limit: Math.min(limit, 20), // Cap at 20
      minScore,
      roleFilter,
      sourceFilter,
    });

    return NextResponse.json({
      results,
      query,
      userId: user.id,
    });
  } catch (error) {
    console.error('[Memory Search API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search memory' },
      { status: 500 }
    );
  }
}
