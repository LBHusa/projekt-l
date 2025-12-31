'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Calendar, PiggyBank } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { calculateCompoundInterest } from '@/lib/data/finanzen';

interface CompoundInterestCalculatorProps {
  initialPrincipal?: number;
  initialMonthly?: number;
  initialRate?: number;
  initialYears?: number;
}

export function CompoundInterestCalculator({
  initialPrincipal = 1000,
  initialMonthly = 100,
  initialRate = 7,
  initialYears = 10,
}: CompoundInterestCalculatorProps) {
  const [principal, setPrincipal] = useState(initialPrincipal);
  const [monthly, setMonthly] = useState(initialMonthly);
  const [rate, setRate] = useState(initialRate);
  const [years, setYears] = useState(initialYears);

  const { chartData, finalAmount, totalContributions, totalInterest } = useMemo(() => {
    const data: { year: number; value: number; contributions: number; interest: number }[] = [];
    let contributions = principal;

    for (let year = 0; year <= years; year++) {
      const months = year * 12;
      const value = calculateCompoundInterest(principal, monthly, rate / 100, 12, months);
      const yearContributions = principal + monthly * months;

      data.push({
        year,
        value: Math.round(value),
        contributions: Math.round(yearContributions),
        interest: Math.round(value - yearContributions),
      });

      contributions = yearContributions;
    }

    const final = data[data.length - 1];
    return {
      chartData: data,
      finalAmount: final.value,
      totalContributions: final.contributions,
      totalInterest: final.interest,
    };
  }, [principal, monthly, rate, years]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-emerald-400" />
        <h2 className="font-semibold">Zinseszins-Rechner</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-white/50 mb-1">Startkapital</label>
          <div className="relative">
            <PiggyBank className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
              min={0}
              step={100}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Monatlich</label>
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
              min={0}
              step={50}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Rendite p.a.</label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
              min={0}
              max={30}
              step={0.5}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Laufzeit</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
              min={1}
              max={50}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">Jahre</span>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(finalAmount)}</p>
          <p className="text-xs text-white/50">Endwert</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalContributions)}</p>
          <p className="text-xs text-white/50">Eingezahlt</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalInterest)}</p>
          <p className="text-xs text-white/50">Zinsen</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(v) => `${v}J`}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              formatter={(value, name) => [
                formatCurrency(value as number),
                name === 'value' ? 'Gesamtwert' : name === 'contributions' ? 'Eingezahlt' : 'Zinsen',
              ]}
              labelFormatter={(label) => `Jahr ${label}`}
            />
            <Area
              type="monotone"
              dataKey="contributions"
              stroke="#3B82F6"
              fill="url(#colorContributions)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10B981"
              fill="url(#colorValue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-white/50">Gesamtwert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-white/50">Eingezahlt</span>
        </div>
      </div>
    </div>
  );
}
