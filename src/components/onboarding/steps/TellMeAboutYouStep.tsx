'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, GraduationCap, Briefcase, AlertCircle } from 'lucide-react';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type {
  TellMeAboutYouData,
  FactionRating,
  EducationData,
  TELL_ME_QUESTIONS,
  EDUCATION_TYPES,
  GRADUATION_YEARS,
} from '@/lib/onboarding/types';

interface TellMeAboutYouStepProps {
  factionRatings: FactionRating[];
  data: TellMeAboutYouData;
  onUpdate: (data: TellMeAboutYouData) => void;
  onNext: () => void;
  onBack: () => void;
}

// Questions for each faction
const QUESTIONS: Record<FactionId, string> = {
  karriere: 'Was machst du beruflich? Erzähl mir von deiner aktuellen Arbeit und deinen Aufgaben.',
  hobby: 'Was sind deine Hobbys? Was machst du gerne in deiner Freizeit?',
  koerper: 'Wie hältst du dich fit? Treibst du Sport?',
  geist: 'Wie pflegst du deine mentale Gesundheit? (Meditation, Journaling, etc.)',
  finanzen: 'Was sind deine finanziellen Ziele? (Sparen, Investieren, etc.)',
  soziales: 'Wie pflegst du deine Beziehungen? (Familie, Freunde, Partner)',
  wissen: 'Was lernst du gerade oder möchtest du lernen?',
};

// Education type options
const EDUCATION_OPTIONS = [
  { value: '', label: 'Bitte auswählen...' },
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'bachelor', label: 'Studium (Bachelor)' },
  { value: 'master', label: 'Studium (Master/Diplom)' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'quereinsteiger', label: 'Quereinsteiger' },
  { value: 'freelancer', label: 'Freelancer/Selbstständig' },
];

// Graduation year options
const YEAR_OPTIONS = [
  { value: '', label: 'Optional...' },
  { value: 'in_progress', label: 'Noch in Ausbildung/Studium' },
  ...Array.from({ length: 17 }, (_, i) => ({
    value: String(2010 + i),
    label: String(2010 + i),
  })),
];

const MAX_CHARS = 500;
const MIN_FILLED_AREAS = 2;

