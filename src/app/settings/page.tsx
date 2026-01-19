'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Bell, Link as LinkIcon, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'Benachrichtigungen',
      description: 'Erinnerungen & Kanäle konfigurieren',
      href: '/settings/notifications',
      icon: Bell,
      color: 'purple',
    },
    {
      title: 'Integrationen',
      description: 'Verbinde externe Dienste mit Projekt L',
      href: '/settings/integrations',
      icon: LinkIcon,
      color: 'blue',
    },
  ];

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
          <h1 className="text-xl font-bold text-adaptive">Einstellungen</h1>
          <p className="text-sm text-adaptive-dim">
            Konfiguriere Projekt L nach deinen Wünschen
          </p>
        </div>
      </header>

      {/* Settings Sections */}
      <div className="space-y-4">
        {settingsSections.map((section, index) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={section.href}
              className="block bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5 hover:border-white/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full bg-${section.color}-500/20 flex items-center justify-center`}
                  >
                    <section.icon className={`w-5 h-5 text-${section.color}-400`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-adaptive mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-adaptive-dim">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-adaptive-dim group-hover:text-adaptive-muted transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
