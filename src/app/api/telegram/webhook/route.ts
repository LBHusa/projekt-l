// ============================================
// Projekt L - Telegram Bot Webhook Handler
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/lib/telegram-bot';

/**
 * POST /api/telegram/webhook
 * Handle incoming updates from Telegram
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret token
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.error('Invalid webhook secret token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the update
    const update = await request.json();

    // Process the update with Telegraf
    const bot = getBot();
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/webhook
 * Check webhook status
 */
export async function GET() {
  try {
    const bot = getBot();
    const webhookInfo = await bot.telegram.getWebhookInfo();

    return NextResponse.json({
      success: true,
      webhook: {
        url: webhookInfo.url,
        hasCustomCertificate: webhookInfo.has_custom_certificate,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
      },
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook info' },
      { status: 500 }
    );
  }
}