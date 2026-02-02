/**
 * Equip Item API
 * POST /api/equipment/equip
 *
 * Equips an item that the user owns
 * Auto-unequips any currently equipped item of the same type
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { equipItem, userOwnsItem, getUserEquipment } from '@/lib/data/equipment';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { item_id } = await request.json();

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const ownsItem = await userOwnsItem(item_id, user.id);
    if (!ownsItem) {
      return NextResponse.json(
        { error: 'Item not owned' },
        { status: 403 }
      );
    }

    // Equip the item
    await equipItem(item_id, user.id);

    // Return updated equipped state
    const { equipped } = await getUserEquipment(user.id);

    return NextResponse.json({
      success: true,
      equipped,
    });
  } catch (error) {
    console.error('[Equip API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to equip item' },
      { status: 500 }
    );
  }
}
