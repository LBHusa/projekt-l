// ============================================
// EQUIPMENT DATA ACCESS
// Phase 4: Visuelle Belohnungen - Equipment System
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  EquipmentItem,
  EquipmentItemType,
  EquipmentRarity,
  UserEquipment,
  UserEquipmentWithItem,
  EquippedItems,
} from '@/lib/database.types';

// ============================================
// CATALOG QUERIES
// ============================================

/**
 * Get all active equipment items (for shop/catalog)
 */
export async function getEquipmentItems(filters?: {
  item_type?: EquipmentItemType;
  rarity?: EquipmentRarity;
  maxPrice?: number;
}): Promise<EquipmentItem[]> {
  const supabase = createBrowserClient();

  let query = supabase
    .from('equipment_items')
    .select('*')
    .eq('is_active', true)
    .order('price_gold', { ascending: true });

  if (filters?.item_type) {
    query = query.eq('item_type', filters.item_type);
  }

  if (filters?.rarity) {
    query = query.eq('rarity', filters.rarity);
  }

  if (filters?.maxPrice) {
    query = query.lte('price_gold', filters.maxPrice);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching equipment items:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get single equipment item by ID
 */
export async function getEquipmentItem(
  itemId: string
): Promise<EquipmentItem | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('equipment_items')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching equipment item:', error);
    throw error;
  }

  return data;
}

// ============================================
// USER EQUIPMENT QUERIES
// ============================================

/**
 * Get user's owned equipment with equipped status
 */
export async function getUserEquipment(userId?: string): Promise<{
  owned: UserEquipmentWithItem[];
  equipped: EquippedItems;
}> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_equipment')
    .select(`
      *,
      equipment_items (*)
    `)
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error fetching user equipment:', error);
    throw error;
  }

  const owned = (data || []) as UserEquipmentWithItem[];

  // Build equipped map by slot
  const equipped: EquippedItems = {
    head: null,
    body: null,
    accessory: null,
  };

  for (const item of owned) {
    if (item.is_equipped && item.equipment_items) {
      const itemType = item.equipment_items.item_type as keyof EquippedItems;
      equipped[itemType] = item;
    }
  }

  return { owned, equipped };
}

/**
 * Check if user owns a specific item
 */
export async function userOwnsItem(
  itemId: string,
  userId?: string
): Promise<boolean> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_equipment')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('item_id', itemId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking item ownership:', error);
    throw error;
  }

  return !!data;
}

// ============================================
// EQUIP/UNEQUIP OPERATIONS
// ============================================

/**
 * Equip an item (auto-unequips current item of same type)
 */
export async function equipItem(
  itemId: string,
  userId?: string
): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  // 1. Get the item to find its type
  const { data: userItem, error: fetchError } = await supabase
    .from('user_equipment')
    .select(`
      id,
      equipment_items!inner (
        item_type
      )
    `)
    .eq('user_id', resolvedUserId)
    .eq('item_id', itemId)
    .single();

  if (fetchError || !userItem) {
    throw new Error('Item not found in inventory');
  }

  // Handle Supabase join return type (could be array or object depending on version)
  const equipmentData = userItem.equipment_items as unknown;
  const itemType = Array.isArray(equipmentData)
    ? (equipmentData[0] as { item_type: string }).item_type
    : (equipmentData as { item_type: string }).item_type;

  // 2. Unequip any currently equipped item of the same type
  // Fetch equipped items and filter manually (subquery not supported)
  const { data: equippedItems } = await supabase
    .from('user_equipment')
    .select(`
      id,
      equipment_items!inner (
        item_type
      )
    `)
    .eq('user_id', resolvedUserId)
    .eq('is_equipped', true);

  if (equippedItems) {
    for (const equipped of equippedItems) {
      const eqData = equipped.equipment_items as unknown;
      const eqType = Array.isArray(eqData)
        ? (eqData[0] as { item_type: string }).item_type
        : (eqData as { item_type: string }).item_type;
      if (eqType === itemType) {
        await supabase
          .from('user_equipment')
          .update({ is_equipped: false })
          .eq('id', equipped.id);
      }
    }
  }

  // 4. Equip the new item
  const { error: equipError } = await supabase
    .from('user_equipment')
    .update({ is_equipped: true })
    .eq('id', userItem.id);

  if (equipError) {
    console.error('Error equipping item:', equipError);
    throw equipError;
  }
}

/**
 * Unequip an item by type
 */
export async function unequipItem(
  itemType: EquipmentItemType,
  userId?: string
): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  // Find equipped item of this type
  const { data: equippedItems } = await supabase
    .from('user_equipment')
    .select(`
      id,
      equipment_items!inner (
        item_type
      )
    `)
    .eq('user_id', resolvedUserId)
    .eq('is_equipped', true);

  if (!equippedItems) return;

  for (const equipped of equippedItems) {
    const eqData = equipped.equipment_items as unknown;
    const eqType = Array.isArray(eqData)
      ? (eqData[0] as { item_type: string }).item_type
      : (eqData as { item_type: string }).item_type;
    if (eqType === itemType) {
      const { error } = await supabase
        .from('user_equipment')
        .update({ is_equipped: false })
        .eq('id', equipped.id);

      if (error) {
        console.error('Error unequipping item:', error);
        throw error;
      }
    }
  }
}

/**
 * Unequip a specific item by item ID
 */
export async function unequipItemById(
  itemId: string,
  userId?: string
): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { error } = await supabase
    .from('user_equipment')
    .update({ is_equipped: false })
    .eq('user_id', resolvedUserId)
    .eq('item_id', itemId);

  if (error) {
    console.error('Error unequipping item:', error);
    throw error;
  }
}

// ============================================
// PURCHASE / INVENTORY OPERATIONS
// ============================================

/**
 * Add equipment item to user's inventory (after purchase)
 */
export async function addEquipmentToUser(
  itemId: string,
  userId?: string
): Promise<UserEquipment> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { data, error } = await supabase
    .from('user_equipment')
    .insert({
      user_id: resolvedUserId,
      item_id: itemId,
      is_equipped: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding equipment to user:', error);
    throw error;
  }

  return data;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get equipment statistics for user
 */
export async function getEquipmentStats(userId?: string): Promise<{
  totalOwned: number;
  totalEquipped: number;
  byRarity: Record<EquipmentRarity, number>;
}> {
  const { owned, equipped } = await getUserEquipment(userId);

  const byRarity: Record<EquipmentRarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  for (const item of owned) {
    if (item.equipment_items) {
      byRarity[item.equipment_items.rarity as EquipmentRarity]++;
    }
  }

  const totalEquipped = Object.values(equipped).filter(Boolean).length;

  return {
    totalOwned: owned.length,
    totalEquipped,
    byRarity,
  };
}
