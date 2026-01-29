'use client';

import { motion } from 'framer-motion';
import { Wallet, AlertCircle, Plus } from 'lucide-react';

interface BudgetProgress {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
}

interface BudgetCardProps {
  budget: BudgetProgress;
  period?: 'weekly' | 'monthly' | 'yearly';
  onClick?: () => void;
}

interface BudgetsListProps {
  budgets: BudgetProgress[];
  period: 'monthly' | 'weekly' | 'yearly';
  onBudgetClick?: (budget: BudgetProgress) => void;
  onCreateBudget?: () => void;
}

function getBudgetStatus(spent: number, budget: number) {
  const percentage = (spent / budget) * 100;

  if (percentage <= 70) {
    return {
      color: 'text-green-400',
      bgColor: 'bg-green-500',
      status: 'under' as const,
      percentage
    };
  } else if (percentage <= 95) {
    return {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500',
      status: 'warning' as const,
      percentage
    };
  } else {
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-500',
      status: 'over' as const,
      percentage
    };
  }
}

export default function BudgetCard({ budget, onClick }: BudgetCardProps) {
  const status = getBudgetStatus(budget.spent, budget.budget);
  const isOverBudget = budget.remaining < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all cursor-pointer border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wallet className="w-5 h-5 text-purple-400 shrink-0" />
          <span className="font-medium truncate">{budget.category}</span>
        </div>
        <div className={`text-xs ${status.color}`}>
          {status.percentage.toFixed(0)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-white/10 rounded-full mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(status.percentage, 100)}%` }}
          className={`h-full ${status.bgColor} rounded-full`}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-adaptive-dim">Budgeted</div>
          <div className="font-medium">{budget.budget}€</div>
        </div>
        <div>
          <div className="text-adaptive-dim">Spent</div>
          <div className={`font-medium ${status.color}`}>{budget.spent}€</div>
        </div>
        <div>
          <div className="text-adaptive-dim">Remaining</div>
          <div className={`font-medium ${isOverBudget ? 'text-red-400' : ''}`}>
            {budget.remaining}€
          </div>
        </div>
      </div>

      {/* Over-budget warning */}
      {isOverBudget && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {Math.abs(budget.remaining)}€ over budget
        </div>
      )}
    </motion.div>
  );
}

export function BudgetsList({
  budgets,
  period,
  onCreateBudget,
  onBudgetClick
}: BudgetsListProps) {
  const periodLabel = {
    monthly: 'Monatliche Budgets',
    weekly: 'Wöchentliche Budgets',
    yearly: 'Jährliche Budgets'
  }[period];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{periodLabel}</h3>
        <button
          onClick={onCreateBudget}
          className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Budget
        </button>
      </div>

      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgets.map(budget => (
            <BudgetCard
              key={budget.category}
              budget={budget}
              onClick={() => onBudgetClick?.(budget)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-adaptive-dim">
          <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Budgets</p>
          <p className="text-sm mt-1">Erstelle dein erstes Budget!</p>
        </div>
      )}
    </div>
  );
}
