import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayTimeStats } from '@/lib/data/habits';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const stats = await getTodayTimeStats(user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching today time stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time stats' },
      { status: 500 }
    );
  }
}
