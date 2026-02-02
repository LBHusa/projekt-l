// ============================================
// CONVERSATION MEMORY DATA ACCESS
// Phase 3: Lebendiger Buddy
// Stores all AI conversations in Supabase
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  ConversationHistory,
  ConversationHistoryInsert,
  UserSummary,
  UserMemoryContext,
  RecentMessage,
  ConversationRole,
  ConversationSource,
  Json,
} from '@/lib/database.types';

// ============================================
// CONVERSATION CRUD
// ============================================

/**
 * Store a conversation message
 */
export async function storeConversation(
  message: {
    role: ConversationRole;
    content: string;
    toolCalls?: Json;
    toolResults?: Json;
    tokensUsed?: number;
    source?: ConversationSource;
  },
  userId?: string
): Promise<ConversationHistory> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const insert: ConversationHistoryInsert = {
    user_id: resolvedUserId,
    role: message.role,
    content: message.content,
    tool_calls: message.toolCalls || null,
    tool_results: message.toolResults || null,
    tokens_used: message.tokensUsed || null,
    source: message.source || 'web',
  };

  const { data, error } = await supabase
    .from('conversation_history')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Error storing conversation:', error);
    throw error;
  }

  return data;
}

/**
 * Store multiple messages at once (e.g., after a chat turn)
 */
export async function storeConversationBatch(
  messages: Array<{
    role: ConversationRole;
    content: string;
    toolCalls?: Json;
    toolResults?: Json;
    tokensUsed?: number;
    source?: ConversationSource;
  }>,
  userId?: string
): Promise<ConversationHistory[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const inserts: ConversationHistoryInsert[] = messages.map(msg => ({
    user_id: resolvedUserId,
    role: msg.role,
    content: msg.content,
    tool_calls: msg.toolCalls || null,
    tool_results: msg.toolResults || null,
    tokens_used: msg.tokensUsed || null,
    source: msg.source || 'web',
  }));

  const { data, error } = await supabase
    .from('conversation_history')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error storing conversation batch:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get recent messages (sliding window, default 50)
 */
export async function getRecentMessages(
  limit: number = 50,
  userId?: string
): Promise<RecentMessage[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('get_recent_messages', {
    p_user_id: resolvedUserId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error getting recent messages:', error);
    // Fallback to direct query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('conversation_history')
      .select('id, role, content, tool_calls, created_at')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fallbackError) {
      throw fallbackError;
    }

    return (fallbackData || []).reverse(); // Oldest first for context
  }

  // Reverse to get chronological order (oldest first)
  return (data || []).reverse();
}

/**
 * Get all conversations (for export)
 */
export async function getAllConversations(
  userId?: string
): Promise<ConversationHistory[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('conversation_history')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting all conversations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get conversation count for user
 */
export async function getConversationCount(userId?: string): Promise<number> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { count, error } = await supabase
    .from('conversation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error getting conversation count:', error);
    throw error;
  }

  return count || 0;
}

// ============================================
// USER SUMMARY CRUD
// ============================================

/**
 * Get user memory context (summary + preferences + patterns)
 */
export async function getUserMemoryContext(
  userId?: string
): Promise<UserMemoryContext> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase.rpc('get_user_memory_context', {
    p_user_id: resolvedUserId,
  });

  if (error) {
    console.error('Error getting user memory context:', error);
    // Return empty context
    return {
      has_history: false,
      weekly_summary: null,
      preferences: {},
      patterns: {},
      conversation_count: 0,
      last_summary_at: null,
    };
  }

  return data as UserMemoryContext;
}

/**
 * Get user summary
 */
export async function getUserSummary(userId?: string): Promise<UserSummary | null> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_summaries')
    .select('*')
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No record
    }
    console.error('Error getting user summary:', error);
    throw error;
  }

  return data;
}

/**
 * Update user summary (for weekly summary generator)
 */
export async function updateUserSummary(
  updates: {
    weeklySummary?: string;
    preferences?: Json;
    patterns?: Json;
  },
  userId?: string
): Promise<UserSummary> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  // Get current message count for summary tracking
  const count = await getConversationCount(resolvedUserId);

  const { data, error } = await supabase
    .from('user_summaries')
    .upsert({
      user_id: resolvedUserId,
      weekly_summary: updates.weeklySummary,
      preferences: updates.preferences,
      patterns: updates.patterns,
      last_summary_at: new Date().toISOString(),
      last_summary_message_count: count,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating user summary:', error);
    throw error;
  }

  return data;
}

// ============================================
// QDRANT REFERENCE UPDATES
// Called by RAG system after embedding creation
// ============================================

/**
 * Update conversation with Qdrant reference
 */
export async function setConversationEmbedding(
  conversationId: string,
  qdrantPointId: number,
  userId?: string
): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { error } = await supabase
    .from('conversation_history')
    .update({
      qdrant_point_id: qdrantPointId,
      embedding_created_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('user_id', resolvedUserId); // Extra safety

  if (error) {
    console.error('Error setting conversation embedding:', error);
    throw error;
  }
}

/**
 * Get conversations without embeddings (for backfill)
 */
export async function getConversationsWithoutEmbeddings(
  limit: number = 100,
  userId?: string
): Promise<ConversationHistory[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('conversation_history')
    .select('*')
    .eq('user_id', resolvedUserId)
    .is('qdrant_point_id', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error getting conversations without embeddings:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// MEMORY EXPORT (GDPR)
// ============================================

/**
 * Export all user memory data for GDPR compliance
 */
export async function exportUserMemory(userId?: string): Promise<{
  conversations: ConversationHistory[];
  summary: UserSummary | null;
  exportedAt: string;
}> {
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const [conversations, summary] = await Promise.all([
    getAllConversations(resolvedUserId),
    getUserSummary(resolvedUserId),
  ]);

  return {
    conversations,
    summary,
    exportedAt: new Date().toISOString(),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format messages for AI context (converting to Anthropic format)
 */
export function formatMessagesForContext(
  messages: RecentMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(m => m.role !== 'system') // Exclude system messages
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/**
 * Build context string from summary and patterns
 */
export function buildMemoryContextString(context: UserMemoryContext): string {
  const parts: string[] = [];

  if (context.weekly_summary) {
    parts.push(`## Zusammenfassung der letzten Woche\n${context.weekly_summary}`);
  }

  if (context.preferences && Object.keys(context.preferences as object).length > 0) {
    const prefs = context.preferences as Record<string, unknown>;
    const prefLines = Object.entries(prefs)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    parts.push(`## Bekannte Präferenzen\n${prefLines}`);
  }

  if (context.patterns && Object.keys(context.patterns as object).length > 0) {
    const pats = context.patterns as Record<string, unknown>;
    const patLines = Object.entries(pats)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    parts.push(`## Erkannte Muster\n${patLines}`);
  }

  return parts.join('\n\n');
}
