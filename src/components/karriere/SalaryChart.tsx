'use client';

import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Euro, Plus, Calendar } from 'lucide-react';
import type { SalaryEntry, JobHistory } from '@/lib/database.types';

interface SalaryChartProps {
  salaries: (SalaryEntry & { job?: JobHistory })[];
  currentSalary?: SalaryEntry | null;
  onAddSalary?: () => void;
}

export default function SalaryChart({
  salaries,
  currentSalary,
  onAddSalary,
}: SalaryChartProps) {
  // Prepare chart data - sort by date ascending
  const chartData = [...salaries]
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
    .map(s => ({
      date: new Date(s.effective_date).toLocaleDateString('de-DE', {
        month: 'short',
        year: '2-digit',
      }),
      amount: s.amount,
      company: s.job?.company || '',
      fullDate: new Date(s.effective_date).toLocaleDateString('de-DE'),
    }));

  // Calculate stats
  const latestSalary = salaries[0]?.amount || 0;
  const firstSalary = salaries[salaries.length - 1]?.amount || latestSalary;
  const totalGrowth = firstSalary > 0
    ? Math.round(((latestSalary - firstSalary) / firstSalary) * 100)
    : 0;

  const avgSalary = salaries.length > 0
    ? Math.round(salaries.reduce((sum, s) => sum + s.amount, 0) / salaries.length)
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm text-white/60 mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-lg font-bold text-amber-400">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.company && (
            <p className="text-xs text-white/40 mt-1">{payload[0].payload.company}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Gehaltsentwicklung
        </h2>
        {onAddSalary && (
          <button
            onClick={onAddSalary}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Eintrag
          </button>
        )}
      </div>

      {salaries.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Euro className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Gehaltsdaten</p>
          {onAddSalary && (
            <button
              onClick={onAddSalary}
              className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Erstes Gehalt eintragen
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Aktuell</div>
              <div className="text-lg font-bold text-amber-400">
                {formatCurrency(latestSalary)}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Durchschnitt</div>
              <div className="text-lg font-bold">
                {formatCurrency(avgSalary)}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Wachstum</div>
              <div className={`text-lg font-bold ${totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalGrowth >= 0 ? '+' : ''}{totalGrowth}%
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#salaryGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">
              Mindestens 2 Einträge für Chart erforderlich
            </div>
          )}

          {/* Recent entries list */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-3">Letzte Einträge</h3>
            <div className="space-y-2">
              {salaries.slice(0, 5).map((salary, index) => (
                <div
                  key={salary.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-white/30" />
                    <div>
                      <div className="text-sm">{formatCurrency(salary.amount)}</div>
                      <div className="text-xs text-white/40">
                        {new Date(salary.effective_date).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                  {salary.job && (
                    <span className="text-xs text-white/30 truncate max-w-[120px]">
                      {salary.job.company}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
