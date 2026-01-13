'use client';

import { useEffect, useState } from 'react';
import { getCareerSources, deleteCareerSource, deactivateCareerSource, type CareerSource } from '@/lib/data/career';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Archive, Briefcase, Laptop, Building2, TrendingUp } from 'lucide-react';

interface CareerSourceListProps {
  onEdit?: (source: CareerSource) => void;
  onAdd?: () => void;
}

const CAREER_TYPE_CONFIG = {
  employment: { label: 'Anstellung', icon: Briefcase, color: 'bg-blue-500' },
  freelance: { label: 'Freelance', icon: Laptop, color: 'bg-purple-500' },
  business: { label: 'Business', icon: Building2, color: 'bg-green-500' },
  passive: { label: 'Passiv', icon: TrendingUp, color: 'bg-orange-500' },
};

export function CareerSourceList({ onEdit, onAdd }: CareerSourceListProps) {
  const [sources, setSources] = useState<CareerSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      setLoading(true);
      const data = await getCareerSources();
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Karriere-Quelle wirklich löschen?')) return;

    try {
      await deleteCareerSource(id);
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateCareerSource(id);
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Deaktivieren');
    }
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const activeSources = sources.filter(s => s.is_active);
  const inactiveSources = sources.filter(s => !s.is_active);
  const totalIncome = activeSources.reduce((sum, s) => sum + (s.monthly_income || 0), 0);
  const primaryCurrency = activeSources.find(s => s.is_primary)?.currency || 'EUR';

  return (
    <div className="space-y-6">
      {/* Header mit Gesamteinkommen */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600">Gesamteinkommen (monatlich)</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalIncome, primaryCurrency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {activeSources.length} aktive Quelle{activeSources.length !== 1 ? 'n' : ''}
            </p>
          </div>
          {onAdd && (
            <Button onClick={onAdd}>
              + Quelle hinzufügen
            </Button>
          )}
        </div>
      </Card>

      {/* Aktive Quellen */}
      {activeSources.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Aktive Quellen</h3>
          <div className="grid gap-4">
            {activeSources.map((source) => {
              const config = CAREER_TYPE_CONFIG[source.type];
              const Icon = config.icon;

              return (
                <Card key={source.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{source.name}</h4>
                          {source.is_primary && (
                            <Badge variant="default" className="text-xs">Primär</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCurrency(source.monthly_income || 0, source.currency)}
                        </p>
                        {source.start_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Seit: {new Date(source.start_date).toLocaleDateString('de-DE')}
                          </p>
                        )}
                        {source.notes && (
                          <p className="text-sm text-gray-600 mt-2">{source.notes}</p>
                        )}
                        {source.xp_multiplier !== 1.0 && (
                          <p className="text-sm text-purple-600 mt-1">
                            XP Multiplikator: {source.xp_multiplier}x
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(source)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(source.id)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Inaktive Quellen */}
      {inactiveSources.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-500">Archiviert</h3>
          <div className="grid gap-3">
            {inactiveSources.map((source) => {
              const config = CAREER_TYPE_CONFIG[source.type];
              const Icon = config.icon;

              return (
                <Card key={source.id} className="p-3 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{source.name}</p>
                        <p className="text-sm text-gray-500">{config.label}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(source.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {sources.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Noch keine Karriere-Quellen vorhanden</p>
          {onAdd && (
            <Button onClick={onAdd}>
              Erste Quelle hinzufügen
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