export default function TellMeAboutYouStep({
  factionRatings,
  data,
  onUpdate,
  onNext,
  onBack,
}: TellMeAboutYouStepProps) {
  const [localData, setLocalData] = useState<TellMeAboutYouData>(data);
  const [expandedFaction, setExpandedFaction] = useState<FactionId | null>('karriere');

  // Sort factions by importance (highest first)
  const sortedFactions = useMemo(() => {
    const factionImportance = new Map(
      factionRatings.map(r => [r.factionId, r.importance])
    );
    return FACTIONS.slice().sort((a, b) => {
      const impA = factionImportance.get(a.id) || 0;
      const impB = factionImportance.get(b.id) || 0;
      return impB - impA;
    });
  }, [factionRatings]);

  // Sync local data with parent
  useEffect(() => {
    onUpdate(localData);
  }, [localData, onUpdate]);

  // Count filled areas
  const filledAreasCount = useMemo(() => {
    let count = 0;
    if (localData.karriere.trim().length > 0) count++;
    if (localData.hobby.trim().length > 0) count++;
    if (localData.koerper.trim().length > 0) count++;
    if (localData.geist.trim().length > 0) count++;
    if (localData.finanzen.trim().length > 0) count++;
    if (localData.soziales.trim().length > 0) count++;
    if (localData.wissen.trim().length > 0) count++;
    return count;
  }, [localData]);

  const canProceed = filledAreasCount >= MIN_FILLED_AREAS;

  const updateTextField = (factionId: FactionId, value: string) => {
    if (value.length > MAX_CHARS) return;
    setLocalData(prev => ({ ...prev, [factionId]: value }));
  };

  const updateEducation = (field: keyof EducationData, value: string | number | undefined) => {
    setLocalData(prev => ({
      ...prev,
      karriereEducation: {
        ...prev.karriereEducation,
        [field]: value,
      },
    }));
  };

  const getFactionImportance = (factionId: FactionId): number => {
    return factionRatings.find(r => r.factionId === factionId)?.importance || 0;
  };

  const getTextValue = (factionId: FactionId): string => {
    switch (factionId) {
      case 'karriere': return localData.karriere;
      case 'hobby': return localData.hobby;
      case 'koerper': return localData.koerper;
      case 'geist': return localData.geist;
      case 'finanzen': return localData.finanzen;
      case 'soziales': return localData.soziales;
      case 'wissen': return localData.wissen;
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Erzähl mir von dir
        </h2>
        <p className="text-adaptive-muted">
          Je mehr du erzählst, desto besser kann die KI deine Skills und Habits personalisieren.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`text-sm ${canProceed ? 'text-green-400' : 'text-amber-400'}`}>
          {filledAreasCount} von {MIN_FILLED_AREAS} Bereichen ausgefüllt
          {canProceed && ' ✓'}
        </div>
      </div>

      {/* Faction sections */}
      <div className="space-y-3">
        {sortedFactions.map((faction) => {
          const importance = getFactionImportance(faction.id);
          const color = FACTION_COLORS[faction.id];
          const isExpanded = expandedFaction === faction.id;
          const textValue = getTextValue(faction.id);
          const charCount = textValue.length;
          const isFilled = charCount > 0;
          const isCareer = faction.id === 'karriere';

          return (
            <div
              key={faction.id}
              className={`rounded-xl border transition-all duration-200 ${
                isExpanded
                  ? 'bg-white/5 border-white/20'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/15'
              }`}
            >
              {/* Faction header (clickable) */}
              <button
                onClick={() => setExpandedFaction(isExpanded ? null : faction.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{faction.icon}</span>
                  <div className="text-left">
                    <h3 className="font-medium text-white">{faction.name}</h3>
                    {importance > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-xs ${i < importance ? 'text-amber-400' : 'text-white/20'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isFilled && (
                    <span className="text-green-400 text-sm">✓</span>
                  )}
                  <ChevronRight
                    className={`w-5 h-5 text-adaptive-muted transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Career section has extra education fields */}
                  {isCareer && (
                    <div className="p-3 bg-black/20 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm text-adaptive-muted mb-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>Dein Bildungsweg (optional)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Education type */}
                        <select
                          value={localData.karriereEducation.type}
                          onChange={(e) => updateEducation('type', e.target.value)}
                          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          {EDUCATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {/* Graduation year */}
                        <select
                          value={localData.karriereEducation.graduationYear?.toString() || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              updateEducation('graduationYear', undefined);
                            } else if (val === 'in_progress') {
                              updateEducation('graduationYear', 'in_progress');
                            } else {
                              updateEducation('graduationYear', parseInt(val));
                            }
                          }}
                          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          {YEAR_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Field of study */}
                      <input
                        type="text"
                        value={localData.karriereEducation.field}
                        onChange={(e) => updateEducation('field', e.target.value)}
                        placeholder="Fachrichtung (z.B. Informatik, BWL, Gesundheitswesen...)"
                        maxLength={100}
                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  )}

                  {/* Question label */}
                  <p className="text-sm text-adaptive-muted">
                    {QUESTIONS[faction.id]}
                  </p>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      value={textValue}
                      onChange={(e) => updateTextField(faction.id, e.target.value)}
                      placeholder="Deine Antwort..."
                      rows={4}
                      maxLength={MAX_CHARS}
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-adaptive-dim">
                      {charCount}/{MAX_CHARS}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      {!canProceed && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            Bitte fülle mindestens {MIN_FILLED_AREAS} Bereiche aus, um fortzufahren.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
        >
          Weiter zur KI-Analyse
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
