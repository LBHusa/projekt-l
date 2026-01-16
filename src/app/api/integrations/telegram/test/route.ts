/**
 * Telegram Test Endpoint
 * POST /api/integrations/telegram/test
 *
 * Sends a test notification to the user's connected Telegram
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMessage } from '@/lib/telegram';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Telegram settings
    const { data: settings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('telegram_enabled, telegram_chat_id')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !settings) {
      return NextResponse.json(
        { error: 'Notification settings not found' },
        { status: 404 }
      );
    }

    if (!settings.telegram_enabled || !settings.telegram_chat_id) {
      return NextResponse.json(
        { error: 'Telegram not connected' },
        { status: 400 }
      );
    }

    // Send test message
    const result = await sendMessage(
      settings.telegram_chat_id,
      `<b>Test-Nachricht von Projekt L</b>\n\n` +
      `Deine Telegram-Benachrichtigungen funktionieren!\n\n` +
      `Du erhältst hier:\n` +
      `- Quest-Erinnerungen\n` +
      `- Streak-Warnungen\n` +
      `- Achievement-Benachrichtigungen`,
      { parseMode: 'HTML' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to send test message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
