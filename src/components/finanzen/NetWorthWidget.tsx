'use client';

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { NetWorthLevel } from './NetWorthLevel';
import type { UserNetWorthExtended } from '@/lib/database.types';

interface NetWorthWidgetProps {
  netWorth: UserNetWorthExtended | null;
  previousNetWorth?: number;
}

export function NetWorthWidget({ netWorth, previousNetWorth }: NetWorthWidgetProps) {
  if (!netWorth) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Vermogen</p>
            <p className="text-white/40">Keine Daten</p>
          </div>
        </div>
      </div>
    );
  }

  const change = previousNetWorth !== undefined ? netWorth.net_worth - previousNetWorth : 0;
  const changePercent = previousNetWorth && previousNetWorth !== 0
    ? ((change / previousNetWorth) * 100).toFixed(1)
    : null;
  const isPositive = change >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Vermogen</p>
            <p className="text-3xl font-bold text-emerald-400">
              {formatCurrency(netWorth.net_worth)}
            </p>
          </div>
        </div>
        <NetWorthLevel level={netWorth.net_worth_level} />
      </div>

      {changePercent && (
        <div className={`flex items-center gap-2 mb-4 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm">
            {isPositive ? '+' : ''}{formatCurrency(change)} ({changePercent}%)
          </span>
          <span className="text-xs text-white/40">vs. letzter Monat</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-400">
            {formatCurrency(netWorth.cash_total)}
          </p>
          <p className="text-xs text-white/40">Bargeld</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-purple-400">
            {formatCurrency(netWorth.investments_total)}
          </p>
          <p className="text-xs text-white/40">Investments</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-orange-400">
            {formatCurrency(netWorth.crypto_total)}
          </p>
          <p className="text-xs text-white/40">Crypto</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">
            {formatCurrency(Math.abs(netWorth.debt_total))}
          </p>
          <p className="text-xs text-white/40">Schulden</p>
        </div>
      </div>
    </div>
  );
}
