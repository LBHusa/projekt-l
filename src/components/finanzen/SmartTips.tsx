'use client';

import { Lightbulb, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { FinanceSmartTip } from '@/lib/database.types';

interface SmartTipsProps {
  tips: FinanceSmartTip[];
}

export function SmartTips({ tips }: SmartTipsProps) {
  if (tips.length === 0) {
    return null;
  }

  const getTypeConfig = (type: FinanceSmartTip['type']) => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/20',
        };
      case 'achievement':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-green-400',
          bg: 'bg-green-500/10 border-green-500/20',
        };
      default:
        return {
          icon: <Lightbulb className="w-5 h-5" />,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10 border-yellow-500/20',
        };
    }
  };

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <h2 className="font-semibold">Smart Tips</h2>
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
          {tips.length}
        </span>
      </div>

      <div className="space-y-3">
        {tips.map((tip) => {
          const config = getTypeConfig(tip.type);

          return (
            <div
              key={tip.id}
              className={`${config.bg} border rounded-lg p-3`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${config.color}`}>{tip.title}</h3>
                  <p className="text-sm text-white/60 mt-1">{tip.description}</p>
                  {tip.action && (
                    <Link
                      href={tip.action.href}
                      className={`inline-flex items-center gap-1 text-sm ${config.color} hover:underline mt-2`}
                    >
                      {tip.action.label}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
