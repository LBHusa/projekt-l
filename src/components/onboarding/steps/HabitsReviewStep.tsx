'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Edit2,
  Plus,
  RefreshCw,
  Calendar,
  Info,
} from 'lucide-react';
import { FACTIONS, FACTION_COLORS, HABIT_ICONS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type {
  AIGeneratedHabit,
  FactionRating,
  TellMeAboutYouData,
} from '@/lib/onboarding/types';
import RegenerateModal from '../RegenerateModal';

interface HabitsReviewStepProps {
  habits: AIGeneratedHabit[];
  factionRatings: FactionRating[];
  tellMeAboutYou: TellMeAboutYouData;
  onUpdate: (habits: AIGeneratedHabit[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface EditingHabit {
  id: string;
  name: string;
  factionId: FactionId;
  icon: string;
  suggestedFrequency: number;
}

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1x/Woche', desc: 'Gelegentlich' },
  { value: 2, label: '2x/Woche', desc: 'Moderat' },
  { value: 3, label: '3x/Woche', desc: 'Regelmäßig' },
  { value: 5, label: '5x/Woche', desc: 'Oft' },
  { value: 7, label: 'Täglich', desc: 'Jeden Tag' },
];

const MIN_ACCEPTED_HABITS = 2;

export default function HabitsReviewStep({
  habits,
  factionRatings,
  tellMeAboutYou,
  onUpdate,
  onNext,
  onBack,
}: HabitsReviewStepProps) {
  const [localHabits, setLocalHabits] = useState<AIGeneratedHabit[]>(habits);
  const [editingHabit, setEditingHabit] = useState<EditingHabit | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitFaction, setNewHabitFaction] = useState<FactionId>('hobby');
  const [newHabitIcon, setNewHabitIcon] = useState('✅');
  const [newHabitFrequency, setNewHabitFrequency] = useState(3);

  // Sync with parent
  useEffect(() => {
    onUpdate(localHabits);
  }, [localHabits, onUpdate]);

  const acceptedCount = localHabits.filter(h => h.accepted).length;
  const canProceed = acceptedCount >= MIN_ACCEPTED_HABITS;

  const toggleAccept = (habitId: string) => {
    setLocalHabits(prev =>
      prev.map(h => h.id === habitId ? { ...h, accepted: !h.accepted } : h)
    );
  };

  const removeHabit = (habitId: string) => {
    setLocalHabits(prev => prev.filter(h => h.id !== habitId));
  };

  const startEdit = (habit: AIGeneratedHabit) => {
    setEditingHabit({
      id: habit.id,
      name: habit.name,
      factionId: habit.factionId,
      icon: habit.icon,
      suggestedFrequency: habit.suggestedFrequency,
    });
  };

  const saveEdit = () => {
    if (!editingHabit) return;
    setLocalHabits(prev =>
      prev.map(h =>
        h.id === editingHabit.id
          ? {
              ...h,
              name: editingHabit.name,
              factionId: editingHabit.factionId,
              icon: editingHabit.icon,
              suggestedFrequency: editingHabit.suggestedFrequency,
              edited: true,
            }
          : h
      )
    );
    setEditingHabit(null);
  };

  const addCustomHabit = () => {
    if (!newHabitName.trim()) return;

    const newHabit: AIGeneratedHabit = {
      id: `custom-habit-${Date.now()}`,
      name: newHabitName.trim(),
      factionId: newHabitFaction,
      icon: newHabitIcon,
      suggestedFrequency: newHabitFrequency,
      reason: 'Manuell hinzugefügt',
      accepted: true,
      edited: false,
    };

    setLocalHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    setNewHabitIcon('✅');
    setNewHabitFrequency(3);
    setShowAddModal(false);
  };

  const handleRegenerate = async (feedback: string) => {
    setIsRegenerating(true);
    setShowRegenerateModal(false);

    try {
      const response = await fetch('/api/onboarding/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalData: { factionRatings, tellMeAboutYou },
          feedback,
          regenerateType: 'habits',
        }),
      });

      const data = await response.json();

      if (data.success && data.habits) {
        // Merge new habits with existing custom/edited ones
        const customHabits = localHabits.filter(h => h.id.startsWith('custom-'));
        setLocalHabits([...data.habits, ...customHabits]);
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const getFactionInfo = (factionId: FactionId) => FACTIONS.find(f => f.id === factionId);
  const getFrequencyLabel = (freq: number) => FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || `${freq}x/Woche`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Deine Habits
        </h2>
        <p className="text-adaptive-muted">
          Die KI hat diese Gewohnheiten basierend auf deinen Zielen vorgeschlagen.
          Prüfe, bearbeite oder füge eigene hinzu.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <Calendar className="w-4 h-4 text-purple-400" />
        <span className={`text-sm ${canProceed ? 'text-green-400' : 'text-amber-400'}`}>
          {acceptedCount} von mindestens {MIN_ACCEPTED_HABITS} Habits akzeptiert
          {canProceed && ' ✓'}
        </span>
      </div>

      {/* Habits list */}
      <div className="space-y-3">
        <AnimatePresence>
          {localHabits.map((habit) => {
            const faction = getFactionInfo(habit.factionId);
            const color = FACTION_COLORS[habit.factionId];

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`p-4 rounded-xl border transition-all ${
                  habit.accepted
                    ? 'bg-white/5 border-green-500/30'
                    : 'bg-white/[0.02] border-white/10 opacity-60'
                }`}
              >
                {/* Editing mode */}
                {editingHabit?.id === habit.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {/* Icon selector */}
                      <div className="relative">
                        <select
                          value={editingHabit.icon}
                          onChange={(e) => setEditingHabit({ ...editingHabit, icon: e.target.value })}
                          className="appearance-none w-14 h-10 px-2 text-2xl bg-black/30 border border-white/10 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          {HABIT_ICONS.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editingHabit.name}
                        onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={editingHabit.factionId}
                        onChange={(e) => setEditingHabit({ ...editingHabit, factionId: e.target.value as FactionId })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {FACTIONS.map(f => (
                          <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                        ))}
                      </select>
                      <select
                        value={editingHabit.suggestedFrequency}
                        onChange={(e) => setEditingHabit({ ...editingHabit, suggestedFrequency: parseInt(e.target.value) })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {FREQUENCY_OPTIONS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingHabit(null)}
                        className="px-3 py-1.5 text-sm text-adaptive-muted hover:text-white"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 rounded-lg"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Normal view */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-2xl">{habit.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{habit.name}</span>
                              {habit.edited && (
                                <span className="text-xs text-purple-400">(bearbeitet)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-adaptive-muted">
                              <span style={{ color }}>{faction?.icon}</span>
                              <span>{faction?.name}</span>
                              <span className="text-white/30">•</span>
                              <span>{getFrequencyLabel(habit.suggestedFrequency)}</span>
                            </div>
                          </div>
                        </div>
                        {habit.reason && (
                          <p className="text-sm text-adaptive-muted flex items-start gap-1 ml-11">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {habit.reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAccept(habit.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            habit.accepted
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-white/5 text-adaptive-dim hover:bg-white/10'
                          }`}
                          title={habit.accepted ? 'Ablehnen' : 'Akzeptieren'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(habit)}
                          className="p-2 rounded-lg bg-white/5 text-adaptive-dim hover:bg-white/10 hover:text-white transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeHabit(habit.id)}
                          className="p-2 rounded-lg bg-white/5 text-adaptive-dim hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Entfernen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setShowRegenerateModal(true)}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-adaptive-muted hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          Mit Feedback regenerieren
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-adaptive-muted hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Eigenen Habit hinzufügen
        </button>
      </div>

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
          Weiter zum Profil
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">Eigenen Habit hinzufügen</h3>
              <div className="space-y-4">
                {/* Name + Icon */}
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={newHabitIcon}
                      onChange={(e) => setNewHabitIcon(e.target.value)}
                      className="appearance-none w-14 h-10 px-2 text-2xl bg-black/30 border border-white/10 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      {HABIT_ICONS.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="Habit-Name..."
                    className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Faction */}
                <select
                  value={newHabitFaction}
                  onChange={(e) => setNewHabitFaction(e.target.value as FactionId)}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {FACTIONS.map(f => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>

                {/* Frequency */}
                <div>
                  <label className="block text-sm text-adaptive-muted mb-2">Frequenz</label>
                  <div className="flex gap-2">
                    {FREQUENCY_OPTIONS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setNewHabitFrequency(f.value)}
                        className={`flex-1 px-2 py-2 text-sm rounded-lg transition-colors ${
                          newHabitFrequency === f.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-adaptive-muted hover:text-white"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addCustomHabit}
                    disabled={!newHabitName.trim()}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-lg"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onSubmit={handleRegenerate}
        type="habits"
      />
    </div>
  );
}
