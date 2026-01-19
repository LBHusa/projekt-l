'use client';

import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import type { Investment } from '@/lib/database.types';

interface InvestmentCardProps {
  investment: Investment;
  onEdit?: (investment: Investment) => void;
  onDelete?: (investment: Investment) => void;
}

export function InvestmentCard({ investment, onEdit, onDelete }: InvestmentCardProps) {
  const currentPrice = investment.current_price || investment.average_cost || 0;
  const avgCost = investment.average_cost || 0;
  const totalValue = investment.quantity * currentPrice;
  const totalCost = investment.quantity * avgCost;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  const isPositive = gainLoss >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getAssetTypeColor = (type: string | null) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'etf':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'crypto':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'bond':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'fund':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'commodity':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAssetTypeLabel = (type: string | null) => {
    switch (type) {
      case 'stock':
        return 'Aktie';
      case 'etf':
        return 'ETF';
      case 'crypto':
        return 'Krypto';
      case 'bond':
        return 'Anleihe';
      case 'fund':
        return 'Fonds';
      case 'commodity':
        return 'Rohstoff';
      default:
        return 'Sonstiges';
    }
  };

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4 hover:border-purple-500/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-adaptive-muted">{investment.symbol}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${getAssetTypeColor(investment.asset_type)}`}>
              {getAssetTypeLabel(investment.asset_type)}
            </span>
          </div>
          <h4 className="font-semibold text-adaptive">{investment.name}</h4>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(investment)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Bearbeiten"
            >
              <Edit className="w-4 h-4 text-adaptive-muted" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(investment)}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              aria-label="Löschen"
            >
              <Trash2 className="w-4 h-4 text-red-400/80" />
            </button>
          )}
        </div>
      </div>

      {/* Performance Indicator */}
      <div className={`flex items-center gap-2 mb-3 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span className="text-sm font-semibold">
          {formatCurrency(gainLoss)}
        </span>
        <span className="text-xs">
          ({formatPercent(gainLossPercent)})
        </span>
      </div>

      {/* Investment Details */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
        <div>
          <p className="text-xs text-adaptive-dim mb-1">Menge</p>
          <p className="text-sm font-semibold text-adaptive">
            {investment.quantity.toLocaleString('de-DE', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-adaptive-dim mb-1">Gesamtwert</p>
          <p className="text-sm font-semibold text-adaptive">{formatCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-adaptive-dim mb-1">Ø Kaufpreis</p>
          <p className="text-sm font-semibold text-adaptive">{formatCurrency(avgCost)}</p>
        </div>
        <div>
          <p className="text-xs text-adaptive-dim mb-1">Aktueller Preis</p>
          <p className="text-sm font-semibold text-adaptive">{formatCurrency(currentPrice)}</p>
        </div>
      </div>

      {/* Notes */}
      {investment.notes && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-adaptive-muted">{investment.notes}</p>
        </div>
      )}
    </div>
  );
}
