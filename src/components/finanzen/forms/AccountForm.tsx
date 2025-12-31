'use client';

import { useState } from 'react';
import { X, Building2, Wallet, CreditCard, LineChart, Bitcoin, Banknote, Landmark } from 'lucide-react';
import type { Account, AccountType } from '@/lib/database.types';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ReactNode }[] = [
  { value: 'checking', label: 'Girokonto', icon: <Building2 className="w-4 h-4" /> },
  { value: 'savings', label: 'Sparkonto', icon: <Landmark className="w-4 h-4" /> },
  { value: 'investment', label: 'Depot', icon: <LineChart className="w-4 h-4" /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-4 h-4" /> },
  { value: 'cash', label: 'Bargeld', icon: <Banknote className="w-4 h-4" /> },
  { value: 'credit', label: 'Kreditkarte', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'loan', label: 'Kredit/Darlehen', icon: <Wallet className="w-4 h-4" /> },
];

const CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP'];

const ACCOUNT_ICONS = ['💳', '🏦', '💰', '📈', '💎', '🪙', '💵', '🏠', '🚗', '🎓'];

const ACCOUNT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

interface AccountFormProps {
  account?: Account | null;
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
}

export interface AccountFormData {
  name: string;
  account_type: AccountType;
  institution: string;
  currency: string;
  current_balance: number;
  icon: string;
  color: string;
  credit_limit?: number;
  interest_rate?: number;
  is_excluded_from_net_worth: boolean;
}

export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: account?.name || '',
    account_type: account?.account_type || 'checking',
    institution: account?.institution || '',
    currency: account?.currency || 'EUR',
    current_balance: account?.current_balance || 0,
    icon: account?.icon || '💳',
    color: account?.color || '#3B82F6',
    credit_limit: account?.credit_limit || undefined,
    interest_rate: account?.interest_rate || undefined,
    is_excluded_from_net_worth: account?.is_excluded_from_net_worth || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCreditLimit = formData.account_type === 'credit';
  const showInterestRate = ['savings', 'loan', 'credit'].includes(formData.account_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <h2 className="text-lg font-bold">
            {account ? 'Konto bearbeiten' : 'Neues Konto'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Kontoname *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="z.B. Hauptkonto DKB"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Kontotyp</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCOUNT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, account_type: type.value }))}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                    formData.account_type === type.value
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-white/10 text-white/60 hover:bg-white/5'
                  }`}
                >
                  {type.icon}
                  <span className="truncate">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bank / Institution</label>
            <input
              type="text"
              value={formData.institution}
              onChange={e => setFormData(prev => ({ ...prev, institution: e.target.value }))}
              placeholder="z.B. DKB, ING, Trade Republic"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Currency & Balance Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Wahrung</label>
              <select
                value={formData.currency}
                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Aktueller Stand</label>
              <input
                type="number"
                value={formData.current_balance}
                onChange={e => setFormData(prev => ({ ...prev, current_balance: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Credit Limit (for credit cards) */}
          {showCreditLimit && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Kreditlimit</label>
              <input
                type="number"
                value={formData.credit_limit || ''}
                onChange={e => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || undefined }))}
                step="100"
                placeholder="z.B. 5000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Interest Rate (for savings/loans) */}
          {showInterestRate && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Zinssatz (% p.a.)</label>
              <input
                type="number"
                value={formData.interest_rate || ''}
                onChange={e => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || undefined }))}
                step="0.01"
                placeholder="z.B. 3.5"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    formData.icon === icon
                      ? 'bg-white/20 ring-2 ring-emerald-500'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Farbe</label>
            <div className="flex gap-2">
              {ACCOUNT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--background-secondary)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Exclude from Net Worth */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="exclude-networth"
              checked={formData.is_excluded_from_net_worth}
              onChange={e => setFormData(prev => ({ ...prev, is_excluded_from_net_worth: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <label htmlFor="exclude-networth" className="text-sm text-white/70">
              Vom Gesamtvermogen ausschliessen (z.B. Notgroschen)
            </label>
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
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : account ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
