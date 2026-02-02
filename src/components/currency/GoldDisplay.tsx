'use client';

import { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';

interface GoldDisplayProps {
  initialGold?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GoldDisplay({
  initialGold,
  showLabel = false,
  size = 'md',
  className = '',
}: GoldDisplayProps) {
  const [gold, setGold] = useState<number | null>(initialGold ?? null);
  const [loading, setLoading] = useState(!initialGold);

  useEffect(() => {
    if (initialGold !== undefined) {
      setGold(initialGold);
      setLoading(false);
      return;
    }

    // Fetch gold balance
    async function fetchGold() {
      try {
        const response = await fetch('/api/user/currency');
        if (response.ok) {
          const data = await response.json();
          setGold(data.gold);
        }
      } catch (error) {
        console.error('Failed to fetch gold:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGold();
  }, [initialGold]);

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  if (loading) {
    return (
      <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
        <Coins size={iconSizes[size]} className="text-yellow-500 animate-pulse" />
        <span className="text-muted-foreground">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      <Coins size={iconSizes[size]} className="text-yellow-500" />
      <span className="font-semibold text-foreground">
        {gold?.toLocaleString('de-DE') ?? 0}
      </span>
      {showLabel && (
        <span className="text-muted-foreground ml-1">Gold</span>
      )}
    </div>
  );
}
