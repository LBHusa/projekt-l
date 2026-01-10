'use client'

import { motion } from 'framer-motion'
import { Target, CheckCircle, TrendingUp, Zap } from 'lucide-react'

interface QuestProgressProps {
  stats: {
    active: number
    completed: number
  }
  totalXpEarned?: number
}

export function QuestProgress({ stats, totalXpEarned = 0 }: QuestProgressProps) {
  const completionRate = stats.active + stats.completed > 0
    ? Math.round((stats.completed / (stats.active + stats.completed)) * 100)
    : 0

  const statCards = [
    {
      icon: Target,
      label: 'Aktive Quests',
      value: stats.active,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/30',
    },
    {
      icon: CheckCircle,
      label: 'Abgeschlossen',
      value: stats.completed,
      color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/30',
    },
    {
      icon: TrendingUp,
      label: 'Erfolgsrate',
      value: `${completionRate}%`,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/30',
    },
    {
      icon: Zap,
      label: 'Gesamt XP',
      value: totalXpEarned,
      color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      iconColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/30',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-r ${card.color} border rounded-xl p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-adaptive-muted mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-adaptive">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
