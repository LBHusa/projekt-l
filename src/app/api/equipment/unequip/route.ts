/**
 * Unequip Item API
 * POST /api/equipment/unequip
 *
 * Unequips an item by type or by item ID
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unequipItem, unequipItemById, getUserEquipment } from '@/lib/data/equipment';
import type { EquipmentItemType } from '@/lib/database.types';

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

    const { item_type, item_id } = await request.json();

    if (!item_type && !item_id) {
      return NextResponse.json(
        { error: 'Either item_type or item_id is required' },
        { status: 400 }
      );
    }

    // Unequip by type or by ID
    if (item_type) {
      const validTypes: EquipmentItemType[] = ['head', 'body', 'accessory'];
      if (!validTypes.includes(item_type)) {
        return NextResponse.json(
          { error: 'Invalid item_type. Must be head, body, or accessory' },
          { status: 400 }
        );
      }
      await unequipItem(item_type as EquipmentItemType, user.id);
    } else {
      await unequipItemById(item_id, user.id);
    }

    // Return updated equipped state
    const { equipped } = await getUserEquipment(user.id);

    return NextResponse.json({
      success: true,
      equipped,
    });
  } catch (error) {
    console.error('[Unequip API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to unequip item' },
      { status: 500 }
    );
  }
}
