/**
 * Telegram AI Chat Service
 * Phase 3: Lebendiger Buddy
 * Handles AI chat via Telegram with rate limiting
 */

import Anthropic from '@anthropic-ai/sdk';
import { sendMessage } from './telegram';
import { getApiKeyForUser } from './data/llm-keys';
import { storeConversationBatch, getRecentMessages, getUserMemoryContext } from './data/conversation-memory';
import { buildHybridContext, storeConversationEmbedding, ensureCollection } from './ai/memory-rag';
import { skillTools, executeSkillTool } from './ai/skill-tools';
import { createClient } from '@supabase/supabase-js';

// ============================================
// RATE LIMITING
// ============================================

// In-memory rate limit store (per user)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_AI_MESSAGES_PER_DAY = 20;

/**
 * Check and update rate limit for user
 */
export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const midnightReset = new Date().setHours(24, 0, 0, 0);

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset limit
    rateLimitStore.set(userId, { count: 1, resetAt: midnightReset });
    return { allowed: true, remaining: MAX_AI_MESSAGES_PER_DAY - 1 };
  }

  if (userLimit.count >= MAX_AI_MESSAGES_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: MAX_AI_MESSAGES_PER_DAY - userLimit.count };
}

// ============================================
// SYSTEM PROMPT FOR TELEGRAM
// ============================================

const TELEGRAM_SYSTEM_PROMPT = `Du bist der persönliche AI-Assistent für "Projekt L", ein Life Gamification System.
Du kommunizierst gerade via Telegram.

# TELEGRAM-SPEZIFISCHE REGELN

**WICHTIG: Telegram-Nachrichten sollen KÜRZER sein als Web-Chat!**

1. **Antwort-Länge:** 1-3 Sätze (max 500 Zeichen)
2. **Formatierung:** Nutze Emojis sparsam aber effektiv
3. **Keine langen Listen** - fasse zusammen
4. **Kein Markdown** - Telegram unterstützt nur HTML (bold, italic)

# VERFÜGBARE AKTIONEN

Du kannst ALLES was auch im Web-Chat geht:
- Habits loggen
- Workouts eintragen
- Skills verwalten
- Quests bearbeiten
- Finanzen tracken

# STIL FÜR TELEGRAM

Beispiele:
- "Joggen geloggt! +25 XP Körper. Du hast einen 5-Tage-Streak!"
- "Quest 'Morgenroutine' ist bei 2/3 - weiter so!"
- "50€ Ausgabe notiert. Dein Monatsbudget: noch 320€"

# SPRACHE

**IMMER auf Deutsch antworten.**`;

// ============================================
// AI CHAT HANDLER
// ============================================

/**
 * Handle AI chat message from Telegram
 */
export async function handleTelegramAIChat(
  userId: string,
  chatId: number,
  userMessage: string
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      await sendMessage(
        chatId,
        'Du hast dein Tageslimit von 20 AI-Nachrichten erreicht. Morgen geht\'s weiter!',
        { parseMode: 'HTML' }
      );
      return;
    }

    // Get API key for user
    const keyResult = await getApiKeyForUser(userId, 'anthropic');
    if (!keyResult) {
      await sendMessage(
        chatId,
        'Kein API Key konfiguriert. Bitte hinterlege deinen API Key in den Einstellungen.',
        { parseMode: 'HTML' }
      );
      return;
    }

    // Build memory context
    let memoryContextString = '';
    try {
      const recentMessages = await getRecentMessages(30, userId); // Smaller window for Telegram
      const memorySummary = await getUserMemoryContext(userId);
      const hybridContext = await buildHybridContext(
        userId,
        recentMessages,
        memorySummary,
        userMessage
      );
      memoryContextString = hybridContext.contextString;
    } catch (memoryError) {
      console.error('[Telegram AI] Memory error (non-fatal):', memoryError);
    }

    // Build system prompt with memory
    const systemPrompt = memoryContextString
      ? `${TELEGRAM_SYSTEM_PROMPT}\n\n# MEMORY CONTEXT\n${memoryContextString}`
      : TELEGRAM_SYSTEM_PROMPT;

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey: keyResult.apiKey });

    // Send typing indicator (show ... while processing)
    // Note: Telegram doesn't have a typing API via sendMessage

    // Create AI request
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500, // Shorter for Telegram
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      tools: skillTools,
    });

    // Handle tool use
    let finalResponse = response;
    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await executeSkillTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          userId
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
        tools: skillTools,
      });
    }

    // Extract response text
    const assistantText = finalResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    if (!assistantText) {
      await sendMessage(
        chatId,
        'Entschuldigung, ich konnte keine Antwort generieren.',
        { parseMode: 'HTML' }
      );
      return;
    }

    // Determine if we should show quick-action buttons
    const toolsUsed = response.stop_reason === 'tool_use';
    const quickActions = toolsUsed ? buildQuickActionButtons(response) : undefined;

    // Send response with optional quick actions
    await sendMessage(
      chatId,
      assistantText,
      {
        parseMode: 'HTML',
        replyMarkup: quickActions,
      }
    );

    // Store conversation in memory (async)
    storeConversationInMemory(userId, userMessage, assistantText).catch(err =>
      console.error('[Telegram AI] Memory storage error:', err)
    );

    console.log(`[Telegram AI] Processed message for user ${userId}, ${rateLimit.remaining} remaining`);
  } catch (error) {
    console.error('[Telegram AI] Error:', error);
    await sendMessage(
      chatId,
      'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
      { parseMode: 'HTML' }
    );
  }
}

