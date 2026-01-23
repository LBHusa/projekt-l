import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google-calendar/callback'
);

// GET /api/integrations/google-calendar/auth
// Initiates OAuth2 flow - requires authenticated user
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check - user must be logged in before initiating OAuth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Generate OAuth URL with user ID in state for callback verification
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ],
      prompt: 'consent', // Force consent screen to get refresh token
      state: user.id // Include user ID for callback verification
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[Google Calendar Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
