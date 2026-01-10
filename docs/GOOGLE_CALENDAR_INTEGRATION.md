# Google Calendar Integration

## Overview

The Google Calendar integration automatically tracks time from your calendar events and logs XP based on event duration and category.

## Features

- **OAuth2 Authentication**: Secure connection to your Google Calendar
- **Automatic Event Import**: Fetch events from your calendar
- **Smart Categorization**: Auto-categorize events into Factions (Karriere, Gesundheit, Bildung, etc.)
- **XP Calculation**: 1 minute = 1 XP
- **Duplicate Prevention**: Events are only synced once

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth2 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Projekt L"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/integrations/google-calendar/callback`
     - `https://your-production-domain.com/api/integrations/google-calendar/callback`
   - Click "Create"

5. Copy the **Client ID** and **Client Secret**

### 2. Environment Variables

Add to your `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback
```

### 3. Database Migration

Run the migration:

```bash
# If using Supabase locally
supabase db push

# Or apply manually via Supabase Dashboard > SQL Editor
```

The migration creates:
- `google_calendar_integrations` table
- `external_id` and `external_source` columns in `activity_log`

## API Endpoints

### 1. Initiate Authentication

```http
GET /api/integrations/google-calendar/auth
```

Redirects user to Google login page.

### 2. OAuth Callback

```http
GET /api/integrations/google-calendar/callback?code=...
```

Handles OAuth callback, stores tokens in database.

### 3. Fetch Events

```http
GET /api/integrations/google-calendar/events?calendar=primary&maxResults=50
```

**Query Parameters:**
- `calendar` (default: `primary`) - Calendar ID
- `maxResults` (default: `50`) - Max events to return
- `timeMin` (default: now) - Start date (ISO 8601)
- `timeMax` (optional) - End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event123",
      "summary": "Team Meeting",
      "description": "Discuss Q1 goals",
      "start": "2026-01-10T10:00:00Z",
      "end": "2026-01-10T11:00:00Z",
      "location": "Conference Room A",
      "attendees": ["user@example.com"],
      "htmlLink": "https://calendar.google.com/..."
    }
  ]
}
```

### 4. Sync Events to Activity Log

```http
POST /api/integrations/google-calendar/sync
Content-Type: application/json

{
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-01-10T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 12,
  "skipped": 3,
  "total": 15,
  "categorizedEvents": [
    {
      "id": "event123",
      "summary": "Team Meeting",
      "category": "work",
      "faction": "karriere",
      "duration": 60,
      "start": "2026-01-10T10:00:00Z",
      "end": "2026-01-10T11:00:00Z"
    }
  ]
}
```

## Event Categorization

Events are automatically categorized based on keywords in the title/description:

| Keywords | Faction | Category |
|----------|---------|----------|
| meeting, work, office, projekt, team | `karriere` | work |
| gym, fitness, sport, workout, doctor, health | `koerper` | health |
| learn, course, study, seminar, workshop | `weisheit` | education |
| family, kids, birthday, parents | `soziales` | family |
| hobby, game, movie, concert, art | `hobbys` | hobby |

**Note:** Events without a match are skipped (not logged).

## XP Calculation

- **1 minute = 1 XP**
- Duration is calculated from `start` to `end` time
- All-day events are skipped
- XP is assigned to the auto-detected Faction

## Usage Flow

1. User clicks "Connect Google Calendar" in UI
2. Redirected to `/api/integrations/google-calendar/auth`
3. User authenticates with Google
4. Redirected back to `/api/integrations/google-calendar/callback`
5. Tokens stored in `google_calendar_integrations` table
6. User can trigger manual sync via UI
7. Background job can sync automatically (future enhancement)

## Token Refresh

Access tokens expire after ~1 hour. The API automatically:
1. Checks token expiry before each request
2. Refreshes access token using refresh token
3. Updates database with new tokens

## Security

- Tokens stored in database (encrypted at rest via Supabase)
- RLS policies ensure users only access their own integrations
- `refresh_token` is stored for automatic token refresh
- Scope limited to `calendar.readonly` and `calendar.events.readonly`

## Future Enhancements

- **Bi-directional Sync**: Create Projekt L events in Google Calendar
- **Smart Categorization**: Use AI to improve auto-categorization
- **Multiple Calendars**: Sync from multiple Google Calendars
- **Automatic Sync**: Cron job to sync every hour/day
- **Manual Overrides**: Let users manually recategorize events

## Troubleshooting

### "No active Google Calendar integration found"

Run authentication flow again:
```
GET /api/integrations/google-calendar/auth
```

### "Token expired" errors

Check `token_expiry` in database. If refresh token is present, it should auto-refresh. If not, re-authenticate.

### Events not being categorized

Check the keyword matching in `categorizeEvent()` function in `sync/route.ts`. You may need to add more keywords for your specific use case.

## Database Schema

```sql
CREATE TABLE google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log
  ADD COLUMN external_id TEXT,
  ADD COLUMN external_source TEXT;
```
