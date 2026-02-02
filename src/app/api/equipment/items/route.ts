/**
 * Equipment Items API
 * GET /api/equipment/items
 *
 * Returns all active equipment items (for shop catalog)
 */

import { NextResponse } from 'next/server';
import { getEquipmentItems } from '@/lib/data/equipment';
import type { EquipmentItemType, EquipmentRarity } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Optional filters
    const typeParam = searchParams.get('type');
    const rarityParam = searchParams.get('rarity');
    const maxPriceParam = searchParams.get('maxPrice');

    const filters: {
      item_type?: EquipmentItemType;
      rarity?: EquipmentRarity;
      maxPrice?: number;
    } = {};

    if (typeParam) {
      const validTypes: EquipmentItemType[] = ['head', 'body', 'accessory'];
      if (validTypes.includes(typeParam as EquipmentItemType)) {
        filters.item_type = typeParam as EquipmentItemType;
      }
    }

    if (rarityParam) {
      const validRarities: EquipmentRarity[] = ['common', 'rare', 'epic', 'legendary'];
      if (validRarities.includes(rarityParam as EquipmentRarity)) {
        filters.rarity = rarityParam as EquipmentRarity;
      }
    }

    if (maxPriceParam) {
      const maxPrice = parseInt(maxPriceParam);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        filters.maxPrice = maxPrice;
      }
    }

    const items = await getEquipmentItems(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Equipment Items API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get equipment items' },
      { status: 500 }
    );
  }
}
