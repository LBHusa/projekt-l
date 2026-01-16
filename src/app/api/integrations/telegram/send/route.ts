/**
 * Telegram Send Endpoint
 * POST /api/integrations/telegram/send
 *
 * Internal API for sending notifications to users via Telegram
 * Should only be called from server-side code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage } from '@/lib/telegram';

// Use service role for internal API
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendRequest {
  userId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const apiKey = request.headers.get('x-internal-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    // If INTERNAL_API_KEY is set, require it
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendRequest = await request.json();

    if (!body.userId || !body.message) {
      return NextResponse.json(
        { error: 'userId and message are required' },
        { status: 400 }
      );
    }

    // Get user's Telegram settings
    const { data: settings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('telegram_enabled, telegram_chat_id')
      .eq('user_id', body.userId)
      .single();

    if (fetchError || !settings) {
      return NextResponse.json(
        { error: 'User notification settings not found' },
        { status: 404 }
      );
    }

    if (!settings.telegram_enabled || !settings.telegram_chat_id) {
      return NextResponse.json(
        { error: 'Telegram not enabled for this user' },
        { status: 400 }
      );
    }

    // Send the message
    const result = await sendMessage(
      settings.telegram_chat_id,
      body.message,
      { parseMode: body.parseMode || 'HTML' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to send Telegram message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.message_id,
    });
  } catch (error) {
    console.error('Telegram send error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
