'use client';

import { useState } from 'react';
import { X, Target, Calendar, TrendingUp, PiggyBank } from 'lucide-react';
import type { SavingsGoal } from '@/lib/database.types';

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '💰', '🏖️', '📱', '🎸', '🏋️', '👶'];

const GOAL_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

interface SavingsGoalFormProps {
  goal?: SavingsGoal | null;
  onSubmit: (data: SavingsGoalFormData) => Promise<void>;
  onCancel: () => void;
}

export interface SavingsGoalFormData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  interest_rate: number;
  compounds_per_year: number;
  target_date?: string;
  xp_reward: number;
}

export function SavingsGoalForm({ goal, onSubmit, onCancel }: SavingsGoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SavingsGoalFormData>({
    name: goal?.name || '',
    description: goal?.description || '',
    icon: goal?.icon || '🎯',
    color: goal?.color || '#10B981',
    target_amount: goal?.target_amount || 10000,
    current_amount: goal?.current_amount || 0,
    monthly_contribution: goal?.monthly_contribution || 200,
    interest_rate: goal?.interest_rate || 0,
    compounds_per_year: goal?.compounds_per_year || 12,
    target_date: goal?.target_date || '',
    xp_reward: goal?.xp_reward || 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.target_amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate projected amount and months to goal
  const calculateProjection = () => {
    const { current_amount, monthly_contribution, interest_rate, target_amount } = formData;

    if (monthly_contribution <= 0 && interest_rate <= 0) {
      return { months: Infinity, projected: current_amount };
    }

    const monthlyRate = interest_rate / 100 / 12;
    let months = 0;
    let balance = current_amount;
    const maxMonths = 1200; // 100 years max

    while (balance < target_amount && months < maxMonths) {
      balance = balance * (1 + monthlyRate) + monthly_contribution;
      months++;
    }

    return { months, projected: balance };
  };

  const projection = calculateProjection();
  const progressPercent = formData.target_amount > 0
    ? Math.min(100, (formData.current_amount / formData.target_amount) * 100)
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonths = (months: number) => {
    if (months === Infinity) return 'Nie';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} Monate`;
    if (remainingMonths === 0) return `${years} Jahre`;
    return `${years} Jahre ${remainingMonths} Monate`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            {goal ? 'Sparziel bearbeiten' : 'Neues Sparziel'}
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
            <label className="block text-sm font-medium mb-1.5">Zielname *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="z.B. Notgroschen, Urlaub 2025, Neues Auto"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional: Wofur sparst du?"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    formData.icon === icon
                      ? 'bg-white/20 ring-2 ring-blue-500'
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
              {GOAL_COLORS.map(color => (
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

          {/* Target Amount & Current Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Target className="w-4 h-4 inline mr-1" />
                Zielbetrag *
              </label>
              <input
                type="number"
                value={formData.target_amount}
                onChange={e => setFormData(prev => ({ ...prev, target_amount: parseFloat(e.target.value) || 0 }))}
                min="1"
                step="100"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <PiggyBank className="w-4 h-4 inline mr-1" />
                Aktuell gespart
              </label>
              <input
                type="number"
                value={formData.current_amount}
                onChange={e => setFormData(prev => ({ ...prev, current_amount: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="10"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Monthly Contribution & Interest Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Monatlich sparen
              </label>
              <input
                type="number"
                value={formData.monthly_contribution}
                onChange={e => setFormData(prev => ({ ...prev, monthly_contribution: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="10"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Zinssatz (% p.a.)
              </label>
              <input
                type="number"
                value={formData.interest_rate}
                onChange={e => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                min="0"
                max="30"
                step="0.1"
                placeholder="z.B. 7 fur ETF"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              Zieldatum (optional)
            </label>
            <input
              type="date"
              value={formData.target_date}
              onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* XP Reward */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              XP-Belohnung bei Erreichen: {formData.xp_reward} XP
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={formData.xp_reward}
              onChange={e => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>50 XP</span>
              <span>500 XP</span>
            </div>
          </div>

          {/* Projection Preview */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-white/70">Vorschau</h3>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Fortschritt</span>
                <span className="font-medium">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: formData.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>{formatCurrency(formData.current_amount)}</span>
                <span>{formatCurrency(formData.target_amount)}</span>
              </div>
            </div>

            {/* Time to Goal */}
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Ziel erreicht in:</span>
              <span className="text-sm font-medium text-blue-400">
                {formatMonths(projection.months)}
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
              disabled={isSubmitting || !formData.name.trim() || formData.target_amount <= 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : goal ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
