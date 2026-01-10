'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Investment } from '@/lib/database.types';

interface PerformanceChartProps {
  investments: Investment[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

export function PerformanceChart({ investments }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');

  // Generate mock historical data (in a real app, this would come from the database)
  const generateMockData = () => {
    const now = new Date();
    const data: { date: string; value: number; displayDate: string }[] = [];

    let months = 12;
    switch (timeRange) {
      case '1M':
        months = 1;
        break;
      case '3M':
        months = 3;
        break;
      case '6M':
        months = 6;
        break;
      case '1Y':
        months = 12;
        break;
      case 'All':
        months = 24;
        break;
    }

    const currentValue = investments.reduce((sum, inv) => {
      const price = inv.current_price || inv.average_cost || 0;
      return sum + (inv.quantity * price);
    }, 0);

    // Generate historical values with some variation
    for (let i = months; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      // Simulate growth with some randomness
      const growthFactor = 1 + ((months - i) / months) * 0.15; // 15% growth over period
      const randomness = 0.9 + Math.random() * 0.2; // ±10% randomness
      const value = currentValue / growthFactor * randomness;

      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value),
        displayDate: date.toLocaleDateString('de-DE', {
          month: months <= 3 ? 'short' : 'short',
          year: months > 12 ? '2-digit' : undefined,
        }),
      });
    }

    return data;
  };

  const chartData = generateMockData();
  const firstValue = chartData[0]?.value || 0;
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const totalChange = lastValue - firstValue;
  const totalChangePercent = firstValue > 0 ? (totalChange / firstValue) * 100 : 0;
  const isPositive = totalChange >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const change = value - firstValue;
      const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

      return (
        <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm text-white/60 mb-1">{payload[0].payload.displayDate}</p>
          <p className="text-lg font-bold text-purple-400">
            {formatCurrency(value)}
          </p>
          <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent.toFixed(2)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (investments.length === 0) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
        <div className="flex items-center justify-center h-64 text-white/40">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Portfolio Performance
          </h3>
          <div className={`flex items-center gap-2 mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span className="text-sm font-semibold">
              {isPositive ? '+' : ''}{formatCurrency(totalChange)}
            </span>
            <span className="text-xs">
              ({totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-white/40">über {timeRange}</span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['1M', '3M', '6M', '1Y', 'All'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="displayDate"
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#A78BFA"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
