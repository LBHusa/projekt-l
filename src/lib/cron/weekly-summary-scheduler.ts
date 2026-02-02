// ============================================
// Projekt L - Weekly Summary Generator Scheduler
// Phase 3: Lebendiger Buddy
// Generates AI summaries from weekly conversations
// Runs every Sunday at 03:00 AM
// ============================================

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Cron schedule: Every Sunday at 03:00 AM
const SUMMARY_CRON = '0 3 * * 0';

// Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Anthropic client
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

/**
 * Get users who have conversations in the last 7 days
 */
async function getUsersWithRecentConversations(): Promise<string[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('conversation_history')
    .select('user_id')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('user_id');

  if (error) {
    console.error('[Weekly Summary] Error fetching users with conversations:', error);
    return [];
  }

  // Get unique user IDs
  const uniqueUserIds = [...new Set((data || []).map(d => d.user_id))];
  return uniqueUserIds;
}

/**
 * Get conversations from the last 7 days for a user
 */
async function getWeeklyConversations(userId: string): Promise<Array<{
  role: string;
  content: string;
  created_at: string;
}>> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('conversation_history')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`[Weekly Summary] Error fetching conversations for ${userId}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Generate AI summary from conversations
 */
async function generateSummary(conversations: Array<{
  role: string;
  content: string;
  created_at: string;
}>): Promise<{
  summary: string;
  preferences: Record<string, string>;
  patterns: Record<string, string>;
}> {
  const client = getAnthropicClient();

  // Format conversations for AI
  const conversationText = conversations
    .map(c => {
      const date = new Date(c.created_at).toLocaleDateString('de-DE');
      return `[${date}] ${c.role}: ${c.content}`;
    })
    .join('\n\n');

  const systemPrompt = `Du bist ein AI-Assistent, der Gesprächszusammenfassungen erstellt.
Analysiere die folgenden Gespräche der letzten Woche und erstelle:

1. Eine kurze Zusammenfassung (2-3 Sätze) der wichtigsten Themen und Aktivitäten
2. Erkannte Präferenzen des Users (als JSON-Objekt)
3. Erkannte Verhaltensmuster (als JSON-Objekt)

Antworte im folgenden JSON-Format:
{
  "summary": "Zusammenfassung hier...",
  "preferences": {
    "key1": "value1"
  },
  "patterns": {
    "key1": "value1"
  }
}

Wichtig:
- Halte die Zusammenfassung kurz und relevant
- Präferenzen sind Dinge, die der User mag/bevorzugt (z.B. "Trainingszeit": "morgens")
- Muster sind wiederkehrende Verhaltensweisen (z.B. "Aktivste Tage": "Mo, Mi, Fr")
- Wenn nichts erkannt wurde, verwende leere Objekte {}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Hier sind die Gespräche der letzten Woche:\n\n${conversationText}`,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON response
    const parsed = JSON.parse(textContent.text);
    return {
      summary: parsed.summary || '',
      preferences: parsed.preferences || {},
      patterns: parsed.patterns || {},
    };
  } catch (error) {
    console.error('[Weekly Summary] Error generating summary:', error);
    return {
      summary: '',
      preferences: {},
      patterns: {},
    };
  }
}

/**
 * Update user summary in database
 */
async function updateUserSummary(
  userId: string,
  summary: string,
  preferences: Record<string, string>,
  patterns: Record<string, string>
): Promise<void> {
  // Get current conversation count
  const { count } = await supabase
    .from('conversation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { error } = await supabase
    .from('user_summaries')
    .upsert({
      user_id: userId,
      weekly_summary: summary,
      preferences,
      patterns,
      last_summary_at: new Date().toISOString(),
      last_summary_message_count: count || 0,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`[Weekly Summary] Error updating summary for ${userId}:`, error);
    throw error;
  }
}

/**
 * Generate summaries for all users with recent conversations
 */
async function generateAllUserSummaries(): Promise<void> {
  console.log('[Weekly Summary] Starting weekly summary generation...');

  try {
    const userIds = await getUsersWithRecentConversations();
    console.log(`[Weekly Summary] Found ${userIds.length} users with recent conversations`);

    if (userIds.length === 0) {
      console.log('[Weekly Summary] No users to process');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        // Get conversations
        const conversations = await getWeeklyConversations(userId);

        if (conversations.length < 3) {
          console.log(`[Weekly Summary] Skipping ${userId} - only ${conversations.length} messages`);
          continue;
        }

        // Generate summary
        const { summary, preferences, patterns } = await generateSummary(conversations);

        if (!summary) {
          console.log(`[Weekly Summary] Empty summary for ${userId}`);
          continue;
        }

        // Store summary
        await updateUserSummary(userId, summary, preferences, patterns);
        successCount++;

        console.log(`[Weekly Summary] Generated summary for ${userId} (${conversations.length} messages)`);

        // Rate limit - don't spam AI API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Weekly Summary] Error processing user ${userId}:`, error);
        errorCount++;
      }
    }

    console.log(`[Weekly Summary] Complete: ${successCount} summaries generated, ${errorCount} errors`);
  } catch (error) {
    console.error('[Weekly Summary] Fatal error:', error);
  }
}

/**
 * Initialize the weekly summary scheduler
 */
export function initWeeklySummaryScheduler(): void {
  // Skip scheduler in development to avoid unnecessary API calls
  if (process.env.NODE_ENV === 'development') {
    console.log('[Weekly Summary] Skipping scheduler in development');
    return;
  }

  cron.schedule(SUMMARY_CRON, () => {
    generateAllUserSummaries();
  });

  console.log('[Weekly Summary] Scheduler initialized (Sundays 03:00)');
}

/**
 * Manual trigger for testing (can be called via API)
 */
export async function triggerWeeklySummary(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await generateAllUserSummaries();
    return { success: true, message: 'Weekly summary generation completed' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}
