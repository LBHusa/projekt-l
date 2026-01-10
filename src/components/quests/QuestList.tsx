'use client'

import { QuestCard } from './QuestCard'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

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

interface QuestListProps {
  quests: Quest[]
  onComplete?: (questId: string) => Promise<void>
  onView?: (questId: string) => void
  emptyMessage?: string
}

export function QuestList({ quests, onComplete, onView, emptyMessage = 'Keine Quests verfügbar' }: QuestListProps) {
  if (quests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 rounded-xl p-12 text-center"
      >
        <Inbox className="w-16 h-16 text-adaptive-muted mx-auto mb-4 opacity-50" />
        <p className="text-adaptive-muted text-lg">{emptyMessage}</p>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {quests.map((quest, index) => (
        <motion.div
          key={quest.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <QuestCard
            quest={quest}
            onComplete={onComplete}
            onView={onView}
          />
        </motion.div>
      ))}
    </div>
  )
}
