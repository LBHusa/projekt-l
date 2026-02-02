/**
 * Memory Export API
 * GET /api/user/memory-export
 *
 * GDPR-compliant export of all user conversation data
 * Returns JSON file with all conversations and summaries
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportUserMemory } from '@/lib/data/conversation-memory';
import { getUserEmbeddingCount, checkHealth } from '@/lib/ai/memory-rag';

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

    // Export all memory data
    const memoryExport = await exportUserMemory(user.id);

    // Get embedding count from Qdrant
    let embeddingCount = 0;
    const health = await checkHealth();
    if (health.qdrantAvailable && health.collectionExists) {
      try {
        embeddingCount = await getUserEmbeddingCount(user.id);
      } catch (e) {
        console.error('[Memory Export] Error getting embedding count:', e);
      }
    }

    // Build export response
    const exportData = {
      _export_info: {
        exportedAt: memoryExport.exportedAt,
        userId: user.id,
        userEmail: user.email,
        dataType: 'AI Conversation Memory',
        format: 'JSON',
      },
      statistics: {
        totalConversations: memoryExport.conversations.length,
        totalMessages: memoryExport.conversations.length,
        embeddingsCreated: embeddingCount,
        hasSummary: !!memoryExport.summary?.weekly_summary,
      },
      conversations: memoryExport.conversations.map(c => ({
        id: c.id,
        role: c.role,
        content: c.content,
        source: c.source,
        createdAt: c.created_at,
        hasEmbedding: !!c.qdrant_point_id,
      })),
      summary: memoryExport.summary ? {
        weeklySummary: memoryExport.summary.weekly_summary,
        preferences: memoryExport.summary.preferences,
        patterns: memoryExport.summary.patterns,
        conversationCount: memoryExport.summary.conversation_count,
        lastSummaryAt: memoryExport.summary.last_summary_at,
      } : null,
    };

    // Return as downloadable JSON
    const filename = `projekt-l-memory-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Memory Export API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export memory data' },
      { status: 500 }
    );
  }
}
