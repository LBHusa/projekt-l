/**
 * Shop Purchase API
 * POST /api/shop/purchase
 *
 * Purchases an equipment item with gold
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEquipmentItem, userOwnsItem, addEquipmentToUser } from '@/lib/data/equipment';
import { addGold, getGoldBalance } from '@/lib/data/currency';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { item_id } = await request.json();

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    // Get item details
    const item = await getEquipmentItem(item_id);
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Check if already owned
    const alreadyOwned = await userOwnsItem(item_id, user.id);
    if (alreadyOwned) {
      return NextResponse.json(
        { error: 'Item already owned' },
        { status: 400 }
      );
    }

    // Check gold balance
    const currentGold = await getGoldBalance(user.id);
    if (currentGold < item.price_gold) {
      return NextResponse.json(
        { error: 'Not enough gold', required: item.price_gold, current: currentGold },
        { status: 400 }
      );
    }

    // Perform purchase transaction
    // 1. Deduct gold (negative amount)
    const newBalance = await addGold(
      -item.price_gold,
      'shop_purchase',
      `Gekauft: ${item.name}`,
      'equipment_items',
      item.id,
      user.id
    );

    // 2. Add item to user's inventory
    await addEquipmentToUser(item.id, user.id);

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
      },
      spent: item.price_gold,
      new_balance: newBalance,
    });
  } catch (error) {
    console.error('[Shop Purchase API] Error:', error);
    return NextResponse.json(
      { error: 'Purchase failed' },
      { status: 500 }
    );
  }
}
