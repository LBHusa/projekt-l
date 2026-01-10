import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import type { FactionId } from '@/lib/database.types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// Helper to get authenticated calendar client
async function getAuthenticatedCalendar() {
  const supabase = await createClient();

  const { data: integration, error } = await supabase
    .from('google_calendar_integrations')
    .select('*')
    .eq('user_id', TEST_USER_ID)
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

  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const isExpired = expiry ? now >= expiry : false;

  if (isExpired && integration.refresh_token) {
    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    await supabase
      .from('google_calendar_integrations')
      .update({
        access_token: credentials.access_token,
        token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', TEST_USER_ID);
  } else {
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Categorize event based on title/description keywords
function categorizeEvent(summary: string, description?: string | null): {
  faction: FactionId | null;
  category: string;
} {
  const text = `${summary} ${description || ''}`.toLowerCase();

  // Karriere keywords
  if (text.match(/meeting|work|office|projekt|team|call|conference|presentation|deadline/)) {
    return { faction: 'karriere', category: 'work' };
  }

  // Gesundheit keywords
  if (text.match(/gym|fitness|sport|workout|training|doctor|health|arzt|therapie|yoga/)) {
    return { faction: 'koerper', category: 'health' };
  }

  // Bildung keywords
  if (text.match(/learn|kurs|course|study|lecture|seminar|workshop|training|reading|lesen/)) {
    return { faction: 'weisheit', category: 'education' };
  }

  // Familie keywords
  if (text.match(/family|familie|kids|kinder|eltern|parents|geburtstag|birthday/)) {
    return { faction: 'soziales', category: 'family' };
  }

  // Hobbies keywords
  if (text.match(/hobby|game|gaming|movie|film|concert|musik|art|creative|basteln/)) {
    return { faction: 'hobbys', category: 'hobby' };
  }

  return { faction: null, category: 'other' };
}

// POST /api/integrations/google-calendar/sync
// Syncs calendar events and creates activity log entries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate) {
      return NextResponse.json(
        { error: 'startDate is required' },
        { status: 400 }
      );
    }

    const calendar = await getAuthenticatedCalendar();
    const supabase = await createClient();

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate,
      timeMax: endDate || new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    let syncedCount = 0;
    let skippedCount = 0;
    const categorizedEvents = [];

    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) {
        skippedCount++;
        continue; // Skip all-day events
      }

      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      // Categorize event
      const { faction, category } = categorizeEvent(
        event.summary || 'Untitled Event',
        event.description
      );

      categorizedEvents.push({
        id: event.id,
        summary: event.summary,
        category,
        faction,
        duration: durationMinutes,
        start: event.start.dateTime,
        end: event.end.dateTime
      });

      // Only create activity log if faction is identified
      if (faction && durationMinutes > 0) {
        // Check if event already synced
        const { data: existing } = await supabase
          .from('activity_log')
          .select('id')
          .eq('user_id', TEST_USER_ID)
          .eq('external_id', event.id)
          .single();

        if (!existing) {
          // Calculate XP based on duration (1 minute = 1 XP)
          const xpAmount = durationMinutes;

          await supabase.from('activity_log').insert({
            user_id: TEST_USER_ID,
            activity_type: 'calendar_event',
            description: `${event.summary} (${durationMinutes}min)`,
            xp_amount: xpAmount,
            faction_id: faction,
            occurred_at: event.start.dateTime,
            external_id: event.id,
            external_source: 'google_calendar',
            metadata: {
              summary: event.summary,
              duration_minutes: durationMinutes,
              category,
              location: event.location,
              auto_categorized: true
            }
          });

          syncedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    // Update last sync time
    await supabase
      .from('google_calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', TEST_USER_ID);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: events.length,
      categorizedEvents
    });
  } catch (error: unknown) {
    console.error('Google Calendar sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to sync calendar events', details: errorMessage },
      { status: 500 }
    );
  }
}
