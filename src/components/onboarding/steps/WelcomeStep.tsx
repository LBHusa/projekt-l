'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronRight, Sparkles } from 'lucide-react';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type { FactionRating } from '../OnboardingWizard';

interface WelcomeStepProps {
  factionRatings: FactionRating[];
  onUpdate: (ratings: FactionRating[]) => void;
  onNext: () => void;
}

// Initialize ratings with default values for all factions
function getInitialRatings(existingRatings: FactionRating[]): FactionRating[] {
  return FACTIONS.map(faction => {
    const existing = existingRatings.find(r => r.factionId === faction.id);
    return existing || {
      factionId: faction.id,
      importance: 3,
      currentStatus: 5,
    };
  });
}

export default function WelcomeStep({
  factionRatings,
  onUpdate,
  onNext,
}: WelcomeStepProps) {
  const [ratings, setRatings] = useState<FactionRating[]>(() =>
    getInitialRatings(factionRatings)
  );

  useEffect(() => {
    onUpdate(ratings);
  }, [ratings, onUpdate]);

  const updateRating = (factionId: FactionId, field: 'importance' | 'currentStatus', value: number) => {
    setRatings(prev =>
      prev.map(r =>
        r.factionId === factionId ? { ...r, [field]: value } : r
      )
    );
  };

  // Check if at least one faction has 3+ importance
  const canProceed = ratings.some(r => r.importance >= 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-purple-300 font-medium">Willkommen, Abenteurer!</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Dein Leben als RPG
        </h1>
        <p className="text-adaptive-muted max-w-md mx-auto">
          Bewerte die 7 Lebensbereiche nach Wichtigkeit und deinem aktuellen Stand.
          Die KI berechnet daraus dein Startlevel.
        </p>
      </div>

      {/* Factions Grid */}
      <div className="space-y-4">
        {FACTIONS.map(faction => {
          const rating = ratings.find(r => r.factionId === faction.id);
          if (!rating) return null;

          const color = FACTION_COLORS[faction.id];

          return (
            <div
              key={faction.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Faction Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {faction.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{faction.name}</h3>
                  <p className="text-sm text-adaptive-dim">
                    Level wird berechnet aus Wichtigkeit x Stand
                  </p>
                </div>
              </div>

              {/* Importance Rating (Stars) */}
              <div className="mb-4">
                <label className="block text-sm text-adaptive-muted mb-2">
                  Wie wichtig ist dir dieser Bereich?
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => updateRating(faction.id, 'importance', star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= rating.importance
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Status Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-adaptive-muted">
                    Wie zufrieden bist du aktuell? (1-10)
                  </label>
                  <span
                    className="text-lg font-bold"
                    style={{ color }}
                  >
                    {rating.currentStatus}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rating.currentStatus}
                  onChange={(e) => updateRating(faction.id, 'currentStatus', parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{
                    background: `linear-gradient(to right, ${color} 0%, ${color} ${(rating.currentStatus - 1) * 11.11}%, rgba(255,255,255,0.1) ${(rating.currentStatus - 1) * 11.11}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-adaptive-dim mt-1">
                  <span>Unzufrieden</span>
                  <span>Sehr zufrieden</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation message */}
      {!canProceed && (
        <p className="text-center text-amber-400 text-sm">
          Bitte bewerte mindestens einen Bereich mit 3+ Sternen
        </p>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
        >
          Weiter
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
