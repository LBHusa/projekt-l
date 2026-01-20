'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Apple, ExternalLink, ChevronRight } from 'lucide-react';

export default function ShortcutInstructions() {
  const quickSteps = [
    'API-Schlüssel generieren',
    'Shortcuts App öffnen',
    'Health-Daten abfragen',
    'An Projekt L senden',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Apple className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-adaptive">Apple Shortcut einrichten</h3>
          <p className="text-sm text-adaptive-dim">
            Automatischer Datenimport
          </p>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="space-y-2 mb-5">
        {quickSteps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-adaptive-dim">
              {index + 1}
            </div>
            <span className="text-sm text-adaptive-dim">{step}</span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <Link
        href="/shortcuts/health-import"
        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
      >
        Anleitung öffnen
        <ChevronRight className="w-4 h-4" />
      </Link>

      {/* Info Box */}
      <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-200">
          <strong>Tipp:</strong> Die Anleitung führt dich Schritt für Schritt durch die Einrichtung
          und hilft dir, den Shortcut auf deinem iPhone zu konfigurieren.
        </p>
      </div>
    </motion.div>
  );
}
