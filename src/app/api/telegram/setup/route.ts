// ============================================
// Projekt L - Telegram Webhook Setup
// ============================================

import { NextResponse } from 'next/server';
import { getBot } from '@/lib/telegram-bot';

/**
 * POST /api/telegram/setup
 * Setup or update the Telegram webhook
 */
export async function POST() {
  try {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'TELEGRAM_WEBHOOK_URL not configured' },
        { status: 500 }
      );
    }

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'TELEGRAM_WEBHOOK_SECRET not configured' },
        { status: 500 }
      );
    }

    const bot = getBot();

    // Set webhook
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: webhookSecret,
      drop_pending_updates: false, // Keep pending updates
    });

    // Get webhook info to verify
    const webhookInfo = await bot.telegram.getWebhookInfo();

    return NextResponse.json({
      success: true,
      message: 'Webhook configured successfully',
      webhook: {
        url: webhookInfo.url,
        pendingUpdateCount: webhookInfo.pending_update_count,
      },
    });
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telegram/setup
 * Remove the Telegram webhook
 */
export async function DELETE() {
  try {
    const bot = getBot();
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    return NextResponse.json({
      success: true,
      message: 'Webhook removed successfully',
    });
  } catch (error) {
    console.error('Error removing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to remove webhook' },
      { status: 500 }
    );
  }
}