'use client';

// ============================================
// Shop Filters Component
// Phase 4: Visuelle Belohnungen - Equipment Shop
// ============================================

interface ShopFiltersProps {
  typeFilter: string | null;
  setTypeFilter: (type: string | null) => void;
  rarityFilter: string | null;
  setRarityFilter: (rarity: string | null) => void;
}

const ITEM_TYPES = [
  { value: 'head', label: 'Kopf' },
  { value: 'body', label: 'Ruestung' },
  { value: 'accessory', label: 'Accessoire' },
];

const RARITIES = [
  { value: 'common', label: 'Gewoehnlich', color: 'text-gray-400' },
  { value: 'rare', label: 'Selten', color: 'text-blue-400' },
  { value: 'epic', label: 'Episch', color: 'text-purple-400' },
  { value: 'legendary', label: 'Legendaer', color: 'text-yellow-400' },
];

export function ShopFilters({
  typeFilter,
  setTypeFilter,
  rarityFilter,
  setRarityFilter,
}: ShopFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* Type Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !typeFilter
              ? 'bg-accent-primary text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Alle
        </button>
        {ITEM_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              typeFilter === type.value
                ? 'bg-accent-primary text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Rarity Filter */}
      <div className="flex gap-2">
        {RARITIES.map(rarity => (
          <button
            key={rarity.value}
            onClick={() => setRarityFilter(
              rarityFilter === rarity.value ? null : rarity.value
            )}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              rarityFilter === rarity.value
                ? `bg-gray-700 ${rarity.color} border border-current`
                : `bg-gray-800 ${rarity.color} hover:bg-gray-700`
            }`}
          >
            {rarity.label}
          </button>
        ))}
      </div>
    </div>
  );
}
