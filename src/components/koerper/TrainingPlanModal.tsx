'use client';

import { useState } from 'react';
import { X, Calendar, Plus, Trash2 } from 'lucide-react';
import {
  createTrainingPlan,
  updateTrainingPlan,
  TRAINING_GOAL_CONFIG,
  TRAINING_TEMPLATES,
  DAY_ORDER,
  DAY_OF_WEEK_CONFIG,
  type TrainingGoal,
  type DayOfWeek,
  type WeeklySchedule,
  type DayWorkout,
} from '@/lib/data/trainingplan';
import type { TrainingPlan } from '@/lib/database.types';

interface TrainingPlanModalProps {
  plan?: TrainingPlan | null;
  onClose: () => void;
  onSave: () => void;
}

export default function TrainingPlanModal({ plan, onClose, onSave }: TrainingPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!plan);

  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [goal, setGoal] = useState<TrainingGoal | null>(
    (plan?.goal as TrainingGoal) || null
  );
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    (plan?.schedule as WeeklySchedule) || {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    }
  );
  const [isActive, setIsActive] = useState<boolean>(plan?.is_active ?? true);

  const handleLoadTemplate = (templateKey: keyof typeof TRAINING_TEMPLATES) => {
    const template = TRAINING_TEMPLATES[templateKey];
    setName(template.name);
    setDescription(template.description);
    setGoal(template.goal);
    setSchedule(template.schedule);
    setShowTemplates(false);
  };

  const handleAddWorkout = (day: DayOfWeek) => {
    const newWorkout: DayWorkout = {
      name: '',
      type: 'strength',
      duration: 60,
    };

    setSchedule((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), newWorkout],
    }));
  };

  const handleUpdateWorkout = (
    day: DayOfWeek,
    index: number,
    field: keyof DayWorkout,
    value: string | number
  ) => {
    setSchedule((prev) => {
      const dayWorkouts = [...(prev[day] || [])];
      dayWorkouts[index] = {
        ...dayWorkouts[index],
        [field]: value,
      };
      return {
        ...prev,
        [day]: dayWorkouts,
      };
    });
  };

  const handleRemoveWorkout = (day: DayOfWeek, index: number) => {
    setSchedule((prev) => {
      const dayWorkouts = [...(prev[day] || [])];
      dayWorkouts.splice(index, 1);
      return {
        ...prev,
        [day]: dayWorkouts,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (plan) {
        await updateTrainingPlan(plan.id, {
          name,
          description: description || undefined,
          goal: goal || undefined,
          schedule,
          is_active: isActive,
        });
      } else {
        await createTrainingPlan({
          name,
          description: description || undefined,
          goal: goal || undefined,
          schedule,
          is_active: isActive,
        });
      }
      onSave();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">
              {plan ? 'Trainingsplan bearbeiten' : 'Neuer Trainingsplan'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-adaptive-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showTemplates && (
            /* Template Selection */
            <div className="mb-6">
              <h3 className="font-medium mb-3">Vorlage wählen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(TRAINING_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() =>
                      handleLoadTemplate(key as keyof typeof TRAINING_TEMPLATES)
                    }
                    className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {TRAINING_GOAL_CONFIG[template.goal].icon}
                      </span>
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <p className="text-xs text-adaptive-muted">{template.description}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300"
              >
                Leeren Plan erstellen →
              </button>
            </div>
          )}

          {!showTemplates && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Push/Pull/Legs"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional: Was ist das Ziel dieses Plans?"
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Ziel</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TRAINING_GOAL_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGoal(key as TrainingGoal)}
                      className={`py-2 px-3 rounded-lg border text-center transition-all text-sm ${
                        goal === key
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <span className="mr-1">{config.icon}</span>
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Schedule */}
              <div>
                <label className="block text-sm font-medium mb-2">Wochenplan</label>
                <div className="space-y-3">
                  {DAY_ORDER.map((day) => (
                    <div key={day} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {DAY_OF_WEEK_CONFIG[day].label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddWorkout(day)}
                          className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Workout
                        </button>
                      </div>

                      {schedule[day]?.length > 0 ? (
                        <div className="space-y-2">
                          {schedule[day].map((workout, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-white/5 rounded p-2"
                            >
                              <input
                                type="text"
                                value={workout.name}
                                onChange={(e) =>
                                  handleUpdateWorkout(day, idx, 'name', e.target.value)
                                }
                                placeholder="Workout Name"
                                className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              />
                              <input
                                type="number"
                                value={workout.duration || ''}
                                onChange={(e) =>
                                  handleUpdateWorkout(
                                    day,
                                    idx,
                                    'duration',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="Min"
                                className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkout(day, idx)}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-adaptive-dim text-center py-2">
                          Ruhetag
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor="is_active" className="text-sm">
                  Als aktiven Plan setzen
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Speichern...' : plan ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
