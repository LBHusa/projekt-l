'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Scroll, Sparkles } from 'lucide-react'
import { QuestPreferencesForm } from '@/components/quests/QuestPreferencesForm'

export default function QuestPreferencesPage() {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/quests"
            className="inline-flex items-center gap-2 text-adaptive-muted hover:text-adaptive transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Quests
          </Link>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Scroll className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-adaptive">Quest-Einstellungen</h1>
                <p className="text-adaptive-muted">
                  Konfiguriere wie Quests für dich generiert werden
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-adaptive mb-1">
                AI-generierte Quests
              </h3>
              <p className="text-sm text-adaptive-muted">
                Die Quest-KI berücksichtigt diese Einstellungen, um personalisierte Quests zu erstellen, 
                die auf deine Ziele und Lebensbereiche zugeschnitten sind.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <QuestPreferencesForm />
        </motion.div>
      </div>
    </div>
  )
}
