import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google-calendar/callback'
);

// GET /api/integrations/google-calendar/auth
// Initiates OAuth2 flow - redirects user to Google login
export async function GET() {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ],
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Calendar auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
