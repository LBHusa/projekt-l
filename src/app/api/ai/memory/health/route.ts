/**
 * Memory Health Check API
 * GET /api/ai/memory/health
 *
 * Checks Qdrant availability and collection status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkHealth, ensureCollection, getUserEmbeddingCount } from '@/lib/ai/memory-rag';

export async function GET() {
  try {
    // Get authenticated user (optional for health check)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check Qdrant health
    const health = await checkHealth();

    // If user authenticated, get their embedding count
    let userEmbeddingCount: number | null = null;
    if (user && health.collectionExists) {
      try {
        userEmbeddingCount = await getUserEmbeddingCount(user.id);
      } catch (e) {
        console.error('[Memory Health] Error getting user embedding count:', e);
      }
    }

    return NextResponse.json({
      status: health.qdrantAvailable ? 'ok' : 'error',
      qdrant: {
        available: health.qdrantAvailable,
        collection: health.collectionExists ? health.collectionInfo : null,
      },
      user: user ? {
        id: user.id,
        embeddingCount: userEmbeddingCount,
      } : null,
    });
  } catch (error) {
    console.error('[Memory Health API] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to check health',
      },
      { status: 500 }
    );
  }
}

/**
 * Initialize collection
 * POST /api/ai/memory/health
 */
export async function POST() {
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

    // Ensure collection exists
    await ensureCollection();

    return NextResponse.json({
      success: true,
      message: 'Collection initialized',
    });
  } catch (error) {
    console.error('[Memory Health API] Error initializing:', error);
    return NextResponse.json(
      { error: 'Failed to initialize collection' },
      { status: 500 }
    );
  }
}
