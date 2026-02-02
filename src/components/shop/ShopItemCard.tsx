'use client';

// ============================================
// Shop Item Card Component
// Phase 4: Visuelle Belohnungen - Equipment Shop
// ============================================

import { Coins, Check } from 'lucide-react';
import type { EquipmentItem } from '@/lib/database.types';

interface ShopItemCardProps {
  item: EquipmentItem;
  isOwned: boolean;
  onSelect: () => void;
}

const RARITY_STYLES = {
  common: {
    border: 'border-gray-600',
    bg: 'bg-gray-800/50',
    text: 'text-gray-400',
    label: 'Gewoehnlich',
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    label: 'Selten',
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-purple-900/20',
    text: 'text-purple-400',
    label: 'Episch',
  },
  legendary: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-900/20',
    text: 'text-yellow-400',
    label: 'Legendaer',
  },
};

const TYPE_LABELS = {
  head: 'Kopf',
  body: 'Ruestung',
  accessory: 'Accessoire',
};

export function ShopItemCard({ item, isOwned, onSelect }: ShopItemCardProps) {
  const style = RARITY_STYLES[item.rarity as keyof typeof RARITY_STYLES];

  return (
    <button
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 transition-all text-left
        ${style.border} ${style.bg}
        ${isOwned ? 'opacity-60 cursor-default' : 'hover:scale-105 hover:shadow-lg cursor-pointer'}
      `}
    >
      {/* Owned Badge */}
      {isOwned && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <Check size={12} />
          Besitzt
        </div>
      )}

      {/* Item Image */}
      <div className="w-full aspect-square mb-3 flex items-center justify-center bg-gray-900/50 rounded-lg">
        <img
          src={item.sprite_url}
          alt={item.name}
          className="w-3/4 h-3/4 object-contain"
          onError={(e) => {
            e.currentTarget.src = '/equipment/placeholder.png';
          }}
        />
      </div>

      {/* Item Info */}
      <div>
        <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">
          {TYPE_LABELS[item.item_type as keyof typeof TYPE_LABELS]}
        </p>

        {/* Rarity & Price */}
        <div className="flex justify-between items-center">
          <span className={`text-xs ${style.text}`}>{style.label}</span>
          {!isOwned && (
            <span className="flex items-center gap-1 text-yellow-500 font-semibold">
              <Coins size={14} />
              {item.price_gold.toLocaleString('de-DE')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
