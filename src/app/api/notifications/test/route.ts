// ============================================
// Projekt L - Test Push Notification API
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push lazily (only when needed)
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (!vapidConfigured && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:lukas@projekt-l.de',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }
}

/**
 * POST /api/notifications/test
 * Send a test push notification to the current user
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's push subscription from database
    const { data: settings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('push_subscription, push_enabled')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching settings:', fetchError);
      return NextResponse.json(
        { error: 'Einstellungen nicht gefunden' },
        { status: 404 }
      );
    }

    if (!settings.push_enabled || !settings.push_subscription) {
      return NextResponse.json(
        { error: 'Push-Benachrichtigungen sind nicht aktiviert' },
        { status: 400 }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🔔 Test von Projekt L',
      body: 'Push-Benachrichtigungen funktionieren!',
      url: '/settings/notifications',
      tag: 'test-notification',
    });

    // Send push notification
    try {
      ensureVapidConfigured();
      await webpush.sendNotification(settings.push_subscription, payload);

      // Log successful notification
      await supabase.from('notification_log').insert({
        user_id: user.id,
        channel: 'push',
        notification_type: 'custom',
        title: 'Test-Benachrichtigung',
        body: 'Push-Benachrichtigungen funktionieren!',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Test-Benachrichtigung gesendet!'
      });
    } catch (pushError: unknown) {
      console.error('Error sending push:', pushError);

      // Check if subscription is expired/invalid
      const error = pushError as { statusCode?: number };
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid, remove it
        await supabase
          .from('notification_settings')
          .update({
            push_enabled: false,
            push_subscription: null,
          })
          .eq('user_id', user.id);

        return NextResponse.json(
          { error: 'Push-Subscription abgelaufen. Bitte erneut aktivieren.' },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: 'Fehler beim Senden der Benachrichtigung' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test notification API:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
