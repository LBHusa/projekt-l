/**
 * Telegram Webhook Endpoint
 * POST /api/integrations/telegram/webhook
 *
 * Receives updates from Telegram when users interact with the bot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage, type TelegramUpdate } from '@/lib/telegram';
import { consumeConnectionCode } from '@/lib/telegram-codes';

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

    // Only process messages
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
        `Dieser Bot sendet dir Benachrichtigungen von Projekt L:\n` +
        `- Quest-Erinnerungen\n` +
        `- Streak-Warnungen\n` +
        `- Achievement-Benachrichtigungen\n\n` +
        `<b>Befehle:</b>\n` +
        `/start - Bot starten & verbinden\n` +
        `/status - Verbindungsstatus prüfen\n` +
        `/help - Diese Hilfe anzeigen`,
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

    // Unknown command - show help hint
    await sendMessage(
      chatId,
      `Ich verstehe diesen Befehl nicht. Schreibe /help für eine Übersicht.`,
      { parseMode: 'HTML' }
    );

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
