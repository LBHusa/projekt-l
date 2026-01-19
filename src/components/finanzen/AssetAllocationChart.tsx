'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Investment, AssetType } from '@/lib/database.types';

interface AssetAllocationChartProps {
  investments: Investment[];
}

const ASSET_TYPE_COLORS: Record<AssetType | 'other', string> = {
  stock: '#3B82F6',      // blue
  etf: '#10B981',        // green
  crypto: '#F59E0B',     // amber
  bond: '#8B5CF6',       // violet
  fund: '#EC4899',       // pink
  commodity: '#F97316',  // orange
  other: '#6B7280',      // gray
};

const ASSET_TYPE_LABELS: Record<AssetType | 'other', string> = {
  stock: 'Aktien',
  etf: 'ETFs',
  crypto: 'Krypto',
  bond: 'Anleihen',
  fund: 'Fonds',
  commodity: 'Rohstoffe',
  other: 'Sonstiges',
};

export function AssetAllocationChart({ investments }: AssetAllocationChartProps) {
  // Calculate allocation by asset type
  const allocationMap = new Map<AssetType | 'other', number>();

  investments.forEach(inv => {
    const type = inv.asset_type || 'other';
    const currentPrice = inv.current_price || inv.average_cost || 0;
    const value = inv.quantity * currentPrice;
    allocationMap.set(type, (allocationMap.get(type) || 0) + value);
  });

  const chartData = Array.from(allocationMap.entries()).map(([type, value]) => ({
    name: ASSET_TYPE_LABELS[type],
    value: Math.round(value * 100) / 100,
    type,
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = totalValue > 0 ? (data.value / totalValue) * 100 : 0;

      return (
        <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white mb-1">{data.name}</p>
          <p className="text-lg font-bold text-purple-400">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-adaptive-muted mt-1">
            {percent.toFixed(1)}% des Portfolios
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for < 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (investments.length === 0) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
        <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
        <div className="flex items-center justify-center h-64 text-adaptive-dim">
          Keine Investments vorhanden
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
      <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={ASSET_TYPE_COLORS[entry.type as AssetType | 'other']}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-adaptive">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-3">
          {chartData.map((item) => {
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            return (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ASSET_TYPE_COLORS[item.type as AssetType | 'other'] }}
                />
                <div className="flex-1">
                  <p className="text-xs text-adaptive-dim">{item.name}</p>
                  <p className="text-sm font-semibold text-adaptive">{percent.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
