'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Building2,
  Calendar,
  Edit2,
} from 'lucide-react';
import type { SalaryEntry, JobHistory } from '@/lib/database.types';

interface SalaryTimelineProps {
  salaries: (SalaryEntry & { job?: JobHistory })[];
  onAddSalary?: () => void;
  onEditSalary?: (salary: SalaryEntry) => void;
}

// Normalize all salary periods to monthly for accurate comparison
const normalizeSalary = (salary: SalaryEntry): number => {
  switch (salary.period) {
    case 'yearly':
      return salary.amount / 12;
    case 'hourly':
      return salary.amount * 160; // 40h/week * 4 weeks
    case 'monthly':
    default:
      return salary.amount;
  }
};

// Calculate salary change percentage from previous entry
const calculateSalaryChange = (
  current: SalaryEntry,
  previous: SalaryEntry | null
): { percentage: number; isIncrease: boolean } | null => {
  if (!previous) return null;

  const currentNorm = normalizeSalary(current);
  const previousNorm = normalizeSalary(previous);
  const change = currentNorm - previousNorm;
  const percentage = Math.round((change / previousNorm) * 100);

  return {
    percentage: Math.abs(percentage),
    isIncrease: change >= 0,
  };
};

export default function SalaryTimeline({
  salaries,
  onAddSalary,
  onEditSalary,
}: SalaryTimelineProps) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  // Prepare timeline data (sorted descending by date)
  const timelineData = useMemo(() => {
    return [...salaries]
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
      .map((salary, index, array) => ({
        ...salary,
        change: calculateSalaryChange(salary, array[index + 1] || null),
        isLatest: index === 0,
        isFirst: index === array.length - 1,
      }));
  }, [salaries]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (salaries.length < 2) return null;

    const sorted = [...salaries].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    const first = normalizeSalary(sorted[0]);
    const latest = normalizeSalary(sorted[sorted.length - 1]);
    const totalGrowth = Math.round(((latest - first) / first) * 100);

    const firstDate = new Date(sorted[0].effective_date);
    const latestDate = new Date(sorted[sorted.length - 1].effective_date);
    const yearsTracked = (
      (latestDate.getTime() - firstDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365)
    ).toFixed(1);

    return {
      totalGrowth,
      yearsTracked: parseFloat(yearsTracked),
      entryCount: salaries.length,
    };
  }, [salaries]);

  const periodLabel = (period: string) => {
    switch (period) {
      case 'monthly':
        return 'Monat';
      case 'yearly':
        return 'Jahr';
      case 'hourly':
        return 'Stunde';
      default:
        return period;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold">Gehalts-Timeline</h2>
        </div>
        {onAddSalary && (
          <button
            onClick={onAddSalary}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Eintrag hinzufügen
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-white/5 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-white/60">
              {stats.totalGrowth >= 0 ? '+' : ''}
              {stats.totalGrowth}% Wachstum
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-white/60">{stats.yearsTracked} Jahre</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-white/60">{stats.entryCount} Einträge</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {salaries.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">Noch keine Gehaltseinträge</p>
          <p className="text-sm mb-4">Dokumentiere deine Gehaltsentwicklung</p>
          {onAddSalary && (
            <button
              onClick={onAddSalary}
              className="mt-3 text-sm text-amber-400 hover:underline"
            >
              Ersten Eintrag hinzufügen
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      {timelineData.length > 0 && (
        <div className="relative">
          {/* Timeline connector line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-white/10" />

          {/* Timeline entries */}
          <div className="space-y-6">
            {timelineData.slice(0, visibleCount).map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="relative pl-14"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-4 top-4 w-5 h-5 rounded-full border-2 z-10 ${
                    entry.isLatest
                      ? 'bg-green-500 border-green-400 animate-pulse'
                      : entry.isFirst
                      ? 'bg-amber-500 border-amber-400'
                      : 'bg-[var(--background-secondary)] border-white/30'
                  }`}
                />

                {/* Entry card */}
                <div
                  className={`bg-white/5 border rounded-lg p-4 cursor-pointer transition-all ${
                    entry.isLatest
                      ? 'border-green-500/30 hover:border-green-500/50'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() =>
                    setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                  }
                >
                  {/* Amount and change indicator */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-400">
                        {formatCurrency(entry.amount)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/50">
                        / {periodLabel(entry.period)}
                      </span>
                    </div>
                    {entry.change && (
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          entry.change.isIncrease ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {entry.change.isIncrease ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {entry.change.isIncrease ? '+' : '-'}
                        {entry.change.percentage}%
                      </div>
                    )}
                  </div>

                  {/* Job info */}
                  {entry.job && (
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>
                        {entry.job.position} @ {entry.job.company}
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(entry.effective_date).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Badges */}
                  {entry.isLatest && (
                    <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                      Aktuelles Gehalt
                    </span>
                  )}
                  {entry.isFirst && (
                    <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                      Startgehalt
                    </span>
                  )}

                  {/* Expanded content (notes + edit button) */}
                  {expandedEntry === entry.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      {entry.notes && (
                        <p className="text-sm text-white/60 mb-3">{entry.notes}</p>
                      )}
                      {onEditSalary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSalary(entry);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Show More button */}
          {visibleCount < timelineData.length && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="w-full mt-4 py-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Weitere anzeigen ({timelineData.length - visibleCount})
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
