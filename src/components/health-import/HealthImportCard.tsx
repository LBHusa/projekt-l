'use client';

import { motion } from 'framer-motion';
import { Activity, Clock, Zap, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HealthImportCardProps {
  userId?: string;
}

interface SyncStatus {
  isConnected: boolean;
  lastSync: string | null;
  totalDataPoints: number;
  totalXpEarned: number;
  sleepDataCount: number;
  activityDataCount: number;
}

export default function HealthImportCard({ userId }: HealthImportCardProps) {
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: null,
    totalDataPoints: 0,
    totalXpEarned: 0,
    sleepDataCount: 0,
    activityDataCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  async function loadSyncStatus() {
    try {
      const response = await fetch('/api/integrations/health-import/status');
      const data = await response.json();

      if (data.success && data.status) {
        setStatus({
          isConnected: data.status.hasApiKey,
          lastSync: data.status.lastSync,
          totalDataPoints: data.status.totalItemsImported || 0,
          totalXpEarned: data.status.totalXpEarned || 0,
          sleepDataCount: data.status.sleepDataCount || 0,
          activityDataCount: data.status.totalImports || 0,
        });
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
      // Keep default values on error
    } finally {
      setIsLoading(false);
    }
  }

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Nie';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)} Std.`;
    return `vor ${Math.floor(diffMins / 1440)} Tag(en)`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-adaptive">Apple Health Sync</h3>
            <p className="text-sm text-adaptive-dim">
              Automatischer Datenimport via Shortcut
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.isConnected ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-adaptive-dim" />
          )}
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Last Sync */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-adaptive-muted" />
            <span className="text-xs text-adaptive-muted">Letzter Sync</span>
          </div>
          <p className="text-sm font-medium text-adaptive">
            {formatLastSync(status.lastSync)}
          </p>
        </div>

        {/* Total XP */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-adaptive-muted">Gesamt XP</span>
          </div>
          <p className="text-sm font-medium text-adaptive">
            {status.totalXpEarned.toLocaleString()} XP
          </p>
        </div>

        {/* Sleep Data */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-adaptive-muted">Schlaf-Daten</span>
          </div>
          <p className="text-sm font-medium text-adaptive">
            {status.sleepDataCount} Einträge
          </p>
        </div>

        {/* Activity Data */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-adaptive-muted">Aktivitäten</span>
          </div>
          <p className="text-sm font-medium text-adaptive">
            {status.activityDataCount} Einträge
          </p>
        </div>
      </div>

      {/* Connection Status */}
      {!status.isConnected && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-sm text-adaptive-dim">
            Noch nicht verbunden. Konfiguriere deinen API-Schlüssel und Apple Shortcut unten.
          </p>
        </div>
      )}

      {status.isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
          <CheckCircle className="w-4 h-4" />
          Sync aktiv - Daten werden automatisch importiert
        </div>
      )}
    </motion.div>
  );
}
