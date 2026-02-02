'use client';

// ============================================
// Purchase Modal Component
// Phase 4: Visuelle Belohnungen - Equipment Shop
// ============================================

import { useState } from 'react';
import { X, Coins, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LayeredAvatar from '@/components/avatar/LayeredAvatar';
import type { EquipmentItem } from '@/lib/database.types';

interface PurchaseModalProps {
  item: EquipmentItem;
  userGold: number;
  isOwned: boolean;
  onClose: () => void;
  onPurchaseComplete: (itemId: string, newBalance: number) => void;
}

export function PurchaseModal({
  item,
  userGold,
  isOwned,
  onClose,
  onPurchaseComplete,
}: PurchaseModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = userGold >= item.price_gold;

  const handlePurchase = async () => {
    if (!canAfford || isOwned) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kauf fehlgeschlagen');
      }

      onPurchaseComplete(item.id, data.new_balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Build preview equipment
  const previewEquipment = {
    head: item.item_type === 'head' ? item.sprite_url : undefined,
    body: item.item_type === 'body' ? item.sprite_url : undefined,
    accessory: item.item_type === 'accessory' ? item.sprite_url : undefined,
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-md w-full shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>

          {/* Avatar Preview */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <LayeredAvatar
                size="xl"
                equipment={previewEquipment}
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-400">
                Vorschau
              </div>
            </div>
          </div>

          {/* Item Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
            {item.description && (
              <p className="text-muted-foreground mt-2">{item.description}</p>
            )}
          </div>

          {/* Price Section */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Preis:</span>
              <span className="flex items-center gap-2 text-xl font-bold text-yellow-500">
                <Coins size={20} />
                {item.price_gold.toLocaleString('de-DE')}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Dein Gold:</span>
              <span className={`font-semibold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                {userGold.toLocaleString('de-DE')}
              </span>
            </div>
            {!canAfford && !isOwned && (
              <p className="text-red-400 text-sm mt-2 text-center">
                Nicht genug Gold!
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>

            {isOwned ? (
              <div className="flex-1 px-4 py-3 bg-green-600/20 border border-green-500 rounded-lg flex items-center justify-center gap-2 text-green-400">
                <Check size={20} />
                Bereits gekauft
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={!canAfford || isPurchasing}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                  ${canAfford
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                  ${isPurchasing ? 'opacity-50 cursor-wait' : ''}
                `}
              >
                {isPurchasing ? (
                  <span className="animate-spin">...</span>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Kaufen
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
