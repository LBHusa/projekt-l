// ============================================
// Projekt L - Push Subscription API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Test-User ID (TODO: Replace with auth)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// Create Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * POST /api/notifications/subscribe
 * Save a push subscription for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const subscription: PushSubscription = await request.json();

    // Validate subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .single();

    if (existing) {
      // Update existing settings
      const { error } = await supabase
        .from('notification_settings')
        .update({
          push_enabled: true,
          push_subscription: subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', TEST_USER_ID);

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to save subscription' },
          { status: 500 }
        );
      }
    } else {
      // Create new settings
      const { error } = await supabase
        .from('notification_settings')
        .insert({
          user_id: TEST_USER_ID,
          push_enabled: true,
          push_subscription: subscription,
        });

      if (error) {
        console.error('Error creating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to save subscription' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in subscribe API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Remove push subscription for the current user
 */
export async function DELETE() {
  try {
    const { error } = await supabase
      .from('notification_settings')
      .update({
        push_enabled: false,
        push_subscription: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', TEST_USER_ID);

    if (error) {
      console.error('Error removing subscription:', error);
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unsubscribe API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
