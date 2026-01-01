'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Sparkles, Heart, Zap, Focus, Lightbulb, Battery,
  Play, Pause, RotateCcw, Plus, Smile, Meh, Frown, PenLine
} from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import type { FactionWithStats, MentalStats } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const MENTAL_STATS_CONFIG: Record<keyof MentalStats, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  stimmung: { label: 'Stimmung', icon: <Heart className="w-4 h-4" />, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  motivation: { label: 'Motivation', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  stress: { label: 'Stress', icon: <Brain className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  fokus: { label: 'Fokus', icon: <Focus className="w-4 h-4" />, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  kreativitaet: { label: 'Kreativitat', icon: <Lightbulb className="w-4 h-4" />, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  soziale_batterie: { label: 'Soziale Batterie', icon: <Battery className="w-4 h-4" />, color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

const MOOD_OPTIONS = [
  { value: 5, icon: <Smile className="w-8 h-8" />, label: 'Super', color: 'text-green-400' },
  { value: 4, icon: <Smile className="w-8 h-8" />, label: 'Gut', color: 'text-lime-400' },
  { value: 3, icon: <Meh className="w-8 h-8" />, label: 'Okay', color: 'text-yellow-400' },
  { value: 2, icon: <Frown className="w-8 h-8" />, label: 'Nicht so', color: 'text-orange-400' },
  { value: 1, icon: <Frown className="w-8 h-8" />, label: 'Schlecht', color: 'text-red-400' },
];

export default function GeistPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [mentalStats, setMentalStats] = useState<MentalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mood Tracker State
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [moodSubmitted, setMoodSubmitted] = useState(false);

  // Meditation Timer State
  const [meditationTime, setMeditationTime] = useState(5 * 60); // 5 minutes default
  const [timeRemaining, setTimeRemaining] = useState(meditationTime);
  const [isRunning, setIsRunning] = useState(false);
  const [meditationComplete, setMeditationComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Journal State
  const [journalEntry, setJournalEntry] = useState('');
  const [journalPrompt] = useState(getRandomPrompt());

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient();

        const [factionData, factionStats] = await Promise.all([
          getFaction('geist'),
          getUserFactionStat('geist'),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        // Load mental stats from user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('mental_stats')
          .eq('user_id', TEST_USER_ID)
          .single();

        if (!profileError && profileData?.mental_stats) {
          setMentalStats(profileData.mental_stats as MentalStats);
        } else {
          // Default values
          setMentalStats({
            stimmung: 70,
            motivation: 65,
            stress: 40,
            fokus: 60,
            kreativitaet: 55,
            soziale_batterie: 50,
          });
        }
      } catch (err) {
        console.error('Error loading geist data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Meditation Timer Effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      setIsRunning(false);
      setMeditationComplete(true);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMeditationToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleMeditationReset = () => {
    setIsRunning(false);
    setTimeRemaining(meditationTime);
    setMeditationComplete(false);
  };

  const handleMoodSubmit = async () => {
    if (selectedMood === null) return;

    try {
      // TODO: Save mood to database
      console.log('Mood logged:', { mood: selectedMood, note: moodNote });
      setMoodSubmitted(true);
      setTimeout(() => {
        setMoodSubmitted(false);
        setSelectedMood(null);
        setMoodNote('');
      }, 2000);
    } catch (err) {
      console.error('Error saving mood:', err);
    }
  };

  const handleJournalSave = async () => {
    if (!journalEntry.trim()) return;

    try {
      // TODO: Save journal entry to database
      console.log('Journal entry saved:', journalEntry);
      setJournalEntry('');
    } catch (err) {
      console.error('Error saving journal:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Brain className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-white/50">Lade Geist-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Geist-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const additionalStats = [
    {
      label: 'Stimmung',
      value: `${mentalStats?.stimmung || 0}%`,
      icon: <Heart className="w-4 h-4" />,
      color: 'text-pink-400',
    },
    {
      label: 'Stress-Level',
      value: `${mentalStats?.stress || 0}%`,
      icon: <Brain className="w-4 h-4" />,
      color: mentalStats && mentalStats.stress > 60 ? 'text-red-400' : 'text-green-400',
    },
  ];

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Mental Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold">Seele & Kopf</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {mentalStats && Object.entries(MENTAL_STATS_CONFIG).map(([key, config]) => {
              const value = mentalStats[key as keyof MentalStats];
              const isStress = key === 'stress';
              const barColor = isStress
                ? value > 60 ? 'bg-red-500' : value > 30 ? 'bg-yellow-500' : 'bg-green-500'
                : value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500';

              return (
                <div
                  key={key}
                  className={`${config.bgColor} border border-white/10 rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <span className={`text-lg font-bold ${config.color}`}>{value}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Two Column Layout: Mood Tracker & Meditation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Mood Tracker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h2 className="font-semibold">Stimmungs-Check</h2>
            </div>

            {moodSubmitted ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-green-400">Stimmung erfasst!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/50 mb-4">Wie fuhlst du dich gerade?</p>

                <div className="flex justify-center gap-4 mb-4">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                        selectedMood === mood.value
                          ? `${mood.color} bg-white/10 scale-110`
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {mood.icon}
                      <span className="text-xs mt-1">{mood.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Optionale Notiz..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:border-violet-500/50"
                />

                <button
                  onClick={handleMoodSubmit}
                  disabled={selectedMood === null}
                  className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMood !== null
                      ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Stimmung speichern
                </button>
              </>
            )}
          </motion.div>

          {/* Meditation Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Meditation</h2>
            </div>

            <div className="text-center py-4">
              {/* Timer Display */}
              <div className={`text-5xl font-mono font-bold mb-6 ${isRunning ? 'text-blue-400' : 'text-white/60'}`}>
                {formatTime(timeRemaining)}
              </div>

              {/* Timer Presets */}
              {!isRunning && !meditationComplete && (
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setMeditationTime(mins * 60);
                        setTimeRemaining(mins * 60);
                      }}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        meditationTime === mins * 60
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleMeditationToggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRunning
                      ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
                >
                  {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>

                <button
                  onClick={handleMeditationReset}
                  className="w-14 h-14 rounded-full bg-white/5 text-white/50 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {meditationComplete && (
                <div className="mt-4 text-green-400">
                  <Sparkles className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">Meditation abgeschlossen! +50 XP</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Journal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Tagebuch</h2>
            </div>
            <span className="text-xs text-white/40">
              {new Date().toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-400">
              <span className="font-medium">Impuls: </span>
              {journalPrompt}
            </p>
          </div>

          <textarea
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
            placeholder="Schreibe deine Gedanken auf..."
            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm resize-none h-32 focus:outline-none focus:border-amber-500/50"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-white/30">
              {journalEntry.length} Zeichen
            </span>
            <button
              onClick={handleJournalSave}
              disabled={!journalEntry.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                journalEntry.trim()
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              Eintrag speichern
            </button>
          </div>
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="geist"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}

// Helper function for random journal prompts
function getRandomPrompt(): string {
  const prompts = [
    'Wofur bist du heute dankbar?',
    'Was hat dich heute zum Lacheln gebracht?',
    'Welche Herausforderung hast du heute gemeistert?',
    'Was mochtest du morgen anders machen?',
    'Welcher Moment heute war besonders wertvoll?',
    'Was hast du heute uber dich gelernt?',
    'Wie hast du heute fur dich selbst gesorgt?',
    'Welche kleine Freude hast du heute erlebt?',
    'Was gibt dir gerade Kraft und Energie?',
    'Welches Ziel mochtest du als nachstes erreichen?',
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}
