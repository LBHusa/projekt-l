// ============================================
// Projekt L - Telegram Bot Integration
// ============================================

import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

// Bot instance (singleton)
let bot: Telegraf | null = null;

// Initialize bot
export function getBot(): Telegraf {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    bot = new Telegraf(token);
    setupBotCommands(bot);
  }
  return bot;
}

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Setup bot commands
function setupBotCommands(bot: Telegraf) {
  // /start command - Connect user
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;

    // Check if this is a connect request
    const args = ctx.message.text.split(' ')[1];
    if (args === 'connect') {
      // Store chat_id in database
      // TODO: Replace with actual user auth
      const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: TEST_USER_ID,
          telegram_enabled: true,
          telegram_chat_id: chatId,
          telegram_username: username,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving Telegram connection:', error);
        await ctx.reply('❌ Fehler beim Verbinden. Bitte versuche es später erneut.');
        return;
      }

      await ctx.reply(
        `✅ Erfolgreich verbunden!\n\n` +
        `Hallo ${firstName}! Dein Projekt L Account ist jetzt mit Telegram verbunden.\n\n` +
        `Du erhältst ab sofort Benachrichtigungen hier im Chat:\n` +
        `🎂 Geburtstage\n` +
        `💬 Kontakt-Erinnerungen\n` +
        `📊 Tägliche Zusammenfassungen\n` +
        `⏰ Gewohnheits-Reminder\n\n` +
        `Nutze /help um alle Befehle zu sehen.`
      );
    } else {
      await ctx.reply(
        `👋 Willkommen bei Projekt L Bot!\n\n` +
        `Um deinen Account zu verbinden, klicke auf den Link in den Einstellungen.`
      );
    }
  });

  // /status command
  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id.toString();

    // Check if user is connected
    const { data, error } = await supabase
      .from('notification_settings')
      .select('telegram_enabled, telegram_username')
      .eq('telegram_chat_id', chatId)
      .single();

    if (error || !data) {
      await ctx.reply('❌ Du bist noch nicht verbunden. Nutze /start connect');
      return;
    }

    await ctx.reply(
      `✅ Status: Verbunden\n` +
      `👤 Username: @${data.telegram_username || 'N/A'}\n` +
      `🔔 Benachrichtigungen: ${data.telegram_enabled ? 'Aktiv' : 'Pausiert'}`
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 Verfügbare Befehle:\n\n` +
      `/start - Bot starten\n` +
      `/status - Verbindungsstatus prüfen\n` +
      `/help - Diese Hilfe anzeigen\n` +
      `/disconnect - Verbindung trennen`
    );
  });

  // /disconnect command
  bot.command('disconnect', async (ctx) => {
    const chatId = ctx.chat.id.toString();

    const { error } = await supabase
      .from('notification_settings')
      .update({
        telegram_enabled: false,
        telegram_chat_id: null,
        telegram_username: null,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_chat_id', chatId);

    if (error) {
      console.error('Error disconnecting Telegram:', error);
      await ctx.reply('❌ Fehler beim Trennen der Verbindung.');
      return;
    }

    await ctx.reply(
      `👋 Verbindung getrennt!\n\n` +
      `Du erhältst keine Benachrichtigungen mehr über Telegram.\n` +
      `Nutze /start connect um dich erneut zu verbinden.`
    );
  });
}

// Send notification via Telegram
export async function sendTelegramNotification(
  chatId: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    const bot = getBot();
    let message = `🔔 **${title}**\n\n${body}`;

    if (url) {
      message += `\n\n🔗 [Öffnen](${url})`;
    }

    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });

    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}