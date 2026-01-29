'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type {
  FactionRating,
  TellMeAboutYouData,
  AIAnalysisResult,
  AIGeneratedSkill,
  AIGeneratedHabit,
} from '@/lib/onboarding/types';

interface AIAnalysisStepProps {
  factionRatings: FactionRating[];
  tellMeAboutYou: TellMeAboutYouData;
  onComplete: (result: AIAnalysisResult) => void;
  onBack: () => void;
}

// Progress messages that cycle during analysis
const PROGRESS_MESSAGES = [
  { faction: 'karriere', message: 'Analysiere deine Karriere...' },
  { faction: 'hobby', message: 'Erkunde deine Hobbys...' },
  { faction: 'koerper', message: 'Bewerte deine Fitness...' },
  { faction: 'geist', message: 'Verstehe deinen Geist...' },
  { faction: 'finanzen', message: 'Prüfe deine Finanzziele...' },
  { faction: 'soziales', message: 'Analysiere dein soziales Umfeld...' },
  { faction: 'wissen', message: 'Erfasse dein Wissen...' },
  { faction: null, message: 'Generiere personalisierte Skills...' },
  { faction: null, message: 'Erstelle passende Habits...' },
  { faction: null, message: 'Bestimme deine Charakter-Klasse...' },
];

