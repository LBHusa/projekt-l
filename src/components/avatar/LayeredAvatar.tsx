'use client';

// ============================================
// LayeredAvatar Component
// Phase 4: Visuelle Belohnungen
// Renders avatar with equipment layers
// ============================================

import { useState, useEffect } from 'react';

interface LayeredAvatarProps {
  // Base avatar seed (for DiceBear)
  seed?: string;
  // Pre-loaded equipment (for server components or preview)
  equipment?: {
    head?: string | null;  // sprite_url
    body?: string | null;
    accessory?: string | null;
  };
  // Auto-fetch equipment from API if no equipment provided
  autoFetch?: boolean;
  // Size variant
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // Additional class names
  className?: string;
  // Show loading skeleton while fetching
  showSkeleton?: boolean;
}

// Size mappings for Tailwind classes
const SIZE_CLASSES = {
  sm: 'w-16 h-16',
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
};

export default function LayeredAvatar({
  seed = 'default-avatar',
  equipment,
  autoFetch = false,
  size = 'md',
  className,
  showSkeleton = true,
}: LayeredAvatarProps) {
  const [fetchedEquipment, setFetchedEquipment] = useState<{
    head?: string | null;
    body?: string | null;
    accessory?: string | null;
  } | null>(equipment || null);
  const [isLoading, setIsLoading] = useState(autoFetch && !equipment);

  // Auto-fetch equipment if requested
  useEffect(() => {
    if (autoFetch && !equipment) {
      fetch('/api/user/equipment')
        .then(res => res.json())
        .then(data => {
          setFetchedEquipment({
            head: data.equipped?.head?.equipment_items?.sprite_url ?? null,
            body: data.equipped?.body?.equipment_items?.sprite_url ?? null,
            accessory: data.equipped?.accessory?.equipment_items?.sprite_url ?? null,
          });
        })
        .catch(error => {
          console.error('Failed to fetch equipment:', error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [autoFetch, equipment]);

  // Update internal state if equipment prop changes
  useEffect(() => {
    if (equipment) {
      setFetchedEquipment(equipment);
    }
  }, [equipment]);

  const activeEquipment = fetchedEquipment || equipment;

  // Render loading skeleton
  if (isLoading && showSkeleton) {
    return (
      <div
        className={`relative rounded-lg bg-gray-800 animate-pulse ${SIZE_CLASSES[size]} ${className || ''}`}
      />
    );
  }

  return (
    <div className={`relative ${SIZE_CLASSES[size]} ${className || ''}`}>
      {/* Layer 1: Base Avatar (z-10) */}
      <div className="absolute inset-0 z-10">
        <img
          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`}
          alt="Avatar"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Layer 2: Body Equipment (z-20) */}
      {activeEquipment?.body && (
        <img
          src={activeEquipment.body}
          alt="Body equipment"
          className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          loading="lazy"
        />
      )}

      {/* Layer 3: Head Equipment (z-30) */}
      {activeEquipment?.head && (
        <img
          src={activeEquipment.head}
          alt="Head equipment"
          className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          loading="lazy"
        />
      )}

      {/* Layer 4: Accessory (z-40) - top layer */}
      {activeEquipment?.accessory && (
        <img
          src={activeEquipment.accessory}
          alt="Accessory"
          className="absolute inset-0 w-full h-full object-contain z-40 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          loading="lazy"
        />
      )}
    </div>
  );
}

// Named export for convenience
export { LayeredAvatar };
