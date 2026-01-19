'use client';

import { useState } from 'react';
import { X, Scale } from 'lucide-react';
import type { BodyMetric, MetricType } from '@/lib/database.types';
import { METRIC_TYPE_CONFIG, getDefaultUnit, type BodyMetricFormData } from '@/lib/data/koerper';

interface BodyMetricFormProps {
  metric?: BodyMetric | null;
  onSubmit: (data: BodyMetricFormData) => Promise<void>;
  onCancel: () => void;
  defaultType?: MetricType;
}

export default function BodyMetricForm({
  metric,
  onSubmit,
  onCancel,
  defaultType = 'weight',
}: BodyMetricFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to today's date
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<BodyMetricFormData>({
    metric_type: metric?.metric_type || defaultType,
    value: metric?.value || 0,
    unit: metric?.unit || getDefaultUnit(defaultType),
    measured_at: metric?.measured_at ? metric.measured_at.split('T')[0] : today,
    notes: metric?.notes || undefined,
  });

  const handleTypeChange = (type: MetricType) => {
    setFormData(prev => ({
      ...prev,
      metric_type: type,
      unit: getDefaultUnit(type),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.value <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const metricTypes = Object.entries(METRIC_TYPE_CONFIG) as [MetricType, typeof METRIC_TYPE_CONFIG[MetricType]][];
  const currentConfig = METRIC_TYPE_CONFIG[formData.metric_type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">
              {metric ? 'Wert bearbeiten' : 'Wert eintragen'}
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Metric Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Messwert</label>
            <div className="grid grid-cols-4 gap-2">
              {metricTypes.map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`py-2 px-2 rounded-lg border text-xs transition-all ${
                    formData.metric_type === type
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'border-white/10 text-adaptive-muted hover:bg-white/5'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input - Large and centered */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                value={formData.value || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  value: e.target.value ? parseFloat(e.target.value) : 0
                }))}
                placeholder="0"
                step={formData.metric_type === 'weight' ? '0.1' : formData.metric_type === 'body_fat' ? '0.1' : '1'}
                min="0"
                max={formData.metric_type === 'body_fat' ? '100' : '999'}
                className="w-32 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              />
              {currentConfig.unit && (
                <span className="text-xl text-adaptive-dim">{currentConfig.unit}</span>
              )}
            </div>
            <p className="text-sm text-adaptive-dim mt-2">{currentConfig.label}</p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Datum</label>
            <input
              type="date"
              value={formData.measured_at}
              onChange={e => setFormData(prev => ({ ...prev, measured_at: e.target.value }))}
              max={today}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notizen</label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* XP Info */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
            <span className="text-purple-400 font-medium">+5 XP</span>
            <span className="text-adaptive-dim text-sm ml-2">für das Tracken</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.value <= 0}
              className="flex-1 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : metric ? 'Speichern' : 'Eintragen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
