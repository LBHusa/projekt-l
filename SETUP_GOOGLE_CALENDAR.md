# Google Calendar Integration - Quick Setup Guide

## Step 1: Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Create OAuth2 credentials (Web application type)
5. Add redirect URI: `http://localhost:3000/api/integrations/google-calendar/callback`
6. Copy Client ID and Client Secret

## Step 2: Environment Variables

Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback
```

## Step 3: Database Migration

Run migration:

```bash
supabase db push
# or apply manually via Supabase Dashboard SQL Editor
```

## Step 4: Test the Integration

### 1. Connect to Google Calendar

```bash
# Start dev server
npm run dev

# Navigate to:
http://localhost:3000/api/integrations/google-calendar/auth
```

This will redirect you to Google login. After authentication, you'll be redirected back and tokens will be stored.

### 2. Fetch Events

```bash
curl http://localhost:3000/api/integrations/google-calendar/events
```

### 3. Sync Events to Activity Log

```bash
curl -X POST http://localhost:3000/api/integrations/google-calendar/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-01-10T23:59:59Z"
  }'
```

## Full Documentation

See `docs/GOOGLE_CALENDAR_INTEGRATION.md` for detailed API reference and usage.
