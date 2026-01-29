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
  Zap,
  Info,
} from 'lucide-react';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';
import type {
  AIGeneratedSkill,
  FactionRating,
  TellMeAboutYouData,
} from '@/lib/onboarding/types';
import RegenerateModal from '../RegenerateModal';

interface SkillsReviewStepProps {
  skills: AIGeneratedSkill[];
  factionRatings: FactionRating[];
  tellMeAboutYou: TellMeAboutYouData;
  onUpdate: (skills: AIGeneratedSkill[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface EditingSkill {
  id: string;
  name: string;
  factionId: FactionId;
  suggestedLevel: number;
  experience: 'beginner' | 'intermediate' | 'expert';
}

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Anfänger', color: 'text-green-400', levelRange: '1-20' },
  { id: 'intermediate', label: 'Fortgeschritten', color: 'text-amber-400', levelRange: '20-50' },
  { id: 'expert', label: 'Experte', color: 'text-red-400', levelRange: '50-100' },
] as const;

const MIN_ACCEPTED_SKILLS = 3;

export default function SkillsReviewStep({
  skills,
  factionRatings,
  tellMeAboutYou,
  onUpdate,
  onNext,
  onBack,
}: SkillsReviewStepProps) {
  const [localSkills, setLocalSkills] = useState<AIGeneratedSkill[]>(skills);
  const [editingSkill, setEditingSkill] = useState<EditingSkill | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillFaction, setNewSkillFaction] = useState<FactionId>('karriere');

  // Sync with parent
  useEffect(() => {
    onUpdate(localSkills);
  }, [localSkills, onUpdate]);

  const acceptedCount = localSkills.filter(s => s.accepted).length;
  const canProceed = acceptedCount >= MIN_ACCEPTED_SKILLS;

  const toggleAccept = (skillId: string) => {
    setLocalSkills(prev =>
      prev.map(s => s.id === skillId ? { ...s, accepted: !s.accepted } : s)
    );
  };

  const removeSkill = (skillId: string) => {
    setLocalSkills(prev => prev.filter(s => s.id !== skillId));
  };

  const startEdit = (skill: AIGeneratedSkill) => {
    setEditingSkill({
      id: skill.id,
      name: skill.name,
      factionId: skill.factionId,
      suggestedLevel: skill.suggestedLevel,
      experience: skill.experience,
    });
  };

  const saveEdit = () => {
    if (!editingSkill) return;
    setLocalSkills(prev =>
      prev.map(s =>
        s.id === editingSkill.id
          ? {
              ...s,
              name: editingSkill.name,
              factionId: editingSkill.factionId,
              suggestedLevel: editingSkill.suggestedLevel,
              experience: editingSkill.experience,
              edited: true,
            }
          : s
      )
    );
    setEditingSkill(null);
  };

  const addCustomSkill = () => {
    if (!newSkillName.trim()) return;

    const newSkill: AIGeneratedSkill = {
      id: `custom-skill-${Date.now()}`,
      name: newSkillName.trim(),
      factionId: newSkillFaction,
      suggestedLevel: 10,
      experience: 'beginner',
      reason: 'Manuell hinzugefügt',
      accepted: true,
      edited: false,
    };

    setLocalSkills(prev => [...prev, newSkill]);
    setNewSkillName('');
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
          regenerateType: 'skills',
        }),
      });

      const data = await response.json();

      if (data.success && data.skills) {
        // Merge new skills with existing custom/edited ones
        const customSkills = localSkills.filter(s => s.id.startsWith('custom-'));
        setLocalSkills([...data.skills, ...customSkills]);
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const getFactionInfo = (factionId: FactionId) => FACTIONS.find(f => f.id === factionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Deine Skills
        </h2>
        <p className="text-adaptive-muted">
          Die KI hat basierend auf deinen Eingaben diese Skills vorgeschlagen.
          Prüfe, bearbeite oder füge eigene hinzu.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className={`text-sm ${canProceed ? 'text-green-400' : 'text-amber-400'}`}>
          {acceptedCount} von mindestens {MIN_ACCEPTED_SKILLS} Skills akzeptiert
          {canProceed && ' ✓'}
        </span>
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        <AnimatePresence>
          {localSkills.map((skill) => {
            const faction = getFactionInfo(skill.factionId);
            const color = FACTION_COLORS[skill.factionId];
            const expLevel = EXPERIENCE_LEVELS.find(e => e.id === skill.experience);

            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`p-4 rounded-xl border transition-all ${
                  skill.accepted
                    ? 'bg-white/5 border-green-500/30'
                    : 'bg-white/[0.02] border-white/10 opacity-60'
                }`}
              >
                {/* Editing mode */}
                {editingSkill?.id === skill.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingSkill.name}
                      onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editingSkill.factionId}
                        onChange={(e) => setEditingSkill({ ...editingSkill, factionId: e.target.value as FactionId })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {FACTIONS.map(f => (
                          <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                        ))}
                      </select>
                      <select
                        value={editingSkill.experience}
                        onChange={(e) => setEditingSkill({ ...editingSkill, experience: e.target.value as 'beginner' | 'intermediate' | 'expert' })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {EXPERIENCE_LEVELS.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingSkill(null)}
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
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ color }}>{faction?.icon}</span>
                          <span className="font-medium text-white">{skill.name}</span>
                          <span className={`text-xs ${expLevel?.color}`}>
                            ({expLevel?.label})
                          </span>
                          {skill.edited && (
                            <span className="text-xs text-purple-400">(bearbeitet)</span>
                          )}
                        </div>
                        {skill.reason && (
                          <p className="text-sm text-adaptive-muted flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {skill.reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAccept(skill.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            skill.accepted
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-white/5 text-adaptive-dim hover:bg-white/10'
                          }`}
                          title={skill.accepted ? 'Ablehnen' : 'Akzeptieren'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(skill)}
                          className="p-2 rounded-lg bg-white/5 text-adaptive-dim hover:bg-white/10 hover:text-white transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSkill(skill.id)}
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
          Eigenen Skill hinzufügen
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
          Weiter zu Habits
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add Skill Modal */}
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
              <h3 className="text-lg font-bold text-white mb-4">Eigenen Skill hinzufügen</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill-Name..."
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <select
                  value={newSkillFaction}
                  onChange={(e) => setNewSkillFaction(e.target.value as FactionId)}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {FACTIONS.map(f => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-adaptive-muted hover:text-white"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addCustomSkill}
                    disabled={!newSkillName.trim()}
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
        type="skills"
      />
    </div>
  );
}
