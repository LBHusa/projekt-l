import { NextResponse } from 'next/server';

const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';

// GET /api/integrations/notion/auth
// Initiates Notion OAuth2 flow - redirects user to Notion authorization
export async function GET() {
  try {
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/integrations/notion/callback';

    if (!clientId) {
      return NextResponse.json(
        { error: 'Notion integration not configured. Missing NOTION_CLIENT_ID.' },
        { status: 500 }
      );
    }

    // Build authorization URL
    const authUrl = new URL(NOTION_AUTH_URL);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');

    // Optional: Add state parameter for CSRF protection
    const state = crypto.randomUUID();
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Notion auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Notion authentication' },
      { status: 500 }
    );
  }
}
