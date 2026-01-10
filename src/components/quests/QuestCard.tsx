'use client'

import { motion } from 'framer-motion'
import { Swords, Trophy, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'

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

interface QuestCardProps {
  quest: Quest
  onComplete?: (questId: string) => Promise<void>
  onView?: (questId: string) => void
}

const DIFFICULTY_COLORS = {
  easy: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  medium: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  hard: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  epic: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
}

const TYPE_ICONS = {
  daily: Clock,
  weekly: Swords,
  story: Trophy,
}

export function QuestCard({ quest, onComplete, onView }: QuestCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const TypeIcon = TYPE_ICONS[quest.type]
  const progressPercent = quest.required_actions > 0
    ? Math.round((quest.completed_actions / quest.required_actions) * 100)
    : 0

  const handleComplete = async () => {
    if (!onComplete || isCompleting) return
    setIsCompleting(true)
    try {
      await onComplete(quest.id)
    } catch (error) {
      console.error('Failed to complete quest:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const isExpired = quest.expires_at && new Date(quest.expires_at) < new Date()
  const isCompleted = quest.status === 'completed'
  const isFailed = quest.status === 'failed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${DIFFICULTY_COLORS[quest.difficulty]} border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer ${
        isCompleted ? 'opacity-60' : ''
      }`}
      onClick={() => onView?.(quest.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${
            quest.difficulty === 'easy' ? 'bg-green-500/30' :
            quest.difficulty === 'medium' ? 'bg-blue-500/30' :
            quest.difficulty === 'hard' ? 'bg-purple-500/30' :
            'bg-orange-500/30'
          } flex items-center justify-center`}>
            <TypeIcon className={`w-5 h-5 ${
              quest.difficulty === 'easy' ? 'text-green-400' :
              quest.difficulty === 'medium' ? 'text-blue-400' :
              quest.difficulty === 'hard' ? 'text-purple-400' :
              'text-orange-400'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-adaptive text-lg">{quest.title}</h3>
              {isCompleted && (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
              {isFailed && (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-adaptive-muted">
              <span className="capitalize">{quest.type}</span>
              <span>•</span>
              <span className="capitalize">{quest.difficulty}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400">
          <Zap className="w-4 h-4" />
          <span className="font-bold">{quest.xp_reward} XP</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-adaptive-muted mb-4 line-clamp-2">
        {quest.description}
      </p>

      {/* Motivation (if available) */}
      {quest.motivation && (
        <div className="mb-4 p-3 bg-white/5 dark:bg-black/20 rounded-lg">
          <p className="text-xs italic text-adaptive-muted">"{quest.motivation}"</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-adaptive-muted mb-2">
          <span>Fortschritt</span>
          <span>{quest.completed_actions} / {quest.required_actions}</span>
        </div>
        <div className="w-full bg-white/10 dark:bg-black/30 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full ${
              quest.difficulty === 'easy' ? 'bg-green-500' :
              quest.difficulty === 'medium' ? 'bg-blue-500' :
              quest.difficulty === 'hard' ? 'bg-purple-500' :
              'bg-orange-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Expiry & Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-adaptive-muted">
          {isExpired && (
            <span className="text-red-400">Abgelaufen</span>
          )}
          {!isExpired && quest.expires_at && (
            <span>
              Endet: {new Date(quest.expires_at).toLocaleDateString('de-DE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
          {isCompleted && quest.completed_at && (
            <span className="text-green-400">
              Abgeschlossen: {new Date(quest.completed_at).toLocaleDateString('de-DE', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>

        {quest.status === 'active' && !isExpired && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleComplete()
            }}
            disabled={isCompleting}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? 'Wird abgeschlossen...' : 'Abschließen'}
          </button>
        )}
      </div>
    </motion.div>
  )
}
