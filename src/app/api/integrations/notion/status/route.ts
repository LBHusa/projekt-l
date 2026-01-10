import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/integrations/notion/status
// Returns current Notion integration status for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notion_integrations')
      .select('id, workspace_id, workspace_name, is_active, last_sync_at, created_at')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      integration: {
        id: data.id,
        workspaceId: data.workspace_id,
        workspaceName: data.workspace_name,
        isActive: data.is_active,
        lastSyncAt: data.last_sync_at,
        connectedAt: data.created_at,
      },
    });

  } catch (error) {
    console.error('Failed to get Notion status:', error);
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/notion/status
// Disconnects Notion integration for authenticated user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notion_integrations')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete Notion integration:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, connected: false });

  } catch (error) {
    console.error('Failed to disconnect Notion:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
