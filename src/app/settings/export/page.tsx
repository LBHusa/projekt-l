'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  Check,
  Loader2,
} from 'lucide-react';

export default function ExportSettingsPage() {
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(format);
    setSuccess(null);

    try {
      // Trigger download by navigating to the export endpoint
      window.location.href = `/api/export?format=${format}`;

      // Show success message after a short delay
      setTimeout(() => {
        setSuccess(`${format.toUpperCase()} Export gestartet!`);
        setExporting(null);
        setTimeout(() => setSuccess(null), 3000);
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/settings"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Daten exportieren</h1>
          <p className="text-sm text-adaptive-dim">
            Exportiere alle deine Projekt L Daten
          </p>
        </div>
      </header>

      {/* Success message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {success}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Export Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-adaptive">Dein Daten-Export</h3>
              <p className="text-sm text-adaptive-dim">
                Lade deine Daten in verschiedenen Formaten herunter
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-adaptive mb-2">Enthaltene Daten:</h4>
            <ul className="text-sm text-adaptive-muted space-y-1">
              <li>- Profil & Einstellungen</li>
              <li>- Skills & Level</li>
              <li>- Domains & Factions</li>
              <li>- Habits & Logs</li>
              <li>- Quests & Fortschritt</li>
              <li>- Achievements</li>
              <li>- Kontakte</li>
              <li>- Finanzen (Konten, Transaktionen, Budgets)</li>
              <li>- Aktivitäts-Log</li>
            </ul>
          </div>

          <p className="text-xs text-adaptive-dim">
            Der Export kann je nach Datenmenge einige Sekunden dauern. Die Datei wird
            automatisch heruntergeladen.
          </p>
        </motion.div>

        {/* Export Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* JSON Export */}
          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5 hover:border-blue-500/50 transition-colors disabled:opacity-50 text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                {exporting === 'json' ? (
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                ) : (
                  <FileJson className="w-6 h-6 text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-adaptive">JSON Export</h3>
                <p className="text-xs text-adaptive-dim">Strukturierte Daten</p>
              </div>
            </div>
            <p className="text-sm text-adaptive-muted">
              Ideal für Backups und Datenübertragung. Enthält alle Daten in
              strukturierter Form.
            </p>
          </button>

          {/* CSV Export */}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5 hover:border-green-500/50 transition-colors disabled:opacity-50 text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                {exporting === 'csv' ? (
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6 text-green-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-adaptive">CSV Export</h3>
                <p className="text-xs text-adaptive-dim">Tabellenformat</p>
              </div>
            </div>
            <p className="text-sm text-adaptive-muted">
              Ideal für Excel/Sheets. Daten in mehreren CSV-Dateien als ZIP.
            </p>
          </button>
        </motion.div>

        {/* Privacy Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <p className="text-sm text-amber-400">
            <strong>Hinweis:</strong> Deine exportierten Daten enthalten persönliche
            Informationen. Bewahre sie sicher auf und teile sie nicht mit Dritten.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
