'use client';

import { useState, useMemo } from 'react';
import { X, ArrowRight, Wallet, PiggyBank, TrendingDown, TrendingUp, CalendarDays, Repeat } from 'lucide-react';
import type {
  Account,
  SavingsGoalProgress,
  RecurringFlowSourceType,
  RecurringFlowTargetType,
  RecurringFlowFrequency,
} from '@/lib/database.types';

const FREQUENCIES: { value: RecurringFlowFrequency; label: string }[] = [
  { value: 'weekly', label: 'Wochentlich' },
  { value: 'biweekly', label: 'Alle 2 Wochen' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'yearly', label: 'Jahrlich' },
];

const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Gehalt', icon: '💰' },
  { value: 'freelance', label: 'Freelance', icon: '💼' },
  { value: 'rental', label: 'Mieteinnahmen', icon: '🏠' },
  { value: 'dividends', label: 'Dividenden', icon: '📈' },
  { value: 'interest', label: 'Zinsen', icon: '🏦' },
  { value: 'other_income', label: 'Sonstiges', icon: '💵' },
];

const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Wohnen', icon: '🏠' },
  { value: 'utilities', label: 'Nebenkosten', icon: '⚡' },
  { value: 'food', label: 'Essen', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'insurance', label: 'Versicherungen', icon: '🛡️' },
  { value: 'health', label: 'Gesundheit', icon: '❤️' },
  { value: 'communication', label: 'Kommunikation', icon: '📱' },
  { value: 'entertainment', label: 'Unterhaltung', icon: '🎮' },
  { value: 'subscriptions', label: 'Abos', icon: '📺' },
  { value: 'education', label: 'Bildung', icon: '📚' },
  { value: 'other_expense', label: 'Sonstiges', icon: '📦' },
];

interface RecurringFlowFormProps {
  accounts: Account[];
  savingsGoals: SavingsGoalProgress[];
  initialData?: Partial<RecurringFlowFormData>;
  onSubmit: (data: RecurringFlowFormData) => Promise<void>;
  onCancel: () => void;
}

export interface RecurringFlowFormData {
  source_type: RecurringFlowSourceType;
  source_id: string | null;
  source_category: string | null;
  target_type: RecurringFlowTargetType;
  target_id: string | null;
  target_category: string | null;
  amount: number;
  frequency: RecurringFlowFrequency;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
}

export function RecurringFlowForm({
  accounts,
  savingsGoals,
  initialData,
  onSubmit,
  onCancel,
}: RecurringFlowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RecurringFlowFormData>({
    source_type: initialData?.source_type || 'income',
    source_id: initialData?.source_id || null,
    source_category: initialData?.source_category || 'salary',
    target_type: initialData?.target_type || 'expense',
    target_id: initialData?.target_id || null,
    target_category: initialData?.target_category || 'housing',
    amount: initialData?.amount || 0,
    frequency: initialData?.frequency || 'monthly',
    name: initialData?.name || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData?.end_date || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate name based on source and target
  const autoName = useMemo(() => {
    if (formData.source_type === 'income' && formData.source_category) {
      const cat = INCOME_CATEGORIES.find(c => c.value === formData.source_category);
      return cat?.label || '';
    }
    if (formData.target_type === 'expense' && formData.target_category) {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === formData.target_category);
      return cat?.label || '';
    }
    if (formData.target_type === 'savings' && formData.target_id) {
      const goal = savingsGoals.find(g => g.id === formData.target_id);
      return goal ? `Sparplan: ${goal.name}` : '';
    }
    return '';
  }, [formData.source_type, formData.source_category, formData.target_type, formData.target_category, formData.target_id, savingsGoals]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Repeat className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-adaptive">
              {initialData ? 'Dauerauftrag bearbeiten' : 'Neuer Dauerauftrag'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-adaptive-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Source Section */}
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h3 className="font-medium text-green-400">Quelle (Von)</h3>
            </div>

            {/* Source Type */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  source_type: 'income',
                  source_id: null,
                  source_category: 'salary',
                }))}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                  formData.source_type === 'income'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Einnahme
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  source_type: 'account',
                  source_id: accounts[0]?.id || null,
                  source_category: null,
                }))}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                  formData.source_type === 'account'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Konto
              </button>
            </div>

            {/* Source Details */}
            {formData.source_type === 'income' ? (
              <div>
                <label className="block text-sm text-adaptive-muted mb-1.5">Einnahmequelle</label>
                <div className="grid grid-cols-3 gap-2">
                  {INCOME_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, source_category: cat.value }))}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                        formData.source_category === cat.value
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-adaptive-muted mb-1.5">Konto auswählen</label>
                <select
                  value={formData.source_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, source_id: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Konto wahlen --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name} ({acc.current_balance.toFixed(0)} {acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="p-2 rounded-full bg-white/10">
              <ArrowRight className="w-5 h-5 text-adaptive-muted" />
            </div>
          </div>

          {/* Target Section */}
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="font-medium text-red-400">Ziel (Nach)</h3>
            </div>

            {/* Target Type */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  target_type: 'account',
                  target_id: accounts[0]?.id || null,
                  target_category: null,
                }))}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                  formData.target_type === 'account'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Konto
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  target_type: 'expense',
                  target_id: null,
                  target_category: 'housing',
                }))}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                  formData.target_type === 'expense'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Ausgabe
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  target_type: 'savings',
                  target_id: savingsGoals[0]?.id || null,
                  target_category: null,
                }))}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                  formData.target_type === 'savings'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                Sparziel
              </button>
            </div>

            {/* Target Details */}
            {formData.target_type === 'account' && (
              <div>
                <label className="block text-sm text-adaptive-muted mb-1.5">Zielkonto</label>
                <select
                  value={formData.target_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, target_id: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Konto wahlen --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.target_type === 'expense' && (
              <div>
                <label className="block text-sm text-adaptive-muted mb-1.5">Ausgabenkategorie</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, target_category: cat.value }))}
                      className={`flex items-center gap-1 py-2 px-2 rounded-lg border text-xs transition-all ${
                        formData.target_category === cat.value
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.target_type === 'savings' && (
              <div>
                <label className="block text-sm text-adaptive-muted mb-1.5">Sparziel</label>
                {savingsGoals.length > 0 ? (
                  <select
                    value={formData.target_id || ''}
                    onChange={e => setFormData(prev => ({ ...prev, target_id: e.target.value || null }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Sparziel wahlen --</option>
                    {savingsGoals.map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.icon} {goal.name} ({goal.progress_percent.toFixed(0)}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-adaptive-dim italic">
                    Noch keine Sparziele vorhanden. Erstelle zuerst ein Sparziel.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Amount & Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Betrag *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-adaptive-dim">EUR</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Frequenz</label>
              <select
                value={formData.frequency}
                onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as RecurringFlowFrequency }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bezeichnung *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={autoName || 'z.B. Gehalt, Miete, ETF Sparplan'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {autoName && !formData.name && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, name: autoName }))}
                className="text-xs text-blue-400 mt-1 hover:underline"
              >
                Vorschlag ubernehmen: {autoName}
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optionale Notizen..."
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <CalendarDays className="w-4 h-4 inline mr-1" />
                Startdatum
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Enddatum (optional)
              </label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-adaptive-dim mt-1">Leer = unbefristet</p>
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
              disabled={isSubmitting || !formData.name.trim() || formData.amount <= 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : initialData ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
