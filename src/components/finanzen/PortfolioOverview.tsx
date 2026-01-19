'use client';

import { TrendingUp, TrendingDown, Briefcase, DollarSign } from 'lucide-react';
import type { Investment } from '@/lib/database.types';

interface PortfolioOverviewProps {
  investments: Investment[];
}

export function PortfolioOverview({ investments }: PortfolioOverviewProps) {
  // Calculate portfolio metrics
  const totalValue = investments.reduce((sum, inv) => {
    const currentPrice = inv.current_price || inv.average_cost || 0;
    return sum + (inv.quantity * currentPrice);
  }, 0);

  const totalCost = investments.reduce((sum, inv) => {
    const avgCost = inv.average_cost || 0;
    return sum + (inv.quantity * avgCost);
  }, 0);

  const totalReturn = totalValue - totalCost;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const isPositive = totalReturn >= 0;

  // Calculate today's performance (simplified - would need historical data for real implementation)
  const todayReturn = 0; // Placeholder
  const todayReturnPercent = 0; // Placeholder

  // Calculate investment level based on portfolio value
  const investmentLevel = Math.min(100, Math.max(1, Math.floor(Math.log10(totalValue + 1) * 10)));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (investments.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-adaptive-muted">Portfolio</p>
            <p className="text-adaptive-dim">Noch keine Investments</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-adaptive-muted">Portfolio Gesamtwert</p>
            <p className="text-3xl font-bold text-purple-400">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-adaptive-dim">Investment Level</p>
          <p className="text-2xl font-bold text-purple-300">Lvl {investmentLevel}</p>
        </div>
      </div>

      {/* Total Returns */}
      <div className={`flex items-center gap-2 mb-4 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span className="text-sm font-semibold">
          {formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
        </span>
        <span className="text-xs text-adaptive-dim">Gesamt</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-400">
            {formatCurrency(totalCost)}
          </p>
          <p className="text-xs text-adaptive-dim">Investiert</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-purple-400">
            {investments.length}
          </p>
          <p className="text-xs text-adaptive-dim">Positionen</p>
        </div>
      </div>
    </div>
  );
}
