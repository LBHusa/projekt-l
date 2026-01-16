/**
 * Telegram Connect Endpoint
 * POST /api/integrations/telegram/connect
 *
 * Generates a connection code and returns a deep link
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStartLink } from '@/lib/telegram';
import { storeConnectionCode, generateConnectionCode } from '@/lib/telegram-codes';

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

    // Generate a unique connection code
    const code = generateConnectionCode();

    // Store the code with the user ID (expires in 5 minutes)
    storeConnectionCode(code, user.id);

    // Generate the Telegram deep link
    const deepLink = generateStartLink(code);

    return NextResponse.json({
      success: true,
      code,
      deepLink,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ProjektL_bot',
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Telegram connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate connection code' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/telegram/connect
 * Disconnect Telegram from the user's account
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear Telegram settings
    const { error } = await supabase
      .from('notification_settings')
      .update({
        telegram_enabled: false,
        telegram_chat_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error disconnecting Telegram:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect Telegram' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram disconnected successfully',
    });
  } catch (error) {
    console.error('Telegram disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Telegram' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/telegram/connect
 * Get current Telegram connection status
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('telegram_enabled, telegram_chat_id')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      connected: !!(settings?.telegram_enabled && settings?.telegram_chat_id),
      enabled: settings?.telegram_enabled || false,
    });
  } catch (error) {
    console.error('Telegram status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Telegram status' },
      { status: 500 }
    );
  }
}
