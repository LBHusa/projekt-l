'use client';

// ============================================
// Equipment Shop Page
// Phase 4: Visuelle Belohnungen
// ============================================

import { useState, useEffect } from 'react';
import { ArrowLeft, Coins } from 'lucide-react';
import Link from 'next/link';
import { ShopItemCard } from '@/components/shop/ShopItemCard';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { PurchaseModal } from '@/components/shop/PurchaseModal';
import type { EquipmentItem, UserEquipmentWithItem } from '@/lib/database.types';

export default function ShopPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [userGold, setUserGold] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);

  // Purchase modal
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, equipmentRes, currencyRes] = await Promise.all([
          fetch('/api/equipment/items'),
          fetch('/api/user/equipment'),
          fetch('/api/user/currency'),
        ]);

        const [itemsData, equipmentData, currencyData] = await Promise.all([
          itemsRes.json(),
          equipmentRes.json(),
          currencyRes.json(),
        ]);

        setItems(itemsData.items || []);
        setOwnedItemIds(
          (equipmentData.owned || []).map((e: UserEquipmentWithItem) => e.item_id)
        );
        setUserGold(currencyData.gold || 0);
      } catch (error) {
        console.error('Failed to load shop data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter items
  const filteredItems = items.filter(item => {
    if (typeFilter && item.item_type !== typeFilter) return false;
    if (rarityFilter && item.rarity !== rarityFilter) return false;
    return true;
  });

  // Handle purchase success
  const handlePurchaseComplete = (itemId: string, newBalance: number) => {
    setOwnedItemIds(prev => [...prev, itemId]);
    setUserGold(newBalance);
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Equipment Shop</h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-yellow-500">
            {userGold.toLocaleString('de-DE')}
          </span>
        </div>
      </header>

      {/* Filters */}
      <ShopFilters
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        rarityFilter={rarityFilter}
        setRarityFilter={setRarityFilter}
      />

      {/* Item Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {filteredItems.map(item => (
          <ShopItemCard
            key={item.id}
            item={item}
            isOwned={ownedItemIds.includes(item.id)}
            onSelect={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Keine Items gefunden. Versuche andere Filter.
        </div>
      )}

      {/* Purchase Modal */}
      {selectedItem && (
        <PurchaseModal
          item={selectedItem}
          userGold={userGold}
          isOwned={ownedItemIds.includes(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}
    </div>
  );
}