export default function AIAnalysisStep({
  factionRatings,
  tellMeAboutYou,
  onComplete,
  onBack,
}: AIAnalysisStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const hasStarted = useRef(false);

  // Cycle through progress messages
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setProgressIndex(prev => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Start analysis on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factionRatings,
          tellMeAboutYou,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analyse fehlgeschlagen');
      }

      if (data.success && data.result) {
        // Short delay to show completion message
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete(data.result);
      } else if (data.fallback) {
        // Using fallback data
        onComplete(data.result);
      } else {
        throw new Error('Ungültige Antwort vom Server');
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    hasStarted.current = false;
    runAnalysis();
  };

  const handleUseFallback = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request fallback data explicitly
      const response = await fetch('/api/onboarding/analyze?fallback=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factionRatings,
          tellMeAboutYou,
        }),
      });

      const data = await response.json();

      if (data.result) {
        onComplete(data.result);
      } else {
        // Generate minimal fallback client-side
        const fallbackResult = generateClientFallback(factionRatings, tellMeAboutYou);
        onComplete(fallbackResult);
      }
    } catch (err) {
      // Generate minimal fallback client-side
      const fallbackResult = generateClientFallback(factionRatings, tellMeAboutYou);
      onComplete(fallbackResult);
    }
  };

  const currentMessage = PROGRESS_MESSAGES[progressIndex];
  const currentFaction = currentMessage.faction
    ? FACTIONS.find(f => f.id === currentMessage.faction)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {isLoading ? 'KI-Analyse läuft...' : error ? 'Analyse fehlgeschlagen' : 'Analyse abgeschlossen'}
        </h2>
        <p className="text-adaptive-muted">
          {isLoading
            ? 'Die KI analysiert deine Eingaben und erstellt personalisierte Vorschläge.'
            : error
            ? 'Es gab ein Problem bei der Analyse.'
            : 'Deine personalisierten Skills und Habits werden vorbereitet.'}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-8 py-8">
          {/* Animated Orb */}
          <motion.div
            className="relative"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
                boxShadow: `
                  0 0 40px rgba(139, 92, 246, 0.4),
                  0 0 80px rgba(139, 92, 246, 0.2),
                  inset 0 0 40px rgba(139, 92, 246, 0.1)
                `,
              }}
            >
              {/* Inner glow */}
              <motion.div
                className="absolute inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Icon */}
              {currentFaction ? (
                <span className="text-4xl relative z-10">{currentFaction.icon}</span>
              ) : (
                <Sparkles className="w-12 h-12 text-purple-400 relative z-10" />
              )}
            </div>

            {/* Rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500/50"
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>

          {/* Progress message */}
          <motion.p
            key={progressIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg text-white"
          >
            {currentMessage.message}
          </motion.p>

          {/* Progress dots */}
          <div className="flex gap-2">
            {PROGRESS_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === progressIndex ? 'bg-purple-500' : i < progressIndex ? 'bg-purple-500/50' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          <div className="text-center">
            <p className="text-red-400 font-medium mb-2">{error}</p>
            <p className="text-sm text-adaptive-muted">
              {retryCount < 2
                ? 'Du kannst es erneut versuchen oder mit statischen Vorschlägen fortfahren.'
                : 'Wir empfehlen, mit den statischen Vorschlägen fortzufahren.'}
            </p>
          </div>

          <div className="flex gap-4">
            {retryCount < 2 && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Erneut versuchen
              </button>
            )}
            <button
              onClick={handleUseFallback}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
            >
              Mit statischen Vorschlägen fortfahren
            </button>
          </div>
        </div>
      )}

      {/* Back button (only when not loading) */}
      {!isLoading && (
        <div className="flex justify-start pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Zurück
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Generate minimal fallback data client-side when API fails
 * IMPORTANT: Generates at least one skill and one habit for EVERY faction
 */
function generateClientFallback(
  factionRatings: FactionRating[],
  tellMeAboutYou: TellMeAboutYouData
): AIAnalysisResult {
  const skills: AIGeneratedSkill[] = [];
  const habits: AIGeneratedHabit[] = [];

  // Default skill suggestions per faction
  const defaultSkills: Record<FactionId, string[]> = {
    karriere: ['Projektmanagement', 'Kommunikation', 'Zeitmanagement'],
    hobby: ['Kreatives Schaffen', 'Entspannung', 'Neues entdecken'],
    koerper: ['Ausdauer', 'Kraft', 'Beweglichkeit'],
    geist: ['Achtsamkeit', 'Selbstreflexion', 'Emotionale Intelligenz'],
    finanzen: ['Budgetierung', 'Sparen', 'Investieren'],
    soziales: ['Beziehungspflege', 'Empathie', 'Netzwerken'],
    wissen: ['Lerntechniken', 'Wissensmanagement', 'Kritisches Denken'],
  };

  // Default habit suggestions per faction
  const defaultHabits: Record<FactionId, { name: string; icon: string }[]> = {
    karriere: [{ name: 'Deep Work Session', icon: '💼' }],
    hobby: [{ name: 'Kreative Zeit', icon: '🎨' }],
    koerper: [{ name: 'Training', icon: '💪' }],
    geist: [{ name: 'Meditation', icon: '🧘' }],
    finanzen: [{ name: 'Finanzen checken', icon: '💰' }],
    soziales: [{ name: 'Freunde kontaktieren', icon: '👥' }],
    wissen: [{ name: 'Lesen', icon: '📚' }],
  };

  // Create a map for quick faction rating lookup
  const ratingMap = new Map<FactionId, FactionRating>();
  factionRatings.forEach(r => ratingMap.set(r.factionId, r));

  // Get sorted factions by importance (for prioritization)
  const sortedFactions = [...factionRatings].sort((a, b) => b.importance - a.importance);
  const topFactionIds = new Set(sortedFactions.slice(0, 3).map(f => f.factionId));

  // ALL faction IDs - ensure we cover all 7 Lebensbereiche
  const allFactionIds: FactionId[] = ['karriere', 'hobby', 'koerper', 'geist', 'finanzen', 'soziales', 'wissen'];

  // Generate at least one skill for EVERY faction
  allFactionIds.forEach(factionId => {
    const rating = ratingMap.get(factionId);
    const factionSkills = defaultSkills[factionId] || [];
    const isTopFaction = topFactionIds.has(factionId);

    // Top factions get 2 skills, others get 1
    const skillCount = isTopFaction ? 2 : 1;

    factionSkills.slice(0, skillCount).forEach((skillName, idx) => {
      const currentStatus = rating?.currentStatus || 5;
      skills.push({
        id: `skill-${factionId}-${idx}`,
        name: skillName,
        factionId,
        suggestedLevel: Math.max(5, Math.floor(currentStatus * 5)),
        experience: currentStatus > 7 ? 'expert' : currentStatus > 4 ? 'intermediate' : 'beginner',
        reason: `Basierend auf deiner Bewertung für ${FACTIONS.find(f => f.id === factionId)?.name || factionId}`,
        accepted: isTopFaction, // Auto-accept only for top factions
        edited: false,
      });
    });
  });

  // Generate at least one habit for EVERY faction
  allFactionIds.forEach(factionId => {
    const rating = ratingMap.get(factionId);
    const factionHabits = defaultHabits[factionId] || [];
    const isTopFaction = topFactionIds.has(factionId);

    factionHabits.forEach(habit => {
      const importance = rating?.importance || 3;
      habits.push({
        id: `habit-${factionId}-${habits.length}`,
        name: habit.name,
        factionId,
        icon: habit.icon,
        suggestedFrequency: importance >= 4 ? 5 : 3,
        reason: `Empfohlen für ${FACTIONS.find(f => f.id === factionId)?.name || factionId}`,
        accepted: isTopFaction, // Auto-accept only for top factions
        edited: false,
      });
    });
  });

  // Determine character class
  const top1 = sortedFactions[0]?.factionId || 'wissen';
  const top2 = sortedFactions[1]?.factionId || 'hobby';
  const characterClass = getCharacterClass(top1, top2);

  // Calculate faction levels
  const factionLevels: Record<FactionId, number> = {
    karriere: 10, hobby: 10, koerper: 10, geist: 10, finanzen: 10, soziales: 10, wissen: 10,
  };
  factionRatings.forEach(rating => {
    factionLevels[rating.factionId] = Math.max(5, Math.floor(rating.currentStatus * 5));
  });

  return {
    characterClass,
    characterDescription: `Ein ${characterClass} auf dem Weg der Selbstverbesserung.`,
    factionLevels,
    skills,
    habits,
  };
}

function getCharacterClass(top1: FactionId, top2: FactionId): string {
  const classMap: Record<string, string> = {
    'karriere,finanzen': 'Händler',
    'karriere,wissen': 'Gelehrter',
    'karriere,soziales': 'Diplomat',
    'koerper,geist': 'Mönch',
    'koerper,hobby': 'Abenteurer',
    'koerper,soziales': 'Krieger',
    'geist,wissen': 'Weiser',
    'geist,hobby': 'Künstler',
    'wissen,hobby': 'Erfinder',
    'soziales,hobby': 'Barde',
    'finanzen,wissen': 'Alchemist',
    'finanzen,soziales': 'Gildemeister',
  };

  const key1 = `${top1},${top2}`;
  const key2 = `${top2},${top1}`;

  return classMap[key1] || classMap[key2] || 'Abenteurer';
}
