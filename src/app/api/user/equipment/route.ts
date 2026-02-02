/**
 * User Equipment API
 * GET /api/user/equipment
 *
 * Returns user's owned and equipped items
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEquipment } from '@/lib/data/equipment';

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

    const { owned, equipped } = await getUserEquipment(user.id);

    return NextResponse.json({
      owned,
      equipped,
    });
  } catch (error) {
    console.error('[User Equipment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user equipment' },
      { status: 500 }
    );
  }
}
