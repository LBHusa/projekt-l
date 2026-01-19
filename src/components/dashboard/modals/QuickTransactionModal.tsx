'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import type { Account, TransactionType } from '@/lib/database.types';
import { Loader2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickTransactionData) => Promise<void>;
  accounts: Account[];
}

export interface QuickTransactionData {
  account_id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  occurred_at: string;
  // Additional fields for createTransaction
  to_account_id: null;
  tags: string[];
  is_recurring: false;
  recurring_frequency: null;
  next_occurrence: null;
  recurrence_end_date: null;
}

const INCOME_CATEGORIES = [
  { name: 'Gehalt', icon: '💼' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Investment', icon: '📈' },
  { name: 'Geschenk', icon: '🎁' },
];

const EXPENSE_CATEGORIES = [
  { name: 'Essen', icon: '🍔' },
  { name: 'Wohnung', icon: '🏠' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Gesundheit', icon: '🏥' },
  { name: 'Freizeit', icon: '🎮' },
  { name: 'Bildung', icon: '📚' },
  { name: 'Sonstiges', icon: '📝' },
];

export default function QuickTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  accounts,
}: QuickTransactionModalProps) {
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    'expense'
  );
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTransactionType('expense');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');
      setAmount('');
      setCategory('');
      setDescription('');
    }
  }, [isOpen, accounts]);

  const currentCategories =
    transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const isValid = accountId && amount && parseFloat(amount) > 0 && category;

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    try {
      const data: QuickTransactionData = {
        account_id: accountId,
        transaction_type: transactionType,
        category,
        amount: parseFloat(amount),
        description: description || '',
        occurred_at: new Date().toISOString(),
        to_account_id: null,
        tags: [],
        is_recurring: false,
        recurring_frequency: null,
        next_occurrence: null,
        recurrence_end_date: null,
      };

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Empty state when no accounts
  if (accounts.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Transaktion" size="md">
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-adaptive-dim" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Kein Konto vorhanden
          </h3>
          <p className="text-adaptive-muted mb-4">
            Du hast noch keine Konten eingerichtet. Erstelle zuerst ein Konto.
          </p>
          <Link href="/finanzen">
            <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition">
              Zu Finanzen
            </button>
          </Link>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaktion" size="md">
      <div className="space-y-4">
        {/* Transaction Type Toggle */}
        <div className="space-y-2">
          <label className="text-sm text-adaptive font-medium block">
            Typ
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setTransactionType('income');
                setCategory('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                transactionType === 'income'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-white/5 border-[var(--orb-border)] text-adaptive-muted hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Einnahme</span>
            </button>
            <button
              onClick={() => {
                setTransactionType('expense');
                setCategory('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                transactionType === 'expense'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-white/5 border-[var(--orb-border)] text-adaptive-muted hover:bg-white/10'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span className="font-medium">Ausgabe</span>
            </button>
          </div>
        </div>

        {/* Account Selection */}
        <div className="space-y-2">
          <label
            htmlFor="account"
            className="text-sm text-adaptive font-medium block"
          >
            Konto
          </label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-[var(--orb-border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.current_balance.toFixed(2)} €)
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label
            htmlFor="amount"
            className="text-sm text-adaptive font-medium block"
          >
            Betrag
          </label>
          <div className="relative">
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              autoFocus
              className="w-full px-3 py-2 pr-8 bg-white/5 border border-[var(--orb-border)] rounded-lg text-white text-2xl font-semibold placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-adaptive-muted text-lg">
              €
            </span>
          </div>
        </div>

        {/* Category Grid */}
        <div className="space-y-2">
          <label className="text-sm text-adaptive font-medium block">
            Kategorie
          </label>
          <div className="grid grid-cols-4 gap-2">
            {currentCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${
                  category === cat.name
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-white/5 border-[var(--orb-border)] hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs text-adaptive">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-sm text-adaptive font-medium block"
          >
            Beschreibung (optional)
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. Einkauf bei Rewe"
            className="w-full px-3 py-2 bg-white/5 border border-[var(--orb-border)] rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Advanced Options Link */}
        <Link
          href="/finanzen"
          className="block text-center text-sm text-purple-400 hover:text-purple-300 transition"
        >
          Erweiterte Optionen →
        </Link>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
