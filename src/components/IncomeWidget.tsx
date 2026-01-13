'use client';

import { useEffect, useState } from 'react';
import { getTotalMonthlyIncome } from '@/lib/data/career';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function IncomeWidget() {
  const [income, setIncome] = useState<{ total: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIncome() {
      try {
        const data = await getTotalMonthlyIncome();
        setIncome(data);
      } catch (err) {
        console.error('Error loading income:', err);
      } finally {
        setLoading(false);
      }
    }
    loadIncome();
  }, []);

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded" />
      </Card>
    );
  }

  if (!income || income.total === 0) {
    return null; // Verstecke Widget wenn kein Einkommen eingetragen
  }

  return (
    <Link href="/career/sources">
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">Monatliches Einkommen</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(income.total, income.currency)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
