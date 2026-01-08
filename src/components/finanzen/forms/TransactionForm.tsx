'use client';

import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar } from 'lucide-react';
import type { Account, TransactionType } from '@/lib/database.types';

// Default categories for income and expenses
const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Gehalt', icon: '💰' },
  { value: 'freelance', label: 'Freelance', icon: '💼' },
  { value: 'investments', label: 'Kapitalertrage', icon: '📈' },
  { value: 'rental', label: 'Mieteinnahmen', icon: '🏠' },
  { value: 'other_income', label: 'Sonstiges', icon: '💵' },
];

const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Miete/Wohnen', icon: '🏠' },
  { value: 'utilities', label: 'Nebenkosten', icon: '⚡' },
  { value: 'food', label: 'Essen & Trinken', icon: '🍕' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'insurance', label: 'Versicherungen', icon: '🛡️' },
  { value: 'health', label: 'Gesundheit', icon: '💊' },
  { value: 'communication', label: 'Kommunikation', icon: '📱' },
  { value: 'entertainment', label: 'Unterhaltung', icon: '🎮' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'education', label: 'Bildung', icon: '📚' },
  { value: 'subscriptions', label: 'Abos', icon: '📺' },
  { value: 'gifts', label: 'Geschenke', icon: '🎁' },
  { value: 'savings', label: 'Sparen', icon: '🏦' },
  { value: 'investments', label: 'Investieren', icon: '📊' },
  { value: 'other_expense', label: 'Sonstiges', icon: '📦' },
];

interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  defaultAccountId?: string;
}

export interface TransactionFormData {
  account_id: string;
  transaction_type: TransactionType;
  category: string;
  amount: number;
  description: string;
  occurred_at: string;
  to_account_id?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  next_occurrence?: string;
  recurrence_end_date?: string;
}

export function TransactionForm({ accounts, onSubmit, onCancel, defaultAccountId }: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    account_id: defaultAccountId || accounts[0]?.id || '',
    transaction_type: 'expense',
    category: '',
    amount: 0,
    description: '',
    occurred_at: new Date().toISOString().split('T')[0],
    is_recurring: false,
  });

  // Calculate next occurrence for recurring transactions
  const calculateNextOccurrence = (startDate: string, frequency: string): string => {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily': date.setDate(date.getDate() + 1); break;
      case 'weekly': date.setDate(date.getDate() + 7); break;
      case 'biweekly': date.setDate(date.getDate() + 14); break;
      case 'monthly': date.setMonth(date.getMonth() + 1); break;
      case 'quarterly': date.setMonth(date.getMonth() + 3); break;
      case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
      default: date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || formData.amount <= 0 || !formData.category) return;

    setIsSubmitting(true);
    try {
      // If recurring, calculate next_occurrence
      const submitData = { ...formData };
      if (submitData.is_recurring && submitData.recurring_frequency) {
        submitData.next_occurrence = calculateNextOccurrence(
          submitData.occurred_at,
          submitData.recurring_frequency
        );
      }
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = formData.transaction_type === 'income'
    ? INCOME_CATEGORIES
    : formData.transaction_type === 'expense'
    ? EXPENSE_CATEGORIES
    : [];

  const showToAccount = formData.transaction_type === 'transfer';
  const showCategories = formData.transaction_type !== 'transfer';

  const formatCurrency = (value: number) => {
    const account = accounts.find(a => a.id === formData.account_id);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: account?.currency || 'EUR',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <h2 className="text-lg font-bold">Neue Transaktion</h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Transaktionstyp</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transaction_type: 'income', category: '' }))}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border transition-all ${
                  formData.transaction_type === 'income'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Einnahme
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transaction_type: 'expense', category: '' }))}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border transition-all ${
                  formData.transaction_type === 'expense'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Ausgabe
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transaction_type: 'transfer', category: 'transfer' }))}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border transition-all ${
                  formData.transaction_type === 'transfer'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Umbuchung
              </button>
            </div>
          </div>

          {/* Account Selection */}
          <div className={showToAccount ? 'grid grid-cols-2 gap-4' : ''}>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {showToAccount ? 'Von Konto' : 'Konto'}
              </label>
              <select
                value={formData.account_id}
                onChange={e => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Konto wahlen...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            {showToAccount && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Zu Konto</label>
                <select
                  value={formData.to_account_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, to_account_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Zielkonto wahlen...</option>
                  {accounts
                    .filter(a => a.id !== formData.account_id)
                    .map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Category */}
          {showCategories && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Kategorie *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                    className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs transition-all ${
                      formData.category === cat.value
                        ? formData.transaction_type === 'income'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'border-white/10 text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Betrag *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">EUR</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                Datum
              </label>
              <input
                type="date"
                value={formData.occurred_at}
                onChange={e => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="z.B. Miete Januar, REWE Einkauf"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-recurring"
              checked={formData.is_recurring}
              onChange={e => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <label htmlFor="is-recurring" className="text-sm text-white/70">
              Wiederkehrende Transaktion
            </label>
          </div>

          {formData.is_recurring && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Wiederholung</label>
              <select
                value={formData.recurring_frequency || 'monthly'}
                onChange={e => setFormData(prev => ({ ...prev, recurring_frequency: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="weekly">Wochentlich</option>
                <option value="biweekly">Alle 2 Wochen</option>
                <option value="monthly">Monatlich</option>
                <option value="quarterly">Quartalsweise</option>
                <option value="yearly">Jahrlich</option>
              </select>
            </div>
          )}

          {/* Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {formData.transaction_type === 'income' ? (
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                ) : formData.transaction_type === 'expense' ? (
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                ) : (
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                )}
                <span className="text-sm text-white/70">
                  {formData.description || categories.find(c => c.value === formData.category)?.label || 'Transaktion'}
                </span>
              </div>
              <span
                className={`text-lg font-bold ${
                  formData.transaction_type === 'income'
                    ? 'text-green-400'
                    : formData.transaction_type === 'expense'
                    ? 'text-red-400'
                    : 'text-blue-400'
                }`}
              >
                {formData.transaction_type === 'income' ? '+' : formData.transaction_type === 'expense' ? '-' : ''}
                {formatCurrency(formData.amount)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.account_id || formData.amount <= 0 || !formData.category}
              className={`flex-1 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
                formData.transaction_type === 'income'
                  ? 'bg-green-500 hover:bg-green-500/80'
                  : formData.transaction_type === 'expense'
                  ? 'bg-red-500 hover:bg-red-500/80'
                  : 'bg-blue-500 hover:bg-blue-500/80'
              }`}
            >
              {isSubmitting ? 'Speichern...' : 'Hinzufugen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
