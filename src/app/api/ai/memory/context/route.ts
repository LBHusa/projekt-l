/**
 * Memory Context API
 * GET /api/ai/memory/context
 *
 * Returns hybrid context for AI chat (summary + patterns + recent)
 * Used by clients that want to preview context before chat
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentMessages, getUserMemoryContext } from '@/lib/data/conversation-memory';
import { buildHybridContext, checkHealth } from '@/lib/ai/memory-rag';

export async function GET() {
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

    // Get recent messages (sliding window)
    const recentMessages = await getRecentMessages(50, user.id);

    // Get memory summary
    const memorySummary = await getUserMemoryContext(user.id);

    // Check if Qdrant is available for semantic search
    const health = await checkHealth();
    const ragAvailable = health.qdrantAvailable && health.collectionExists;

    // Build context without semantic search (no query)
    const hybridContext = await buildHybridContext(
      user.id,
      recentMessages,
      memorySummary,
      undefined // No query = no semantic search
    );

    return NextResponse.json({
      userId: user.id,
      recentMessageCount: recentMessages.length,
      memorySummary: {
        hasHistory: memorySummary?.has_history || false,
        conversationCount: memorySummary?.conversation_count || 0,
        lastSummaryAt: memorySummary?.last_summary_at || null,
        hasPreferences: memorySummary?.preferences && Object.keys(memorySummary.preferences as object).length > 0,
        hasPatterns: memorySummary?.patterns && Object.keys(memorySummary.patterns as object).length > 0,
      },
      contextString: hybridContext.contextString,
      ragAvailable,
    });
  } catch (error) {
    console.error('[Memory Context API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get memory context' },
      { status: 500 }
    );
  }
}
