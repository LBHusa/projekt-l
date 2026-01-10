'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Filter } from 'lucide-react'
import { QuestList, QuestProgress, QuestGenerator } from '@/components/quests'

interface Quest {
  id: string
  type: 'daily' | 'weekly' | 'story'
  status: 'active' | 'completed' | 'failed' | 'archived'
  difficulty: 'easy' | 'medium' | 'hard' | 'epic'
  title: string
  description: string
  motivation?: string
  xp_reward: number
  progress: number
  required_actions: number
  completed_actions: number
  expires_at?: string
  completed_at?: string
}

interface QuestStats {
  active: number
  completed: number
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [stats, setStats] = useState<QuestStats>({ active: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [typeFilter, setTypeFilter] = useState<'all' | 'daily' | 'weekly' | 'story'>('all')

  const loadQuests = async () => {
    try {
      setLoading(true)

      // Fetch quests
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter)
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/quests?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setQuests(data.quests || [])
        setStats(data.stats || { active: 0, completed: 0 })
      } else {
        console.error('Failed to fetch quests:', data.error)
      }

      // Check if AI is configured
      const configResponse = await fetch('/api/quests/generate')
      const configData = await configResponse.json()
      setIsConfigured(configData.configured || false)
    } catch (error) {
      console.error('Error loading quests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuests()
  }, [filter, typeFilter])

  const handleCompleteQuest = async (questId: string) => {
    try {
      const response = await fetch(`/api/quests/${questId}/complete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        await loadQuests()
      } else {
        console.error('Failed to complete quest:', data.error)
        alert(data.error || 'Fehler beim Abschließen der Quest')
      }
    } catch (error) {
      console.error('Error completing quest:', error)
      alert('Fehler beim Abschließen der Quest')
    }
  }

  const filteredQuests = quests.filter((quest) => {
    if (filter !== 'all' && quest.status !== filter) return false
    if (typeFilter !== 'all' && quest.type !== typeFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-adaptive-muted">Lade Quests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-adaptive-muted hover:text-adaptive transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2 text-adaptive">Quest System</h1>
            <p className="text-adaptive-muted">
              Verwalte deine personalisierten Quests und erreiche deine Ziele
            </p>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <QuestProgress stats={stats} />

        {/* Quest Generator */}
        <div className="mb-8">
          <QuestGenerator
            onGenerate={loadQuests}
            isConfigured={isConfigured}
          />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-adaptive-muted" />
              <h3 className="font-semibold text-adaptive">Filter</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-xs text-adaptive-muted mb-2 block">Status</label>
                <div className="flex gap-2">
                  {(['all', 'active', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filter === status
                          ? 'bg-purple-500/30 text-adaptive border border-purple-500/50'
                          : 'bg-white/5 dark:bg-black/20 text-adaptive-muted hover:bg-white/10 dark:hover:bg-black/30'
                      }`}
                    >
                      {status === 'all' ? 'Alle' : status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-xs text-adaptive-muted mb-2 block">Typ</label>
                <div className="flex gap-2">
                  {(['all', 'daily', 'weekly', 'story'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        typeFilter === type
                          ? 'bg-blue-500/30 text-adaptive border border-blue-500/50'
                          : 'bg-white/5 dark:bg-black/20 text-adaptive-muted hover:bg-white/10 dark:hover:bg-black/30'
                      }`}
                    >
                      {type === 'all' ? 'Alle' :
                       type === 'daily' ? 'Täglich' :
                       type === 'weekly' ? 'Wöchentlich' :
                       'Story'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quest List */}
        <QuestList
          quests={filteredQuests}
          onComplete={handleCompleteQuest}
          emptyMessage={
            filter === 'active'
              ? 'Keine aktiven Quests. Generiere neue Quests mit dem AI Generator!'
              : 'Keine Quests gefunden'
          }
        />
      </div>
    </div>
  )
}
