/**
 * User Skills API
 * GET /api/user/skills - Get current user's skill progress
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's skill progress with skill info
    const { data: userSkills, error: dbError } = await supabase
      .from('user_skills')
      .select(`
        *,
        skill:skills(name, icon, domain_id)
      `)
      .eq('user_id', user.id)
      .order('level', { ascending: false });

    if (dbError) {
      console.error('Failed to fetch user skills:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch user skills' },
        { status: 500 }
      );
    }

    return NextResponse.json(userSkills || []);
  } catch (error) {
    console.error('User skills fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user skills' },
      { status: 500 }
    );
  }
}
