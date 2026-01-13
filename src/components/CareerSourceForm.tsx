'use client';

import { useState, useEffect } from 'react';
import { createCareerSource, updateCareerSource, type CareerSource, type NewCareerSource } from '@/lib/data/career';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CareerSourceFormProps {
  source?: CareerSource | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CAREER_TYPES = [
  { value: 'employment', label: 'Anstellung' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'business', label: 'Business' },
  { value: 'passive', label: 'Passives Einkommen' },
];

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'CHF', label: 'CHF (Fr.)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export function CareerSourceForm({ source, onSuccess, onCancel }: CareerSourceFormProps) {
  const isEdit = !!source;

  const [formData, setFormData] = useState<NewCareerSource>({
    name: '',
    type: 'employment',
    monthly_income: 0,
    currency: 'EUR',
    is_primary: false,
    is_active: true,
    start_date: null,
    linked_domain_id: null,
    xp_multiplier: 1.0,
    notes: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        type: source.type,
        monthly_income: source.monthly_income,
        currency: source.currency,
        is_primary: source.is_primary,
        is_active: source.is_active,
        start_date: source.start_date,
        linked_domain_id: source.linked_domain_id,
        xp_multiplier: source.xp_multiplier,
        notes: source.notes,
      });
    }
  }, [source]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && source) {
        await updateCareerSource(source.id, formData);
      } else {
        await createCareerSource(formData);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {isEdit ? 'Karriere-Quelle bearbeiten' : 'Neue Karriere-Quelle'}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="z.B. Hauptjob bei Firma X"
            required
          />
        </div>

        {/* Type */}
        <div>
          <Label htmlFor="type">Typ *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAREER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Monatliches Einkommen + Währung */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="monthly_income">Monatliches Einkommen</Label>
            <Input
              id="monthly_income"
              type="number"
              step="0.01"
              value={formData.monthly_income}
              onChange={(e) => setFormData({ ...formData, monthly_income: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Währung</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <Label htmlFor="start_date">Startdatum</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
          />
        </div>

        {/* XP Multiplier */}
        <div>
          <Label htmlFor="xp_multiplier">XP Multiplikator</Label>
          <Input
            id="xp_multiplier"
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={formData.xp_multiplier}
            onChange={(e) => setFormData({ ...formData, xp_multiplier: parseFloat(e.target.value) || 1.0 })}
          />
          <p className="text-sm text-gray-500 mt-1">
            Erfahrungspunkte aus dieser Quelle werden mit diesem Faktor multipliziert
          </p>
        </div>

        {/* Checkboxen */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">Als primäre Einkommensquelle markieren</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">Aktiv</span>
          </label>
        </div>

        {/* Notizen */}
        <div>
          <Label htmlFor="notes">Notizen</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
            placeholder="Optionale Notizen..."
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Speichere...' : isEdit ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
