'use client';

import { useMemo } from 'react';
import { ArrowRight, TrendingUp, Wallet, PiggyBank, ShoppingCart, Home, Car, Utensils, Gamepad, Gift, CreditCard } from 'lucide-react';
import type { MoneyFlowData } from '@/lib/database.types';

interface MoneyFlowSankeyProps {
  data: MoneyFlowData;
}

// Category config with colors and icons
const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // Income
  salary: { color: '#10B981', icon: <Wallet className="w-4 h-4" />, label: 'Gehalt' },
  side_income: { color: '#34D399', icon: <TrendingUp className="w-4 h-4" />, label: 'Nebeneinkommen' },
  investments: { color: '#6EE7B7', icon: <TrendingUp className="w-4 h-4" />, label: 'Investments' },
  other_income: { color: '#A7F3D0', icon: <Gift className="w-4 h-4" />, label: 'Sonstiges' },

  // Expenses
  housing: { color: '#EF4444', icon: <Home className="w-4 h-4" />, label: 'Wohnen' },
  food: { color: '#F97316', icon: <Utensils className="w-4 h-4" />, label: 'Essen' },
  transport: { color: '#F59E0B', icon: <Car className="w-4 h-4" />, label: 'Transport' },
  entertainment: { color: '#8B5CF6', icon: <Gamepad className="w-4 h-4" />, label: 'Unterhaltung' },
  shopping: { color: '#EC4899', icon: <ShoppingCart className="w-4 h-4" />, label: 'Shopping' },
  subscriptions: { color: '#6366F1', icon: <CreditCard className="w-4 h-4" />, label: 'Abos' },
  other_expense: { color: '#94A3B8', icon: <ShoppingCart className="w-4 h-4" />, label: 'Sonstiges' },

  // Savings & Investments
  savings: { color: '#3B82F6', icon: <PiggyBank className="w-4 h-4" />, label: 'Sparen' },
  investing: { color: '#8B5CF6', icon: <TrendingUp className="w-4 h-4" />, label: 'Investieren' },
};

export function MoneyFlowSankey({ data }: MoneyFlowSankeyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { incomeTotal, expenseTotal, savingsTotal, investingTotal, flows } = useMemo(() => {
    const incomeTotal = data.totalIncome;
    const expenseTotal = data.totalExpenses;
    const savingsTotal = data.savings;
    const investingTotal = data.investments;

    // Calculate percentages for visual representation
    const flows = {
      income: data.income.map(i => ({
        ...i,
        percent: incomeTotal > 0 ? (i.amount / incomeTotal) * 100 : 0,
        config: CATEGORY_CONFIG[i.category] || CATEGORY_CONFIG.other_income,
      })),
      expenses: data.expenses.map(e => ({
        ...e,
        percent: incomeTotal > 0 ? (e.amount / incomeTotal) * 100 : 0,
        config: CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.other_expense,
      })),
      savings: {
        amount: savingsTotal,
        percent: incomeTotal > 0 ? (savingsTotal / incomeTotal) * 100 : 0,
        config: CATEGORY_CONFIG.savings,
      },
      investing: {
        amount: investingTotal,
        percent: incomeTotal > 0 ? (investingTotal / incomeTotal) * 100 : 0,
        config: CATEGORY_CONFIG.investing,
      },
    };

    return { incomeTotal, expenseTotal, savingsTotal, investingTotal, flows };
  }, [data]);

  // Calculate balance
  const balance = incomeTotal - expenseTotal - savingsTotal - investingTotal;

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center gap-2 mb-6">
        <ArrowRight className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold">Weg des Geldes</h2>
        <span className="text-xs text-white/40">Monatlicher Geldfluss</span>
      </div>

      {/* Main Flow Visualization */}
      <div className="relative">
        {/* Income Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-400">Einnahmen</span>
            <span className="text-sm text-white/50 ml-auto">{formatCurrency(incomeTotal)}</span>
          </div>

          <div className="space-y-2">
            {flows.income.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-green-400">
                  {item.config.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white/70">{item.config.label}</span>
                    <span className="text-white/50">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.config.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-white/40 w-12 text-right">{item.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Arrow */}
        <div className="flex items-center justify-center my-4">
          <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 via-white/20 to-red-500" />
        </div>

        {/* Distribution Section */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Expenses */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">Ausgaben</span>
            </div>
            <p className="text-lg font-bold text-red-400">{formatCurrency(expenseTotal)}</p>
            <p className="text-xs text-white/40">{((expenseTotal / incomeTotal) * 100 || 0).toFixed(0)}%</p>
          </div>

          {/* Savings */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400">Sparen</span>
            </div>
            <p className="text-lg font-bold text-blue-400">{formatCurrency(savingsTotal)}</p>
            <p className="text-xs text-white/40">{((savingsTotal / incomeTotal) * 100 || 0).toFixed(0)}%</p>
          </div>

          {/* Investing */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400">Investieren</span>
            </div>
            <p className="text-lg font-bold text-purple-400">{formatCurrency(investingTotal)}</p>
            <p className="text-xs text-white/40">{((investingTotal / incomeTotal) * 100 || 0).toFixed(0)}%</p>
          </div>
        </div>

        {/* Expense Breakdown */}
        {flows.expenses.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-400">Ausgaben-Kategorien</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {flows.expenses.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/5 rounded-lg p-2"
                >
                  <div style={{ color: item.config.color }}>
                    {item.config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">{item.config.label}</p>
                    <p className="text-sm font-medium" style={{ color: item.config.color }}>
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                  <span className="text-xs text-white/40">{item.percent.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance */}
        <div className={`flex items-center justify-between p-3 rounded-xl ${balance >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <span className="text-sm text-white/60">Verbleibendes Budget</span>
          <span className={`text-lg font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/30 text-center">
          Basierend auf Transaktionen der letzten 30 Tage
        </p>
      </div>
    </div>
  );
}
