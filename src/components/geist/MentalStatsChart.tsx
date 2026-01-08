'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import type { MentalStatsChartData } from '@/lib/database.types';

interface MentalStatsChartProps {
  data: MentalStatsChartData[];
}

type TimeRange = '7d' | '30d' | '90d';
type MetricKey = 'mood' | 'energy' | 'stress' | 'focus';

const METRIC_CONFIG: Record<
  MetricKey,
  { label: string; color: string; icon: string }
> = {
  mood: { label: 'Stimmung', color: '#8B5CF6', icon: '😊' },
  energy: { label: 'Energie', color: '#F59E0B', icon: '⚡' },
  stress: { label: 'Stress', color: '#EF4444', icon: '😰' },
  focus: { label: 'Fokus', color: '#3B82F6', icon: '🎯' },
};

export default function MentalStatsChart({ data }: MentalStatsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<MetricKey>>(
    new Set()
  );

  // Filter data by time range
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const filteredData = data.slice(-days);

  const toggleMetric = (metric: MetricKey) => {
    setHiddenMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm text-white/60 mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>
                {METRIC_CONFIG[entry.dataKey as MetricKey].label}:
              </span>
              <span className="font-bold">{entry.value}/5</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Mentale Stats Verlauf
        </h2>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-purple-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Toggle Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggleMetric(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              hiddenMetrics.has(key)
                ? 'bg-white/5 text-white/30'
                : 'bg-white/10 text-white'
            }`}
          >
            <span>{METRIC_CONFIG[key].icon}</span>
            <span>{METRIC_CONFIG[key].label}</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: hiddenMetrics.has(key)
                  ? '#666'
                  : METRIC_CONFIG[key].color,
              }}
            />
          </button>
        ))}
      </div>

      {/* Chart */}
      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {!hiddenMetrics.has('mood') && (
              <Line
                type="monotone"
                dataKey="mood"
                stroke={METRIC_CONFIG.mood.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {!hiddenMetrics.has('energy') && (
              <Line
                type="monotone"
                dataKey="energy"
                stroke={METRIC_CONFIG.energy.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {!hiddenMetrics.has('stress') && (
              <Line
                type="monotone"
                dataKey="stress"
                stroke={METRIC_CONFIG.stress.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {!hiddenMetrics.has('focus') && (
              <Line
                type="monotone"
                dataKey="focus"
                stroke={METRIC_CONFIG.focus.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-white/40">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Daten vorhanden</p>
          <p className="text-sm mt-1">Tracke deine mentalen Stats!</p>
        </div>
      )}
    </motion.div>
  );
}
