import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string;
  duplicated_template_id?: string;
  owner?: {
    type: string;
    user?: {
      id: string;
      name?: string;
      avatar_url?: string;
      type?: string;
      person?: {
        email?: string;
      };
    };
  };
}

// GET /api/integrations/notion/callback?code=xxx&state=xxx
// Handles OAuth2 callback from Notion
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user cancellation
    if (error === 'access_denied') {
      return NextResponse.redirect(new URL('/settings?notion=cancelled', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?notion=error', request.url));
    }

    // Get environment variables
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/integrations/notion/callback';

    if (!clientId || !clientSecret) {
      console.error('Missing Notion credentials');
      return NextResponse.redirect(new URL('/settings?notion=config_error', request.url));
    }

    // Exchange code for access token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Notion token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/settings?notion=token_error', request.url));
    }

    const tokenData: NotionTokenResponse = await tokenResponse.json();

    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return NextResponse.redirect(new URL('/login?redirect=/settings', request.url));
    }

    // Store integration in database
    const { error: dbError } = await supabase
      .from('notion_integrations')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        bot_id: tokenData.bot_id,
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Failed to store Notion integration:', dbError);
      return NextResponse.redirect(new URL('/settings?notion=db_error', request.url));
    }

    // Success - redirect to settings
    return NextResponse.redirect(new URL('/settings?notion=connected', request.url));

  } catch (error) {
    console.error('Notion callback error:', error);
    return NextResponse.redirect(new URL('/settings?notion=error', request.url));
  }
}
