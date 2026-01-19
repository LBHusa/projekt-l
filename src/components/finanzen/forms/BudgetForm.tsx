'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, X } from 'lucide-react';
import type { Budget } from '@/lib/database.types';

export interface BudgetFormData {
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  icon?: string;
  color?: string;
}

interface BudgetFormProps {
  budget?: Budget | null;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
}

const BUDGET_CATEGORIES = [
  { value: 'groceries', label: 'Lebensmittel', icon: '🛒', color: '#10B981' },
  { value: 'dining', label: 'Restaurants', icon: '🍽️', color: '#F59E0B' },
  { value: 'transport', label: 'Transport', icon: '🚗', color: '#3B82F6' },
  { value: 'entertainment', label: 'Unterhaltung', icon: '🎮', color: '#8B5CF6' },
  { value: 'utilities', label: 'Nebenkosten', icon: '⚡', color: '#EC4899' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', color: '#EF4444' },
  { value: 'other', label: 'Sonstiges', icon: '📌', color: '#6B7280' },
];

export default function BudgetForm({ budget, onSubmit, onCancel }: BudgetFormProps) {
  const [formData, setFormData] = useState<BudgetFormData>({
    category: '',
    amount: 0,
    period: 'monthly',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setFormData({
        category: budget.category,
        amount: budget.amount,
        period: budget.period,
      });
    } else {
      setFormData({
        category: '',
        amount: 0,
        period: 'monthly',
      });
    }
    setError(null);
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category.trim()) {
      setError('Kategorie ist erforderlich');
      return;
    }

    if (formData.amount <= 0) {
      setError('Budget-Betrag muss größer als 0 sein');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            {budget ? 'Budget bearbeiten' : 'Neues Budget'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Category Grid */}
          <div>
            <label className="block text-sm text-adaptive-muted mb-2">Kategorie *</label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    formData.category === cat.value
                      ? 'bg-white/20 ring-1 ring-white/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-adaptive-muted mb-1">Budget-Betrag *</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 pr-8 bg-white/10 border border-white/20 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="100.00"
                required
              />
              <span className="absolute right-3 top-2.5 text-adaptive-dim">€</span>
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm text-adaptive-muted mb-2">Zeitraum *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['weekly', 'monthly', 'yearly'] as const).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, period }))}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    formData.period === period
                      ? 'bg-purple-500/30 text-purple-400 ring-1 ring-purple-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {period === 'weekly' ? 'Wöchentlich' : period === 'monthly' ? 'Monatlich' : 'Jährlich'}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : budget ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
