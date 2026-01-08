'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Smile, BookOpen, Sparkles, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import {
  saveMoodLog,
  saveJournalEntry,
  getMoodHistory,
  getJournalEntries,
  getGeistStats,
  getMentalStatsHistory,
  getMoodEmoji,
  getMoodLabel,
  getMoodColor,
  getRandomPrompt,
  JOURNAL_PROMPTS,
} from '@/lib/data/geist';
import type { FactionWithStats, MoodValue, MoodLog, JournalEntry, GeistStats, MentalStatsChartData } from '@/lib/database.types';
import MentalStatsChart from '@/components/geist/MentalStatsChart';

export default function GeistPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [stats, setStats] = useState<GeistStats | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [mentalStatsHistory, setMentalStatsHistory] = useState<MentalStatsChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mood input state
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [savingMood, setSavingMood] = useState(false);

  // Journal input state
  const [journalContent, setJournalContent] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
    setCurrentPrompt(getRandomPrompt());
  }, []);

  const loadData = async () => {
    try {
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

      const [geistStats, moods, journals, mentalStats] = await Promise.all([
        getGeistStats(),
        getMoodHistory(7, 7),
        getJournalEntries(5),
        getMentalStatsHistory(90),
      ]);

      setStats(geistStats);
      setMoodHistory(moods);
      setJournalEntries(journals);
      setMentalStatsHistory(mentalStats);

      // Set initial mood if already logged today
      if (geistStats.todaysMood) {
        setSelectedMood(geistStats.todaysMood.mood);
      }
    } catch (err) {
      console.error('Error loading geist data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveMood = async (mood: MoodValue) => {
    setSavingMood(true);
    try {
      await saveMoodLog(mood, moodNote || undefined);
      setSelectedMood(mood);
      setMoodNote('');
      showToast(`${getMoodEmoji(mood)} Stimmung gespeichert! +2 XP`, 'success');
      loadData(); // Refresh data
    } catch (err) {
      console.error('Error saving mood:', err);
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSavingMood(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!journalContent.trim()) return;

    setSavingJournal(true);
    try {
      const entry = await saveJournalEntry(journalContent, currentPrompt || undefined);
      setJournalContent('');
      setCurrentPrompt(getRandomPrompt());
      showToast(`Tagebucheintrag gespeichert! +${entry.xp_gained} XP`, 'success');
      loadData(); // Refresh data
    } catch (err) {
      console.error('Error saving journal:', err);
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSavingJournal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Brain className="w-8 h-8 text-purple-400" />
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

  const moods: MoodValue[] = ['great', 'good', 'okay', 'bad', 'terrible'];

  const additionalStats = [
    {
      label: 'Stimmungen (7 Tage)',
      value: moodHistory.length,
      icon: <Smile className="w-4 h-4" />,
      color: 'text-purple-400',
    },
    {
      label: 'Tagebucheintraege',
      value: stats?.journalCount || 0,
      icon: <BookOpen className="w-4 h-4" />,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
              toast.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
            }`}
          >
            {toast.message}
          </motion.div>
        )}

        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Mood Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Smile className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold">Wie fuehlst du dich?</h2>
            {stats?.todaysMood && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full ml-auto">
                Heute bereits geloggt
              </span>
            )}
          </div>

          {/* Mood Buttons */}
          <div className="flex justify-center gap-3 mb-4">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => handleSaveMood(mood)}
                disabled={savingMood}
                className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                  selectedMood === mood
                    ? 'ring-2 ring-purple-500 bg-purple-500/20'
                    : 'bg-white/5 hover:bg-white/10'
                } ${savingMood ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-3xl mb-1">{getMoodEmoji(mood)}</span>
                <span className="text-xs text-white/60">{getMoodLabel(mood)}</span>
              </button>
            ))}
          </div>

          {/* Optional Note */}
          <div className="flex gap-2">
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Optionale Notiz..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Mood History */}
          {moodHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h3 className="text-sm text-white/50 mb-2">Letzte 7 Tage</h3>
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = date.toISOString().split('T')[0];
                  const moodForDay = moodHistory.find(m => m.created_at.startsWith(dateStr));

                  return (
                    <div
                      key={i}
                      className="flex-1 text-center p-2 rounded-lg bg-white/5"
                      title={dateStr}
                    >
                      <div className="text-xs text-white/40 mb-1">
                        {date.toLocaleDateString('de-DE', { weekday: 'short' })}
                      </div>
                      <div className="text-lg">
                        {moodForDay ? getMoodEmoji(moodForDay.mood) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Mental Stats History Chart */}
        <MentalStatsChart data={mentalStatsHistory} />

        {/* Journal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Tagebuch</h2>
            </div>
            <button
              onClick={() => setCurrentPrompt(getRandomPrompt())}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Neuer Impuls
            </button>
          </div>

          {/* Prompt */}
          {currentPrompt && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-300 italic">&quot;{currentPrompt}&quot;</p>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            placeholder="Schreibe deine Gedanken..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-white/40">
              {journalContent.trim().split(/\s+/).filter(Boolean).length} Woerter
            </span>
            <button
              onClick={handleSaveJournal}
              disabled={savingJournal || !journalContent.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                journalContent.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {savingJournal ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </motion.div>

        {/* Recent Journal Entries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Letzte Eintraege</h2>
          </div>

          {journalEntries.length > 0 ? (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-white/40">
                      {new Date(entry.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-xs text-blue-400">+{entry.xp_gained} XP</span>
                  </div>
                  {entry.prompt && (
                    <p className="text-xs text-white/50 italic mb-1">{entry.prompt}</p>
                  )}
                  <p className="text-sm text-white/80 line-clamp-3">
                    {entry.content}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/30">{entry.word_count} Woerter</span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Tagebucheintraege</p>
              <p className="text-sm mt-1">Schreibe deinen ersten Eintrag!</p>
            </div>
          )}
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <Smile className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">
              {stats?.moodStats?.streak_days || 0}
            </div>
            <div className="text-sm text-white/50">Tage Streak</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">
              {stats?.journalCount || 0}
            </div>
            <div className="text-sm text-white/50">Eintraege</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {stats?.moodStats?.avg_mood_score?.toFixed(1) || '-'}
            </div>
            <div className="text-sm text-white/50">Durchschnitt</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-400">
              {stats?.totalWords || 0}
            </div>
            <div className="text-sm text-white/50">Woerter</div>
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
