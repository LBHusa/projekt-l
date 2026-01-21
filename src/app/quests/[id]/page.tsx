'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Swords, 
  Trophy, 
  Clock, 
  Zap, 
  CheckCircle2, 
  XCircle,
  Target,
  Sparkles,
  Calendar
} from 'lucide-react'

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
  created_at: string
  target_skill_ids?: string[]
  target_faction_ids?: string[]
  related_skills?: { id: string; name: string; icon: string }[]
  related_factions?: { id: string; name_de: string; icon: string; color: string }[]
}

const DIFFICULTY_CONFIG = {
  easy: { 
    label: 'Einfach',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    bg: 'bg-green-500/30',
  },
  medium: { 
    label: 'Mittel',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    bg: 'bg-blue-500/30',
  },
  hard: { 
    label: 'Schwer',
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    bg: 'bg-purple-500/30',
  },
  epic: { 
    label: 'Episch',
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    bg: 'bg-orange-500/30',
  },
}

const TYPE_CONFIG = {
  daily: { label: 'Tägliche Quest', icon: Clock },
  weekly: { label: 'Wöchentliche Quest', icon: Swords },
  story: { label: 'Story Quest', icon: Trophy },
}

export default function QuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [quest, setQuest] = useState<Quest | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuest()
  }, [resolvedParams.id])

  const loadQuest = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/quests/${resolvedParams.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Quest nicht gefunden')
      }

      setQuest(data.quest)
    } catch (err) {
      console.error('Error loading quest:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!quest || isCompleting) return

    try {
      setIsCompleting(true)
      const response = await fetch(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abschließen')
      }

      // Reload quest to show updated status
      await loadQuest()
    } catch (err) {
      console.error('Error completing quest:', err)
      alert(err instanceof Error ? err.message : 'Fehler beim Abschließen der Quest')
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-adaptive-muted">Lade Quest...</p>
        </div>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/quests" className="inline-flex items-center gap-2 text-adaptive-muted hover:text-adaptive transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Quests
          </Link>
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Quest nicht gefunden</h1>
            <p className="text-adaptive-muted">{error || 'Diese Quest existiert nicht oder wurde gelöscht.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const config = DIFFICULTY_CONFIG[quest.difficulty]
  const typeConfig = TYPE_CONFIG[quest.type]
  const TypeIcon = typeConfig.icon
  const progressPercent = quest.required_actions > 0
    ? Math.round((quest.completed_actions / quest.required_actions) * 100)
    : 0
  const isExpired = quest.expires_at && new Date(quest.expires_at) < new Date()
  const isCompleted = quest.status === 'completed'
  const isFailed = quest.status === 'failed'

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link href="/quests" className="inline-flex items-center gap-2 text-adaptive-muted hover:text-adaptive transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Quests
        </Link>

        {/* Main Quest Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${config.gradient} border ${config.border} rounded-2xl p-8 mb-6 ${isCompleted ? 'opacity-75' : ''}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${config.bg} flex items-center justify-center`}>
                <TypeIcon className={`w-7 h-7 ${config.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-adaptive">{quest.title}</h1>
                  {isCompleted && <CheckCircle2 className="w-6 h-6 text-green-400" />}
                  {isFailed && <XCircle className="w-6 h-6 text-red-400" />}
                </div>
                <div className="flex items-center gap-3 text-sm text-adaptive-muted mt-1">
                  <span>{typeConfig.label}</span>
                  <span>•</span>
                  <span className={config.text}>{config.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-400 text-lg">{quest.xp_reward} XP</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-adaptive text-lg leading-relaxed">{quest.description}</p>
          </div>

          {/* Motivation */}
          {quest.motivation && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 p-4 bg-white/5 dark:bg-black/20 rounded-xl border border-white/10"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                <p className="text-adaptive-muted italic">"{quest.motivation}"</p>
              </div>
            </motion.div>
          )}

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-adaptive-muted mb-3">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Fortschritt
              </span>
              <span className="font-medium">{quest.completed_actions} / {quest.required_actions} Aktionen</span>
            </div>
            <div className="w-full bg-white/10 dark:bg-black/30 rounded-full h-3 overflow-hidden">
              <motion.div
                className={`h-full ${
                  quest.difficulty === 'easy' ? 'bg-green-500' :
                  quest.difficulty === 'medium' ? 'bg-blue-500' :
                  quest.difficulty === 'hard' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-right text-sm text-adaptive-muted mt-1">{progressPercent}% abgeschlossen</p>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 text-adaptive-muted">
              <Calendar className="w-4 h-4" />
              Erstellt: {new Date(quest.created_at).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            {quest.expires_at && !isCompleted && (
              <div className={`flex items-center gap-2 ${isExpired ? 'text-red-400' : 'text-adaptive-muted'}`}>
                <Clock className="w-4 h-4" />
                {isExpired ? 'Abgelaufen' : 'Endet:'} {new Date(quest.expires_at).toLocaleDateString('de-DE', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
            {isCompleted && quest.completed_at && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Abgeschlossen: {new Date(quest.completed_at).toLocaleDateString('de-DE', {
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>

          {/* Action Button */}
          {quest.status === 'active' && !isExpired && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Wird abgeschlossen...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Quest abschließen
                </span>
              )}
            </motion.button>
          )}

          {isCompleted && (
            <div className="w-full py-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center">
              <span className="flex items-center justify-center gap-2 text-green-400 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" />
                Quest abgeschlossen!
              </span>
            </div>
          )}

          {isExpired && !isCompleted && (
            <div className="w-full py-4 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
              <span className="flex items-center justify-center gap-2 text-red-400 font-bold">
                <XCircle className="w-5 h-5" />
                Quest abgelaufen
              </span>
            </div>
          )}
        </motion.div>

        {/* Related Skills & Factions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Related Skills */}
          {quest.related_skills && quest.related_skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6"
            >
              <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Verknüpfte Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {quest.related_skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm"
                  >
                    {skill.icon} {skill.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Related Factions */}
          {quest.related_factions && quest.related_factions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6"
            >
              <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-purple-400" />
                Verknüpfte Lebensbereiche
              </h3>
              <div className="flex flex-wrap gap-2">
                {quest.related_factions.map((faction) => (
                  <span
                    key={faction.id}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{
                      backgroundColor: faction.color + '30',
                      borderColor: faction.color + '50',
                      borderWidth: '1px',
                    }}
                  >
                    {faction.icon} {faction.name_de}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
