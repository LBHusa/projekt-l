import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

// Helper to get authenticated calendar client
async function getAuthenticatedCalendar(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  // Get stored tokens
  const { data: integration, error } = await supabase
    .from('google_calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !integration) {
    throw new Error('No active Google Calendar integration found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Check if token is expired
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const isExpired = expiry ? now >= expiry : false;

  if (isExpired && integration.refresh_token) {
    // Refresh the access token
    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Update tokens in database
    await supabase
      .from('google_calendar_integrations')
      .update({
        access_token: credentials.access_token,
        token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  } else {
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// GET /api/integrations/google-calendar/events
// Fetches calendar events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const calendarId = searchParams.get('calendar') || 'primary';
    const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');

    const calendar = await getAuthenticatedCalendar(user.id, supabase);

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax: timeMax || undefined,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    return NextResponse.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map(a => a.email),
        htmlLink: event.htmlLink
      }))
    });
  } catch (error: unknown) {
    console.error('Google Calendar events fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: errorMessage },
      { status: 500 }
    );
  }
}
