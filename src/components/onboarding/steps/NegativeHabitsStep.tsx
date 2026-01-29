'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Shield,
  Info,
  Check,
  Plus,
  X,
} from 'lucide-react';
import {
  NEGATIVE_HABIT_TEMPLATES,
  NEGATIVE_HABIT_CATEGORIES,
  type NegativeHabitTemplate,
} from '@/lib/onboarding/negative-habit-templates';
import { FACTIONS } from '@/lib/ui/constants';
import type { SelectedNegativeHabit } from '@/lib/onboarding/types';
import type { FactionId } from '@/lib/database.types';

interface NegativeHabitsStepProps {
  selectedHabits: SelectedNegativeHabit[];
  onUpdate: (habits: SelectedNegativeHabit[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NegativeHabitsStep({
  selectedHabits,
  onUpdate,
  onNext,
  onBack,
}: NegativeHabitsStepProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('❌');
  const [customFactions, setCustomFactions] = useState<FactionId[]>(['geist']);

  const isSelected = (templateId: string) =>
    selectedHabits.some(h => h.templateId === templateId);

  const toggleTemplate = (template: NegativeHabitTemplate) => {
    if (isSelected(template.id)) {
      onUpdate(selectedHabits.filter(h => h.templateId !== template.id));
    } else {
      onUpdate([
        ...selectedHabits,
        {
          templateId: template.id,
          name: template.name,
          icon: template.icon,
          affectedFactions: template.affectedFactions,
        },
      ]);
    }
  };

  const addCustomHabit = () => {
    if (!customName.trim()) return;

    const customHabit: SelectedNegativeHabit = {
      templateId: `custom-${Date.now()}`,
      name: customName.trim(),
      icon: customIcon,
      affectedFactions: customFactions,
    };

    onUpdate([...selectedHabits, customHabit]);
    setCustomName('');
    setCustomIcon('❌');
    setCustomFactions(['geist']);
    setShowAddModal(false);
  };

  const removeCustomHabit = (templateId: string) => {
    onUpdate(selectedHabits.filter(h => h.templateId !== templateId));
  };

  const getFactionInfo = (factionId: FactionId) =>
    FACTIONS.find(f => f.id === factionId);

  // Group templates by category
  const templatesByCategory = Object.entries(NEGATIVE_HABIT_CATEGORIES).map(
    ([key, meta]) => ({
      category: key as NegativeHabitTemplate['category'],
      ...meta,
      templates: NEGATIVE_HABIT_TEMPLATES.filter(t => t.category === key),
    })
  );

  // Get custom habits (those not from templates)
  const customHabits = selectedHabits.filter(h =>
    h.templateId.startsWith('custom-')
  );

  return (
    <div className="space-y-6">
      {/* Header with empathetic messaging */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
          <Shield className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Gewohnheiten, die du reduzieren möchtest
        </h2>
        <p className="text-adaptive-muted max-w-md mx-auto">
          Niemand ist perfekt. Wähle aus, was du gerne weniger machen würdest.
          Das Tracken hilft dir, Muster zu erkennen.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-200/80">
            <strong>Wichtig:</strong> Nicht alles ist schlecht - aber übermäßiger
            Gebrauch kann schaden. Ein Feierabendbier ist okay, jeden Tag nicht.
            Hier trackst du nur, wenn du es reduzieren willst.
          </div>
        </div>
      </div>

      {/* Selected count */}
      {selectedHabits.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">
            {selectedHabits.length} ausgewählt
          </span>
        </div>
      )}

      {/* Templates by category */}
      <div className="space-y-6">
        {templatesByCategory.map(({ category, label, icon, templates }) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-adaptive-muted mb-3 flex items-center gap-2">
              <span>{icon}</span>
              {label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {templates.map(template => {
                const selected = isSelected(template.id);
                return (
                  <motion.button
                    key={template.id}
                    onClick={() => toggleTemplate(template)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Checkmark indicator */}
                    {selected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center gap-2">
                      <span className="text-3xl">{template.icon}</span>
                      <span
                        className={`text-sm font-medium ${
                          selected ? 'text-emerald-200' : 'text-white'
                        }`}
                      >
                        {template.name}
                      </span>
                      {/* Affected factions */}
                      <div className="flex gap-1 mt-1">
                        {template.affectedFactions.slice(0, 2).map(factionId => {
                          const faction = getFactionInfo(factionId);
                          return (
                            <span
                              key={factionId}
                              className="text-xs opacity-60"
                              title={faction?.name}
                            >
                              {faction?.icon}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom habits display */}
      {customHabits.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-adaptive-muted mb-3">
            Eigene Gewohnheiten
          </h3>
          <div className="space-y-2">
            {customHabits.map(habit => (
              <div
                key={habit.templateId}
                className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{habit.icon}</span>
                  <span className="text-white">{habit.name}</span>
                </div>
                <button
                  onClick={() => removeCustomHabit(habit.templateId)}
                  className="p-1.5 text-adaptive-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-xl text-adaptive-muted hover:text-white hover:border-white/40 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Eigene Gewohnheit hinzufügen
      </button>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </button>

        <div className="flex gap-3">
          <button
            onClick={onNext}
            className="px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
          >
            Überspringen
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors"
          >
            Weiter
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Custom Habit Modal */}
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
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">
                Eigene Gewohnheit hinzufügen
              </h3>
              <div className="space-y-4">
                {/* Name + Icon */}
                <div className="flex gap-2">
                  <select
                    value={customIcon}
                    onChange={e => setCustomIcon(e.target.value)}
                    className="appearance-none w-14 h-10 px-2 text-2xl bg-black/30 border border-white/10 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {['❌', '🚫', '⛔', '🔴', '⏱️', '💸', '🍫', '🎰', '🤳', '😤'].map(
                      icon => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="z.B. Nägelkauen, Zu viel Zucker..."
                    className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Affected factions */}
                <div>
                  <label className="block text-sm text-adaptive-muted mb-2">
                    Betroffene Lebensbereiche
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FACTIONS.map(faction => {
                      const selected = customFactions.includes(faction.id);
                      return (
                        <button
                          key={faction.id}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setCustomFactions(prev =>
                                prev.filter(f => f !== faction.id)
                              );
                            } else {
                              setCustomFactions(prev => [...prev, faction.id]);
                            }
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            selected
                              ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-200'
                              : 'bg-white/5 border border-white/10 text-adaptive-muted hover:bg-white/10'
                          }`}
                        >
                          {faction.icon} {faction.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-adaptive-muted hover:text-white"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addCustomHabit}
                    disabled={!customName.trim() || customFactions.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
