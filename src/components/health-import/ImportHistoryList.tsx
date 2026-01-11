'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  Activity,
  Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImportLog {
  id: string;
  source: string;
  type: string;
  itemsImported: number;
  itemsSkipped: number;
  xpAwarded: number;
  completedAt: string;
  error: string | null;
}

interface ImportHistoryListProps {
  userId?: string;
}

export default function ImportHistoryList({ userId }: ImportHistoryListProps) {
  const [imports, setImports] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadImportHistory();
  }, []);

  async function loadImportHistory() {
    try {
      const response = await fetch('/api/integrations/health-import/status');
      const data = await response.json();

      if (data.success && data.status?.recentImports) {
        setImports(data.status.recentImports);
      }
    } catch (error) {
      console.error('Error loading import history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sleep':
        return <Moon className="w-4 h-4" />;
      case 'workout':
        return <Activity className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'apple_health':
        return 'Apple Health';
      case 'ios_shortcut':
        return 'iOS Shortcut';
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <History className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Import-Historie</h3>
            <p className="text-sm text-[var(--foreground-muted)]">Wird geladen...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--background-tertiary)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <History className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Import-Historie</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            {imports.length > 0 ? `${imports.length} Import(s)` : 'Noch keine Imports'}
          </p>
        </div>
      </div>

      {/* Import List */}
      {imports.length === 0 ? (
        <div className="text-center py-8 text-[var(--foreground-muted)]">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Health-Daten importiert.</p>
          <p className="text-sm mt-1">
            Verwende den iOS Shortcut, um Daten zu synchronisieren.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {imports.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-[var(--orb-border)] rounded-lg overflow-hidden"
              >
                {/* Summary Row */}
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--background-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${log.error ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                      {log.error ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[var(--foreground)]">
                        {getSourceLabel(log.source)}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {formatDate(log.completedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-[var(--foreground)]">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>+{log.xpAwarded} XP</span>
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {log.itemsImported} importiert
                      </p>
                    </div>
                    {expandedId === log.id ? (
                      <ChevronUp className="w-4 h-4 text-[var(--foreground-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedId === log.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[var(--orb-border)] px-4 py-3 bg-[var(--background-tertiary)]"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--foreground-muted)]">Typ</p>
                          <div className="flex items-center gap-1 text-[var(--foreground)]">
                            {getTypeIcon(log.type)}
                            <span className="capitalize">{log.type}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[var(--foreground-muted)]">Importiert</p>
                          <p className="text-[var(--foreground)]">{log.itemsImported} Einträge</p>
                        </div>
                        <div>
                          <p className="text-[var(--foreground-muted)]">Übersprungen</p>
                          <p className="text-[var(--foreground)]">{log.itemsSkipped} Duplikate</p>
                        </div>
                        <div>
                          <p className="text-[var(--foreground-muted)]">XP erhalten</p>
                          <p className="text-green-400 font-medium">+{log.xpAwarded} XP</p>
                        </div>
                      </div>
                      {log.error && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-red-400">{log.error}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
