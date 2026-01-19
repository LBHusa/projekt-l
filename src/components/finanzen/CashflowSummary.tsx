'use client';

import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';
import type { MonthlyCashflow } from '@/lib/database.types';

interface CashflowSummaryProps {
  cashflow: MonthlyCashflow;
  month?: string;
}

export function CashflowSummary({ cashflow, month }: CashflowSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const savingsRate = cashflow.income > 0
    ? ((cashflow.savings + cashflow.investments) / cashflow.income * 100).toFixed(1)
    : '0';

  const isPositive = cashflow.net >= 0;

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Cashflow</h2>
          {month && (
            <span className="text-sm text-adaptive-dim">
              {new Date(month + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {isPositive ? '+' : ''}{formatCurrency(cashflow.net)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Income */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-adaptive-muted">Einnahmen</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatCurrency(cashflow.income)}</p>
        </div>

        {/* Expenses */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-adaptive-muted">Ausgaben</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(cashflow.expenses)}</p>
        </div>

        {/* Savings */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-adaptive-muted">Gespart</span>
          </div>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(cashflow.savings)}</p>
        </div>

        {/* Investments */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-adaptive-muted">Investiert</span>
          </div>
          <p className="text-xl font-bold text-purple-400">{formatCurrency(cashflow.investments)}</p>
        </div>
      </div>

      {/* Savings Rate Bar */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-adaptive-muted">Sparrate</span>
          <span className={`font-medium ${Number(savingsRate) >= 20 ? 'text-green-400' : Number(savingsRate) >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
            {savingsRate}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${Number(savingsRate) >= 20 ? 'bg-green-500' : Number(savingsRate) >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, Number(savingsRate))}%` }}
          />
        </div>
        <p className="text-xs text-adaptive-dim mt-1">
          {Number(savingsRate) >= 20
            ? 'Exzellent! Uber 20% Sparrate'
            : Number(savingsRate) >= 10
            ? 'Gut! Versuche 20% zu erreichen'
            : 'Tipp: Versuche mind. 10-20% zu sparen'}
        </p>
      </div>
    </div>
  );
}
