'use client'

import { motion } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, Clock, Swords, Trophy } from 'lucide-react'
import { useState } from 'react'

interface QuestGeneratorProps {
  onGenerate?: () => Promise<void>
  isConfigured?: boolean
}

type QuestType = 'daily' | 'weekly' | 'story'

export function QuestGenerator({ onGenerate, isConfigured = true }: QuestGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState<QuestType>('daily')
  const [count, setCount] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const questTypes = [
    { value: 'daily' as QuestType, label: 'Täglich', icon: Clock, description: 'Tägliche Herausforderungen' },
    { value: 'weekly' as QuestType, label: 'Wöchentlich', icon: Swords, description: 'Größere Wochenziele' },
    { value: 'story' as QuestType, label: 'Story', icon: Trophy, description: 'Epische Story-Quest' },
  ]

  const handleGenerate = async () => {
    if (!isConfigured) {
      setError('AI Quest Generation ist nicht konfiguriert. Bitte ANTHROPIC_API_KEY hinzufügen.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questType: selectedType,
          count,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quests')
      }

      if (onGenerate) {
        await onGenerate()
      }
    } catch (err) {
      console.error('Quest generation error:', err)
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isConfigured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-adaptive mb-2">AI Quest Generation nicht konfiguriert</h3>
            <p className="text-sm text-adaptive-muted mb-4">
              Um AI-generierte Quests zu nutzen, muss <code className="px-2 py-1 bg-black/20 rounded">ANTHROPIC_API_KEY</code> in den Umgebungsvariablen gesetzt sein.
            </p>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-400 hover:text-orange-300 underline"
            >
              API Key bei Anthropic erstellen →
            </a>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-adaptive text-lg">AI Quest Generator</h3>
          <p className="text-xs text-adaptive-muted">Erstelle personalisierte Quests mit KI</p>
        </div>
      </div>

      {/* Quest Type Selection */}
      <div className="mb-6">
        <label className="text-sm text-adaptive-muted mb-3 block">Quest-Typ</label>
        <div className="grid grid-cols-3 gap-3">
          {questTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-4 rounded-lg border transition-all ${
                  selectedType === type.value
                    ? 'bg-purple-500/30 border-purple-500/50'
                    : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5 hover:bg-white/10 dark:hover:bg-black/30'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  selectedType === type.value ? 'text-purple-400' : 'text-adaptive-muted'
                }`} />
                <p className={`text-xs font-medium ${
                  selectedType === type.value ? 'text-adaptive' : 'text-adaptive-muted'
                }`}>
                  {type.label}
                </p>
                <p className="text-xs text-adaptive-muted mt-1">{type.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Count Selection (nur für daily/weekly) */}
      {selectedType !== 'story' && (
        <div className="mb-6">
          <label className="text-sm text-adaptive-muted mb-2 block">
            Anzahl Quests (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            className="w-full px-4 py-2 bg-white/10 dark:bg-black/30 border border-white/10 dark:border-white/5 rounded-lg text-adaptive focus:outline-none focus:border-purple-500/50"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generiere Quests...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>
              {selectedType === 'story'
                ? 'Story Quest generieren'
                : `${count} ${selectedType === 'daily' ? 'Daily' : 'Weekly'} Quest${count > 1 ? 's' : ''} generieren`
              }
            </span>
          </>
        )}
      </button>

      <p className="text-xs text-adaptive-muted mt-4 text-center">
        Powered by Claude AI • Basierend auf deinen Skills und Factions
      </p>
    </motion.div>
  )
}