// ============================================
// QUICK ACTION BUTTONS
// ============================================

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Build quick-action buttons based on tool usage
 */
function buildQuickActionButtons(response: Anthropic.Message): InlineKeyboardMarkup | undefined {
  const toolUses = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (toolUses.length === 0) return undefined;

  const buttons: InlineKeyboardButton[][] = [];

  // Check what tools were used and offer relevant actions
  const usedTools = new Set(toolUses.map(t => t.name));

  // If habit or workout was logged, offer mood logging
  if (usedTools.has('log_habit') || usedTools.has('log_workout')) {
    buttons.push([
      { text: '+Mood', callback_data: 'action:mood' },
      { text: 'Quests', callback_data: 'action:quests' },
    ]);
  }

  // If quests were listed, offer quest actions
  if (usedTools.has('list_active_quests')) {
    buttons.push([
      { text: 'Quest-Fortschritt', callback_data: 'action:quest_progress' },
    ]);
  }

  // Default: show general quick actions
  if (buttons.length === 0) {
    buttons.push([
      { text: 'Erledigt', callback_data: 'action:done' },
      { text: '+Habit', callback_data: 'action:habit' },
      { text: '+Mood', callback_data: 'action:mood' },
    ]);
  }

  return { inline_keyboard: buttons };
}

// ============================================
// MEMORY STORAGE
// ============================================

async function storeConversationInMemory(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    // Store both messages
    const stored = await storeConversationBatch([
      { role: 'user', content: userMessage, source: 'telegram' },
      { role: 'assistant', content: assistantResponse, source: 'telegram' },
    ], userId);

    // Create embedding for user message
    const userConversation = stored.find(c => c.role === 'user');
    if (userConversation) {
      try {
        await ensureCollection();
        await storeConversationEmbedding(userConversation, userId);
      } catch (embeddingError) {
        console.error('[Telegram AI] Embedding error (non-fatal):', embeddingError);
      }
    }
  } catch (error) {
    console.error('[Telegram AI] Memory storage error:', error);
  }
}

// ============================================
// CALLBACK QUERY HANDLER
// ============================================

/**
 * Handle callback query from quick-action buttons
 */
export async function handleTelegramCallback(
  userId: string,
  chatId: number,
  callbackData: string
): Promise<string | null> {
  // Parse callback data
  if (!callbackData.startsWith('action:')) {
    return null;
  }

  const action = callbackData.replace('action:', '');

  switch (action) {
    case 'mood':
      return 'Wie geht es dir gerade? Antworte mit: super, gut, okay, schlecht, oder mies';
    case 'habit':
      return 'Welchen Habit hast du erledigt?';
    case 'quests':
      // This will trigger the AI to list quests
      await handleTelegramAIChat(userId, chatId, 'Zeige meine aktiven Quests');
      return null;
    case 'quest_progress':
      return 'Bei welcher Quest hast du Fortschritt gemacht?';
    case 'done':
      return 'Was hast du erledigt?';
    default:
      return null;
  }
}
