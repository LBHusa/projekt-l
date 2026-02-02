'use client';

// ============================================
// Weekly Report Card Component
// Phase 4: Visuelle Belohnungen
// ============================================

import { Trophy, Eye, Lightbulb, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import type { WeeklyReport } from '@/lib/database.types';

interface WeeklyReportCardProps {
  report: WeeklyReport;
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const startStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' });
  const endStr = end.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps) {
  const weekLabel = formatWeekLabel(report.week_start, report.week_end);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-primary/20 to-purple-600/20 px-6 py-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-foreground">
          Wochen-Rueckblick
        </h2>
        <p className="text-muted-foreground">{weekLabel}</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Top Wins */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-400 mb-4">
            <Trophy className="w-5 h-5" />
            Deine Top 3 Wins
          </h3>
          <ul className="space-y-3">
            {report.top_wins.map((win, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600/20 rounded-full flex items-center justify-center text-yellow-400 text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-foreground">{win}</span>
              </motion.li>
            ))}
          </ul>
        </section>

        {/* Attention Area */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-orange-400 mb-3">
            <Eye className="w-5 h-5" />
            Braucht Aufmerksamkeit
          </h3>
          <p className="text-muted-foreground bg-orange-900/10 border border-orange-900/30 rounded-lg p-4">
            {report.attention_area}
          </p>
        </section>

        {/* Recognized Pattern */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-400 mb-3">
            <Lightbulb className="w-5 h-5" />
            Erkanntes Pattern
          </h3>
          <p className="text-muted-foreground bg-blue-900/10 border border-blue-900/30 rounded-lg p-4">
            {report.recognized_pattern}
          </p>
        </section>

        {/* Recommendation */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-green-400 mb-3">
            <Target className="w-5 h-5" />
            Empfehlung fuer diese Woche
          </h3>
          <p className="text-foreground bg-green-900/10 border border-green-900/30 rounded-lg p-4 font-medium">
            {report.recommendation}
          </p>
        </section>

        {/* Generated timestamp */}
        <div className="text-center pt-4 border-t border-gray-800">
          <p className="text-xs text-muted-foreground">
            Generiert am {new Date(report.generated_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
