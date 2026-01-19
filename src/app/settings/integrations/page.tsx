'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HealthImportCard from '@/components/health-import/HealthImportCard';
import ApiKeyDisplay from '@/components/health-import/ApiKeyDisplay';
import ShortcutInstructions from '@/components/health-import/ShortcutInstructions';
import ImportHistoryList from '@/components/health-import/ImportHistoryList';

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Integrationen</h1>
          <p className="text-sm text-adaptive-dim">
            Verbinde externe Dienste mit Projekt L
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6">
        {/* Apple Health Integration Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-adaptive px-2">
            Apple Health
          </h2>

          {/* Status Card */}
          <HealthImportCard />

          {/* API Key */}
          <ApiKeyDisplay />

          {/* Instructions */}
          <ShortcutInstructions />

          {/* Import History */}
          <ImportHistoryList />
        </div>

        {/* Future Integrations Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <p className="text-sm text-adaptive-dim text-center">
            Weitere Integrationen folgen bald...
          </p>
        </motion.div>
      </div>
    </div>
  );
}
