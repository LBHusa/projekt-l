import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 404 }
    );
  }

  // Still require auth even in dev
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - please login' },
      { status: 401 }
    );
  }

  const userId = user.id;

  const { data: logs, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[Test Mood Logs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch mood logs' }, { status: 500 });
  }

  return NextResponse.json({ logs });
}
