import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google-calendar/callback'
);

// GET /api/integrations/google-calendar/callback?code=...
// Handles OAuth2 callback from Google
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google Calendar OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?gcal_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code missing' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in database
    const supabase = await createClient();

    const { error: dbError } = await supabase
      .from('google_calendar_integrations')
      .upsert({
        user_id: TEST_USER_ID,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Failed to store Google Calendar tokens:', dbError);
      return NextResponse.json(
        { error: 'Failed to store authentication' },
        { status: 500 }
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/?gcal_connected=true', request.url)
    );
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    return NextResponse.redirect(
      new URL('/?gcal_error=callback_failed', request.url)
    );
  }
}
