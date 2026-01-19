'use client';

import { useState } from 'react';
import { InvestmentCard } from './InvestmentCard';
import type { Investment, AssetType } from '@/lib/database.types';

interface InvestmentsListProps {
  investments: Investment[];
  onEdit?: (investment: Investment) => void;
  onDelete?: (investment: Investment) => void;
}

type SortKey = 'name' | 'value' | 'performance' | 'quantity';
type FilterType = 'all' | AssetType;

export function InvestmentsList({ investments, onEdit, onDelete }: InvestmentsListProps) {
  const [sortBy, setSortBy] = useState<SortKey>('value');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Calculate performance and value for each investment
  const enrichedInvestments = investments.map(inv => {
    const currentPrice = inv.current_price || inv.average_cost || 0;
    const avgCost = inv.average_cost || 0;
    const totalValue = inv.quantity * currentPrice;
    const totalCost = inv.quantity * avgCost;
    const performance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      ...inv,
      totalValue,
      performance,
    };
  });

  // Filter by asset type
  let filteredInvestments = enrichedInvestments;
  if (filterType !== 'all') {
    filteredInvestments = enrichedInvestments.filter(inv => inv.asset_type === filterType);
  }

  // Sort investments
  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'value':
        return b.totalValue - a.totalValue;
      case 'performance':
        return b.performance - a.performance;
      case 'quantity':
        return b.quantity - a.quantity;
      default:
        return 0;
    }
  });

  // Get unique asset types
  const assetTypes = Array.from(new Set(investments.map(inv => inv.asset_type).filter(Boolean))) as AssetType[];

  const getAssetTypeLabel = (type: AssetType) => {
    switch (type) {
      case 'stock':
        return 'Aktien';
      case 'etf':
        return 'ETFs';
      case 'crypto':
        return 'Krypto';
      case 'bond':
        return 'Anleihen';
      case 'fund':
        return 'Fonds';
      case 'commodity':
        return 'Rohstoffe';
      default:
        return 'Sonstiges';
    }
  };

  if (investments.length === 0) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-8 text-center">
        <p className="text-adaptive-dim">Noch keine Investments vorhanden</p>
        <p className="text-sm text-adaptive-dim mt-2">
          Füge dein erstes Investment hinzu, um dein Portfolio zu tracken
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterType === 'all'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-adaptive-muted border border-white/10 hover:bg-white/10'
            }`}
          >
            Alle ({investments.length})
          </button>
          {assetTypes.map(type => {
            const count = investments.filter(inv => inv.asset_type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === type
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-adaptive-muted border border-white/10 hover:bg-white/10'
                }`}
              >
                {getAssetTypeLabel(type)} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-adaptive-dim">Sortieren:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-adaptive focus:outline-none focus:border-purple-500/50"
          >
            <option value="value">Wert (hoch-niedrig)</option>
            <option value="performance">Performance</option>
            <option value="name">Name (A-Z)</option>
            <option value="quantity">Menge</option>
          </select>
        </div>
      </div>

      {/* Investments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedInvestments.map(investment => (
          <InvestmentCard
            key={investment.id}
            investment={investment}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Summary */}
      {sortedInvestments.length > 0 && (
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <p className="text-sm text-adaptive-muted">
            Zeige {sortedInvestments.length} von {investments.length} Investment{investments.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
