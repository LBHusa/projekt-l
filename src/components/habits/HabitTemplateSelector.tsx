'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { HABIT_TEMPLATES, getTemplatesByCategory, type HabitTemplate } from '@/lib/data/habit-templates';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';
import type { FactionId } from '@/lib/database.types';

interface HabitTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: HabitTemplate) => void;
}

export default function HabitTemplateSelector({
  isOpen,
  onClose,
  onSelect,
}: HabitTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<FactionId | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);

  const filteredTemplates = getTemplatesByCategory(selectedCategory);

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  const handleTemplateDoubleClick = (template: HabitTemplate) => {
    onSelect(template);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Vorlage auswählen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Faction Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === undefined
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
              }`}
            >
              Alle
            </button>
            {FACTIONS.map((faction) => (
              <button
                key={faction.id}
                onClick={() => setSelectedCategory(faction.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === faction.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                }`}
                style={
                  selectedCategory === faction.id
                    ? {
                        backgroundColor: `${FACTION_COLORS[faction.id]}30`,
                        color: FACTION_COLORS[faction.id],
                      }
                    : undefined
                }
              >
                {faction.icon} {faction.name}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-adaptive-dim">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Keine Vorlagen in dieser Kategorie</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {filteredTemplates.map((template) => {
                const faction = FACTIONS.find((f) => f.id === template.category);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    onDoubleClick={() => handleTemplateDoubleClick(template)}
                    className={`text-left p-4 rounded-lg border-l-4 transition-all ${
                      isSelected
                        ? 'bg-white/15 ring-2 ring-purple-500'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    style={{
                      borderLeftColor: faction ? FACTION_COLORS[faction.id] : '#6366F1',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate text-white">
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="text-xs text-adaptive-muted mb-2 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-adaptive-muted">
                          {faction && (
                            <span>
                              {faction.icon} {faction.name}
                            </span>
                          )}
                          <span>·</span>
                          <span className="text-green-400">
                            +{template.xp_per_completion} XP
                          </span>
                          <span>·</span>
                          <span>
                            {template.frequency === 'daily' && 'Täglich'}
                            {template.frequency === 'weekly' && 'Wöchentlich'}
                            {template.frequency === 'specific_days' &&
                              `${template.target_days.length}x/Woche`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--orb-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplate}
            className="flex-1 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Vorlage übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
