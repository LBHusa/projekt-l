'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Target, Sparkles, Swords, Zap, AlertCircle } from 'lucide-react'

interface Faction {
  id: string
  name: string
  name_de: string
  icon: string
  color: string
}

interface Skill {
  skill_id: string
  skill_name: string
  skill_icon: string
  domain_name: string
}

interface QuestPreferences {
  preferred_difficulty: string
  daily_quest_count: number
  weekly_quest_count: number
  enable_story_quests: boolean
  prefer_balanced_quests: boolean
  challenge_level: number
  focus_faction_ids: string[]
  focus_skill_ids: string[]
}

interface QuestPreferencesFormProps {
  onSave?: () => void
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach', color: 'text-green-400', bg: 'bg-green-500/20' },
  { value: 'medium', label: 'Mittel', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { value: 'hard', label: 'Schwer', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { value: 'epic', label: 'Episch', color: 'text-orange-400', bg: 'bg-orange-500/20' },
]

export function QuestPreferencesForm({ onSave }: QuestPreferencesFormProps) {
  const [preferences, setPreferences] = useState<QuestPreferences>({
    preferred_difficulty: 'medium',
    daily_quest_count: 3,
    weekly_quest_count: 2,
    enable_story_quests: true,
    prefer_balanced_quests: true,
    challenge_level: 5,
    focus_faction_ids: [],
    focus_skill_ids: [],
  })
  const [factions, setFactions] = useState<Faction[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/settings/quest-preferences')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }

      setPreferences(data.preferences)
      setFactions(data.factions || [])
      setSkills(data.skills || [])
    } catch (err) {
      console.error('Error loading preferences:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/settings/quest-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      setSuccessMessage(data.message || 'Einstellungen gespeichert!')
      setTimeout(() => setSuccessMessage(null), 3000)
      onSave?.()
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const toggleFaction = (factionId: string) => {
    setPreferences((prev) => ({
      ...prev,
      focus_faction_ids: prev.focus_faction_ids.includes(factionId)
        ? prev.focus_faction_ids.filter((id) => id !== factionId)
        : [...prev.focus_faction_ids, factionId],
    }))
  }

  const toggleSkill = (skillId: string) => {
    setPreferences((prev) => ({
      ...prev,
      focus_skill_ids: prev.focus_skill_ids.includes(skillId)
        ? prev.focus_skill_ids.filter((id) => id !== skillId)
        : [...prev.focus_skill_ids, skillId],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <Sparkles className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{successMessage}</span>
        </motion.div>
      )}

      {/* Difficulty Preference */}
      <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Bevorzugte Schwierigkeit
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPreferences((p) => ({ ...p, preferred_difficulty: option.value }))}
              className={`px-4 py-3 rounded-lg transition-all ${
                preferences.preferred_difficulty === option.value
                  ? `${option.bg} border-2 border-current ${option.color}`
                  : 'bg-white/5 dark:bg-black/20 text-adaptive-muted hover:bg-white/10'
              }`}
            >
              <span className={preferences.preferred_difficulty === option.value ? option.color : ''}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Challenge Level */}
      <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Herausforderungs-Level
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-adaptive-muted">Entspannt</span>
          <input
            type="range"
            min="1"
            max="10"
            value={preferences.challenge_level}
            onChange={(e) => setPreferences((p) => ({ ...p, challenge_level: parseInt(e.target.value) }))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-adaptive-muted">Intensiv</span>
          <span className="text-purple-400 font-bold w-8 text-center">{preferences.challenge_level}</span>
        </div>
      </div>

      {/* Quest Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
          <label className="text-sm text-adaptive-muted mb-2 block">Tägliche Quests</label>
          <input
            type="number"
            min="1"
            max="10"
            value={preferences.daily_quest_count}
            onChange={(e) => setPreferences((p) => ({ ...p, daily_quest_count: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-2 bg-white/5 dark:bg-black/20 border border-white/10 rounded-lg text-adaptive"
          />
        </div>
        <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
          <label className="text-sm text-adaptive-muted mb-2 block">Wöchentliche Quests</label>
          <input
            type="number"
            min="1"
            max="10"
            value={preferences.weekly_quest_count}
            onChange={(e) => setPreferences((p) => ({ ...p, weekly_quest_count: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-2 bg-white/5 dark:bg-black/20 border border-white/10 rounded-lg text-adaptive"
          />
        </div>
        <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
          <label className="text-sm text-adaptive-muted mb-2 block">Story Quests</label>
          <button
            onClick={() => setPreferences((p) => ({ ...p, enable_story_quests: !p.enable_story_quests }))}
            className={`w-full px-4 py-2 rounded-lg transition-all ${
              preferences.enable_story_quests
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            {preferences.enable_story_quests ? 'Aktiviert' : 'Deaktiviert'}
          </button>
        </div>
      </div>

      {/* Focus Factions */}
      <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
          <Swords className="w-5 h-5 text-purple-400" />
          Fokus-Lebensbereiche
        </h3>
        <p className="text-sm text-adaptive-muted mb-4">
          Wähle Lebensbereiche aus, auf die sich die generierten Quests konzentrieren sollen.
        </p>
        <div className="flex flex-wrap gap-2">
          {factions.map((faction) => (
            <button
              key={faction.id}
              onClick={() => toggleFaction(faction.id)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                preferences.focus_faction_ids.includes(faction.id)
                  ? 'ring-2 ring-offset-2 ring-offset-transparent'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: faction.color + '30',
                borderColor: faction.color + '50',
                borderWidth: '1px',
                ...(preferences.focus_faction_ids.includes(faction.id) ? { ringColor: faction.color } : {}),
              }}
            >
              {faction.icon} {faction.name_de}
            </button>
          ))}
        </div>
        {preferences.focus_faction_ids.length === 0 && (
          <p className="text-xs text-adaptive-muted mt-2 italic">
            Keine Auswahl = Alle Bereiche gleichmäßig berücksichtigen
          </p>
        )}
      </div>

      {/* Focus Skills */}
      {skills.length > 0 && (
        <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold text-adaptive mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Fokus-Skills
          </h3>
          <p className="text-sm text-adaptive-muted mb-4">
            Wähle Skills aus, die du besonders trainieren möchtest.
          </p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {skills.map((skill) => (
              <button
                key={skill.skill_id}
                onClick={() => toggleSkill(skill.skill_id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  preferences.focus_skill_ids.includes(skill.skill_id)
                    ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                    : 'bg-white/5 dark:bg-black/20 text-adaptive-muted hover:bg-white/10'
                }`}
              >
                {skill.skill_icon || '⭐'} {skill.skill_name}
              </button>
            ))}
          </div>
          {preferences.focus_skill_ids.length === 0 && (
            <p className="text-xs text-adaptive-muted mt-2 italic">
              Keine Auswahl = Alle Skills berücksichtigen
            </p>
          )}
        </div>
      )}

      {/* Balanced Quests */}
      <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-adaptive">Ausgewogene Quests</h3>
            <p className="text-sm text-adaptive-muted">
              Quests über verschiedene Lebensbereiche verteilen
            </p>
          </div>
          <button
            onClick={() => setPreferences((p) => ({ ...p, prefer_balanced_quests: !p.prefer_balanced_quests }))}
            className={`relative w-14 h-7 rounded-full transition-all ${
              preferences.prefer_balanced_quests
                ? 'bg-green-500'
                : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                preferences.prefer_balanced_quests ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Speichern...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Einstellungen speichern
          </>
        )}
      </motion.button>
    </div>
  )
}
