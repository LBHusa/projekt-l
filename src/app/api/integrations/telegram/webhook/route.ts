/**
 * Telegram Webhook Endpoint
 * POST /api/integrations/telegram/webhook
 *
 * Receives updates from Telegram when users interact with the bot
 * Phase 3: Extended with AI Chat support
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage, answerCallbackQuery, type TelegramUpdate } from '@/lib/telegram';
import { consumeConnectionCode } from '@/lib/telegram-codes';
import { handleTelegramAIChat, handleTelegramCallback } from '@/lib/telegram-ai';

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify secret token (optional but recommended)
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedToken && secretToken !== expectedToken) {
      console.warn('Invalid Telegram webhook secret token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update: TelegramUpdate = await request.json();

    // Handle callback queries (button presses)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackChatId = callbackQuery.message?.chat.id;
      const callbackData = callbackQuery.data;

      // Acknowledge the callback
      await answerCallbackQuery(callbackQuery.id);

      if (callbackChatId && callbackData) {
        // Find user for this chat
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('user_id')
          .eq('telegram_chat_id', callbackChatId.toString())
          .single();

        if (settings?.user_id) {
          const response = await handleTelegramCallback(
            settings.user_id,
            callbackChatId,
            callbackData
          );
          if (response) {
            await sendMessage(callbackChatId, response, { parseMode: 'HTML' });
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Only process text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const firstName = update.message.chat.first_name || 'User';

    // Handle /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ');

      if (parts.length === 1) {
        // Simple /start - show welcome message
        await sendMessage(
          chatId,
          `Hallo ${firstName}! Willkommen bei Projekt L.\n\n` +
          `Um Benachrichtigungen zu erhalten, verbinde deinen Account:\n` +
          `1. Gehe zu projekt-l.husatech.com/settings/notifications\n` +
          `2. Klicke auf "Mit Telegram verbinden"\n` +
          `3. Folge dem Link zurück hierher\n\n` +
          `Bei Fragen: /help`,
          { parseMode: 'HTML' }
        );
      } else {
        // /start with payload - attempt connection
        const code = parts[1];
        const userId = consumeConnectionCode(code);

        if (userId) {
          // Valid code - connect the account
          const { error } = await supabase
            .from('notification_settings')
            .upsert({
              user_id: userId,
              telegram_enabled: true,
              telegram_chat_id: chatId.toString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });

          if (error) {
            console.error('Error saving Telegram connection:', error);
            await sendMessage(
              chatId,
              'Es gab einen Fehler beim Verbinden. Bitte versuche es erneut.',
              { parseMode: 'HTML' }
            );
          } else {
            await sendMessage(
              chatId,
              `Erfolgreich verbunden! Du erhältst jetzt Benachrichtigungen von Projekt L.\n\n` +
              `Du kannst die Verbindung jederzeit in den Einstellungen trennen.`,
              { parseMode: 'HTML' }
            );
          }
        } else {
          // Invalid or expired code
          await sendMessage(
            chatId,
            `Der Verbindungscode ist ungültig oder abgelaufen.\n\n` +
            `Bitte generiere einen neuen Code in den Einstellungen:\n` +
            `projekt-l.husatech.com/settings/notifications`,
            { parseMode: 'HTML' }
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Handle /help command
    if (text === '/help') {
      await sendMessage(
        chatId,
        `<b>Projekt L Bot - Hilfe</b>\n\n` +
        `Ich bin dein KI-Begleiter! Schreibe mir einfach, was du getan hast:\n` +
        `- "Ich war joggen"\n` +
        `- "30 Min meditiert"\n` +
        `- "50€ für Essen ausgegeben"\n\n` +
        `Ich logge das automatisch und gebe dir XP!\n\n` +
        `<b>Benachrichtigungen:</b>\n` +
        `- Quest-Erinnerungen\n` +
        `- Streak-Warnungen\n` +
        `- Achievement-Meldungen\n\n` +
        `<b>Befehle:</b>\n` +
        `/start - Bot verbinden\n` +
        `/status - Verbindungsstatus\n` +
        `/help - Diese Hilfe\n\n` +
        `<i>Tageslimit: 20 AI-Nachrichten</i>`,
        { parseMode: 'HTML' }
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /status command
    if (text === '/status') {
      // Check if this chat is connected to any user
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id, telegram_enabled')
        .eq('telegram_chat_id', chatId.toString())
        .single();

      if (settings && settings.telegram_enabled) {
        await sendMessage(
          chatId,
          `Dein Telegram ist mit Projekt L verbunden.\n` +
          `Benachrichtigungen sind aktiviert.`,
          { parseMode: 'HTML' }
        );
      } else {
        await sendMessage(
          chatId,
          `Dein Telegram ist nicht verbunden.\n\n` +
          `Verbinde deinen Account:\n` +
          `projekt-l.husatech.com/settings/notifications`,
          { parseMode: 'HTML' }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Free text message - forward to AI Chat
    // First, check if this chat is connected to a user
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('user_id, telegram_enabled')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    if (!settings?.user_id || !settings.telegram_enabled) {
      await sendMessage(
        chatId,
        `Um mit mir zu chatten, verbinde zuerst deinen Account:\n` +
        `projekt-l.husatech.com/settings/notifications\n\n` +
        `/help für mehr Infos.`,
        { parseMode: 'HTML' }
      );
      return NextResponse.json({ ok: true });
    }

    // Forward to AI Chat
    await handleTelegramAIChat(settings.user_id, chatId, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

// GET is not allowed
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
