// ============================================
// HEALTH IMPORT STATUS API
// Returns sync status for Apple Health integration
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Check if user has an API key
    const { data: apiKey } = await supabase
      .from('user_api_keys')
      .select('id, key_prefix, last_used_at, created_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // Get import statistics
    const { data: importLogs } = await supabase
      .from('health_import_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get sleep logs count
    const { count: sleepCount } = await supabase
      .from('sleep_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get total XP from imports
    const { data: xpData } = await supabase
      .from('health_import_logs')
      .select('xp_awarded')
      .eq('user_id', user.id);

    const totalXP = xpData?.reduce((sum, log) => sum + (log.xp_awarded || 0), 0) || 0;

    // Get total imported items
    const totalImported = importLogs?.reduce(
      (sum, log) => sum + (log.items_imported || 0),
      0
    ) || 0;

    // Get last successful sync
    const lastSync = importLogs?.[0]?.completed_at || null;

    return NextResponse.json({
      success: true,
      status: {
        isConnected: !!apiKey,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey?.key_prefix || null,
        lastSync,
        totalImports: importLogs?.length || 0,
        totalItemsImported: totalImported,
        totalXpEarned: totalXP,
        sleepDataCount: sleepCount || 0,
        recentImports: importLogs?.slice(0, 5).map((log) => ({
          id: log.id,
          source: log.import_source,
          type: log.import_type,
          itemsImported: log.items_imported,
          itemsSkipped: log.items_skipped,
          xpAwarded: log.xp_awarded,
          completedAt: log.completed_at,
          error: log.error_message,
        })) || [],
      },
    });
  } catch (error) {
    console.error('Health import status error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Status' },
      { status: 500 }
    );
  }
}
