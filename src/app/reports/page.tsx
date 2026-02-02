'use client';

// ============================================
// Reports Page
// Phase 4: Visuelle Belohnungen
// ============================================

import { useState, useEffect } from 'react';
import { FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { WeeklyReportCard } from '@/components/reports/WeeklyReportCard';
import type { WeeklyReport } from '@/lib/database.types';

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const startStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const endStr = end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch('/api/user/reports');
        const data = await response.json();
        setReports(data.reports || []);

        // Auto-select latest report
        if (data.reports?.length > 0) {
          setSelectedReport(data.reports[0]);
        }
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  // Mark report as read when selected
  useEffect(() => {
    if (selectedReport && !selectedReport.read_at) {
      fetch('/api/user/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: selectedReport.id }),
      });

      // Update local state
      setReports(prev => prev.map(r =>
        r.id === selectedReport.id
          ? { ...r, read_at: new Date().toISOString() }
          : r
      ));
    }
  }, [selectedReport]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Wochen-Rueckblicke</h1>
        </div>
        <div className="text-center py-16 bg-gray-900 rounded-xl">
          <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Noch keine Rueckblicke
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Dein erster Wochen-Rueckblick wird am naechsten Sonntag generiert.
            Bleib aktiv, damit der Buddy genug Daten hat!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Wochen-Rueckblicke</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-1 space-y-2">
          {reports.map(report => {
            const weekLabel = formatWeekLabel(report.week_start, report.week_end);
            const isSelected = selectedReport?.id === report.id;
            const isUnread = !report.read_at;

            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`
                  w-full p-4 rounded-lg text-left transition-all
                  ${isSelected
                    ? 'bg-accent-primary/20 border-2 border-accent-primary'
                    : 'bg-gray-900 border-2 border-transparent hover:border-gray-700'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 bg-accent-primary rounded-full" />
                      )}
                      {weekLabel}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {report.top_wins[0]}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${
                    isSelected ? 'rotate-90' : ''
                  }`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Report */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <WeeklyReportCard report={selectedReport} />
          ) : (
            <div className="bg-gray-900 rounded-xl p-8 text-center text-muted-foreground">
              Waehle einen Rueckblick aus der Liste
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
