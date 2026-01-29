'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Rocket, Zap, Calendar, Edit2, Loader2, Check, X } from 'lucide-react';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type {
  AIAnalysisResult,
  AIGeneratedSkill,
  AIGeneratedHabit,
  ProfileData,
  FactionRating,
} from '@/lib/onboarding/types';

interface CharacterPortraitStepProps {
  aiAnalysis: AIAnalysisResult | null;
  skills: AIGeneratedSkill[];
  habits: AIGeneratedHabit[];
  profile: ProfileData;
  factionRatings: FactionRating[];
  onComplete: () => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  onUpdateDescription?: (description: string) => void;
  isSubmitting: boolean;
}

// Character class icons/emojis
const CHARACTER_ICONS: Record<string, string> = {
  'Händler': '💼',
  'Gelehrter': '📚',
  'Diplomat': '🤝',
  'Mönch': '🧘',
  'Abenteurer': '🗺️',
  'Krieger': '⚔️',
  'Weiser': '🦉',
  'Künstler': '🎨',
  'Erfinder': '💡',
  'Barde': '🎭',
  'Alchemist': '⚗️',
  'Gildemeister': '🏛️',
  'Orakel': '🔮',
  'Gladiator': '🏆',
  'Ranger': '🏹',
  'Mentor': '👨‍🏫',
  'Sammler': '💎',
  'Heilerin': '💚',
};

export default function CharacterPortraitStep({
  aiAnalysis,
  skills,
  habits,
  profile,
  factionRatings,
  onComplete,
  onBack,
  onGoToStep,
  onUpdateDescription,
  isSubmitting,
}: CharacterPortraitStepProps) {
  // State for editing description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(
    aiAnalysis?.characterDescription || 'Ein Abenteurer auf dem Weg der Selbstverbesserung.'
  );

  // Calculate stats
  const acceptedSkills = skills.filter(s => s.accepted);
  const acceptedHabits = habits.filter(h => h.accepted);

  // Calculate total level preview
  const averageLevel = useMemo(() => {
    if (!aiAnalysis?.factionLevels) return 10;
    const levels = Object.values(aiAnalysis.factionLevels);
    return Math.round(levels.reduce((sum, l) => sum + l, 0) / levels.length);
  }, [aiAnalysis]);

  // Get top factions
  const topFactions = useMemo(() => {
    return [...factionRatings]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(r => FACTIONS.find(f => f.id === r.factionId)!);
  }, [factionRatings]);

  const characterClass = aiAnalysis?.characterClass || 'Abenteurer';
  const characterDescription = aiAnalysis?.characterDescription || 'Ein Abenteurer auf dem Weg der Selbstverbesserung.';
  const characterIcon = CHARACTER_ICONS[characterClass] || '🗺️';

  const getFactionInfo = (factionId: FactionId) => FACTIONS.find(f => f.id === factionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Dein Charakter
        </h2>
        <p className="text-adaptive-muted">
          Bereit für dein Abenteuer?
        </p>
      </div>

      {/* Character Portrait */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="bg-gradient-to-b from-purple-900/30 to-transparent rounded-2xl p-6 border border-purple-500/20">
          {/* Character Icon & Class */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
                  boxShadow: `
                    0 0 30px rgba(139, 92, 246, 0.4),
                    0 0 60px rgba(139, 92, 246, 0.2),
                    inset 0 0 30px rgba(139, 92, 246, 0.1)
                  `,
                }}
              >
                {characterIcon}
              </div>
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg">
                Lv.{averageLevel}
              </div>
            </motion.div>

            <div className="text-left">
              <h3 className="text-2xl font-bold text-white">
                {profile.displayName || 'Held'}
              </h3>
              <p className="text-purple-400 font-medium">{characterClass}</p>
            </div>
          </div>

          {/* Character Description - Editable */}
          <div className="bg-black/20 rounded-lg p-4 mb-6 relative group">
            {isEditingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-center italic resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  rows={3}
                  maxLength={300}
                  placeholder="Beschreibe deinen Charakter..."
                />
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditingDescription(false);
                      setEditedDescription(characterDescription);
                    }}
                    className="p-2 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 hover:text-white transition-colors"
                    title="Abbrechen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateDescription && editedDescription.trim()) {
                        onUpdateDescription(editedDescription.trim());
                      }
                      setIsEditingDescription(false);
                    }}
                    className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                    title="Speichern"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-adaptive-muted text-center italic">
                  "{characterDescription}"
                </p>
                <button
                  onClick={() => {
                    setEditedDescription(characterDescription);
                    setIsEditingDescription(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-adaptive-dim hover:bg-white/10 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  title="Beschreibung bearbeiten"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          {/* Top Factions */}
          <div className="flex justify-center gap-4 mb-6">
            {topFactions.map((faction, i) => {
              const level = aiAnalysis?.factionLevels[faction.id] || 10;
              const color = FACTION_COLORS[faction.id];
              return (
                <div key={faction.id} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-1"
                    style={{
                      backgroundColor: `${color}20`,
                      border: `2px solid ${color}`,
                    }}
                  >
                    {faction.icon}
                  </div>
                  <p className="text-xs text-adaptive-muted">{faction.name}</p>
                  <p className="text-xs font-bold" style={{ color }}>
                    Lv.{level}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Skills */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">
                  {acceptedSkills.length} Skills
                </span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {acceptedSkills.slice(0, 4).map(skill => {
                  const faction = getFactionInfo(skill.factionId);
                  return (
                    <div key={skill.id} className="flex items-center gap-1 text-xs text-adaptive-muted">
                      <span style={{ color: FACTION_COLORS[skill.factionId] }}>{faction?.icon}</span>
                      <span className="truncate">{skill.name}</span>
                    </div>
                  );
                })}
                {acceptedSkills.length > 4 && (
                  <p className="text-xs text-adaptive-dim">+{acceptedSkills.length - 4} mehr</p>
                )}
              </div>
            </div>

            {/* Habits */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">
                  {acceptedHabits.length} Habits
                </span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {acceptedHabits.slice(0, 4).map(habit => (
                  <div key={habit.id} className="flex items-center gap-1 text-xs text-adaptive-muted">
                    <span>{habit.icon}</span>
                    <span className="truncate">{habit.name}</span>
                  </div>
                ))}
                {acceptedHabits.length > 4 && (
                  <p className="text-xs text-adaptive-dim">+{acceptedHabits.length - 4} mehr</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit shortcuts */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => onGoToStep(3)} // Skills step
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-adaptive-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Skills bearbeiten
        </button>
        <button
          onClick={() => onGoToStep(4)} // Habits step
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-adaptive-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Habits bearbeiten
        </button>
        <button
          onClick={() => onGoToStep(5)} // Profile step
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-adaptive-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Profil bearbeiten
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </button>

        <motion.button
          onClick={onComplete}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Abenteuer starten!
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
