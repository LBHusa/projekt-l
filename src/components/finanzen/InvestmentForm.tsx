'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Investment, AssetType, Account } from '@/lib/database.types';

export interface InvestmentFormData {
  account_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  average_cost: number;
  current_price: number;
  purchased_at?: string;
  notes?: string;
}

interface InvestmentFormProps {
  accounts: Account[];
  investment?: Investment | null;
  onSubmit: (data: InvestmentFormData) => void | Promise<void>;
  onCancel: () => void;
}

export function InvestmentForm({ accounts, investment, onSubmit, onCancel }: InvestmentFormProps) {
  const [formData, setFormData] = useState<InvestmentFormData>({
    account_id: investment?.account_id || '',
    symbol: investment?.symbol || '',
    name: investment?.name || '',
    asset_type: investment?.asset_type || 'stock',
    quantity: investment?.quantity || 0,
    average_cost: investment?.average_cost || 0,
    current_price: investment?.current_price || 0,
    purchased_at: investment?.purchased_at || '',
    notes: investment?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set default account if available
  useEffect(() => {
    if (!formData.account_id && accounts.length > 0) {
      setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
    }
  }, [accounts, formData.account_id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_id) newErrors.account_id = 'Konto erforderlich';
    if (!formData.symbol.trim()) newErrors.symbol = 'Symbol erforderlich';
    if (!formData.name.trim()) newErrors.name = 'Name erforderlich';
    if (formData.quantity <= 0) newErrors.quantity = 'Menge muss > 0 sein';
    if (formData.average_cost < 0) newErrors.average_cost = 'Kaufpreis muss ≥ 0 sein';
    if (formData.current_price < 0) newErrors.current_price = 'Aktueller Preis muss ≥ 0 sein';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting investment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof InvestmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">
            {investment ? 'Investment bearbeiten' : 'Neues Investment'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-adaptive mb-2">
              Konto *
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => handleChange('account_id', e.target.value)}
              className={`w-full bg-white/5 border ${
                errors.account_id ? 'border-red-500/50' : 'border-white/10'
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50`}
            >
              <option value="">Konto wählen...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_type})
                </option>
              ))}
            </select>
            {errors.account_id && (
              <p className="text-red-400 text-xs mt-1">{errors.account_id}</p>
            )}
          </div>

          {/* Symbol & Asset Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-adaptive mb-2">
                Symbol *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                placeholder="z.B. AAPL, BTC"
                className={`w-full bg-white/5 border ${
                  errors.symbol ? 'border-red-500/50' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50`}
              />
              {errors.symbol && (
                <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-adaptive mb-2">
                Asset-Typ *
              </label>
              <select
                value={formData.asset_type}
                onChange={(e) => handleChange('asset_type', e.target.value as AssetType)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="stock">Aktie</option>
                <option value="etf">ETF</option>
                <option value="crypto">Krypto</option>
                <option value="bond">Anleihe</option>
                <option value="fund">Fonds</option>
                <option value="commodity">Rohstoff</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-adaptive mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. Apple Inc., Bitcoin"
              className={`w-full bg-white/5 border ${
                errors.name ? 'border-red-500/50' : 'border-white/10'
              } rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50`}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Quantity, Average Cost, Current Price */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-adaptive mb-2">
                Menge *
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-full bg-white/5 border ${
                  errors.quantity ? 'border-red-500/50' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50`}
              />
              {errors.quantity && (
                <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-adaptive mb-2">
                Ø Kaufpreis (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.average_cost}
                onChange={(e) => handleChange('average_cost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`w-full bg-white/5 border ${
                  errors.average_cost ? 'border-red-500/50' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50`}
              />
              {errors.average_cost && (
                <p className="text-red-400 text-xs mt-1">{errors.average_cost}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-adaptive mb-2">
                Aktueller Preis (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.current_price}
                onChange={(e) => handleChange('current_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`w-full bg-white/5 border ${
                  errors.current_price ? 'border-red-500/50' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50`}
              />
              {errors.current_price && (
                <p className="text-red-400 text-xs mt-1">{errors.current_price}</p>
              )}
            </div>
          </div>

          {/* Purchased At */}
          <div>
            <label className="block text-sm font-medium text-adaptive mb-2">
              Kaufdatum
            </label>
            <input
              type="date"
              value={formData.purchased_at}
              onChange={(e) => handleChange('purchased_at', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-adaptive mb-2">
              Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Optional: Zusätzliche Informationen..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-adaptive-dim focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-adaptive transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-500/50 rounded-lg text-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird gespeichert...' : investment ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
