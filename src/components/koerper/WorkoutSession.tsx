'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Timer, Dumbbell, TrendingUp } from 'lucide-react';
import type {
  WorkoutSessionType,
  Exercise,
  WorkoutExerciseWithDetails,
  ExerciseSet,
  MuscleGroup,
} from '@/lib/database.types';
import {
  startWorkoutSession,
  endWorkoutSession,
  getExercises,
  addExerciseToWorkout,
  addSetToExercise,
  updateSet,
  deleteSet,
  MUSCLE_GROUP_CONFIG,
  getWorkoutWithDetails,
} from '@/lib/data/trainingslog';

interface WorkoutSessionProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function WorkoutSession({ onClose, onComplete }: WorkoutSessionProps) {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutSessionType>('strength');
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Exercises in workout
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseWithDetails[]>([]);

  // Exercise library
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | 'all'>('all');

  // Load available exercises
  useEffect(() => {
    loadExercises();
  }, []);

  // Timer
  useEffect(() => {
    if (!isStarted || !startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, startTime]);

  const loadExercises = async () => {
    const exercises = await getExercises();
    setAvailableExercises(exercises);
  };

  const handleStartWorkout = async () => {
    const session = await startWorkoutSession({
      name: workoutName || undefined,
      workout_type: workoutType,
    });

    if (session) {
      setWorkoutId(session.id);
      setIsStarted(true);
      setStartTime(new Date());
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!workoutId) return;

    const workoutExercise = await addExerciseToWorkout({
      workout_id: workoutId,
      exercise_id: exercise.id,
      exercise_order: workoutExercises.length,
    });

    if (workoutExercise) {
      // Reload workout details to get the full structure
      const details = await getWorkoutWithDetails(workoutId);
      if (details) {
        setWorkoutExercises(details.exercises);
      }
      setShowExercisePicker(false);
    }
  };

  const handleAddSet = async (workoutExerciseId: string) => {
    const exercise = workoutExercises.find(e => e.id === workoutExerciseId);
    if (!exercise) return;

    const nextSetNumber = exercise.sets.length + 1;
    const lastSet = exercise.sets[exercise.sets.length - 1];

    // Pre-fill with last set's values
    const newSet = await addSetToExercise({
      workout_exercise_id: workoutExerciseId,
      set_number: nextSetNumber,
      reps: lastSet?.reps || undefined,
      weight_kg: lastSet?.weight_kg || undefined,
    });

    if (newSet && workoutId) {
      // Reload workout details
      const details = await getWorkoutWithDetails(workoutId);
      if (details) {
        setWorkoutExercises(details.exercises);
      }
    }
  };

  const handleUpdateSet = async (
    setId: string,
    field: 'reps' | 'weight_kg',
    value: number
  ) => {
    await updateSet(setId, { [field]: value });

    // Reload workout details
    if (workoutId) {
      const details = await getWorkoutWithDetails(workoutId);
      if (details) {
        setWorkoutExercises(details.exercises);
      }
    }
  };

  const handleDeleteSet = async (setId: string) => {
    const success = await deleteSet(setId);
    if (success && workoutId) {
      // Reload workout details
      const details = await getWorkoutWithDetails(workoutId);
      if (details) {
        setWorkoutExercises(details.exercises);
      }
    }
  };

  const handleEndWorkout = async () => {
    if (!workoutId) return;

    const result = await endWorkoutSession(workoutId);
    if (result) {
      onComplete();
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSets = workoutExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = workoutExercises.reduce(
    (sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.reps || 0) * (set.weight_kg || 0), 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--orb-border)]">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-green-400" />
            {!isStarted ? (
              <div>
                <h2 className="text-lg font-bold">Workout starten</h2>
                <p className="text-sm text-adaptive-muted">Beginne dein Training</p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold">
                  {workoutName || `${workoutType} Training`}
                </h2>
                <div className="flex items-center gap-3 text-sm text-adaptive-muted">
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span>{totalSets} Sets</span>
                  {totalVolume > 0 && <span>{totalVolume.toFixed(0)} kg</span>}
                </div>
              </div>
            )}
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
          {!isStarted ? (
            /* Setup Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Workout Name (optional)
                </label>
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="z.B. Push Day, Oberkörper Training..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Workout Typ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['strength', 'cardio', 'flexibility', 'mixed', 'hiit'] as WorkoutSessionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkoutType(type)}
                      className={`py-2 px-3 rounded-lg border text-center transition-all capitalize ${
                        workoutType === type
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartWorkout}
                className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 transition-colors font-medium"
              >
                Training starten
              </button>
            </div>
          ) : (
            /* Active Workout */
            <div className="space-y-4">
              {/* Exercises */}
              {workoutExercises.map((workoutExercise) => (
                <div
                  key={workoutExercise.id}
                  className="bg-white/5 rounded-lg border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{workoutExercise.exercise.name}</h3>
                      <span className="text-xs text-adaptive-muted">
                        {MUSCLE_GROUP_CONFIG[workoutExercise.exercise.muscle_group].label}
                      </span>
                    </div>
                  </div>

                  {/* Sets */}
                  <div className="space-y-2">
                    {workoutExercise.sets.map((set, idx) => (
                      <div
                        key={set.id}
                        className="flex items-center gap-2 bg-white/5 rounded-lg p-2"
                      >
                        <span className="text-xs text-adaptive-muted w-8">#{idx + 1}</span>

                        <input
                          type="number"
                          value={set.weight_kg || ''}
                          onChange={(e) =>
                            handleUpdateSet(set.id, 'weight_kg', parseFloat(e.target.value))
                          }
                          placeholder="kg"
                          className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50"
                        />
                        <span className="text-xs text-adaptive-muted">kg ×</span>

                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) =>
                            handleUpdateSet(set.id, 'reps', parseInt(e.target.value))
                          }
                          placeholder="reps"
                          className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50"
                        />
                        <span className="text-xs text-adaptive-muted">reps</span>

                        <button
                          onClick={() => handleDeleteSet(set.id)}
                          className="ml-auto p-1 rounded hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddSet(workoutExercise.id)}
                      className="w-full py-2 rounded-lg border border-dashed border-white/20 hover:bg-white/5 text-sm text-adaptive-muted transition-colors"
                    >
                      + Set hinzufügen
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Exercise Button */}
              <button
                onClick={() => setShowExercisePicker(true)}
                className="w-full py-3 rounded-lg border border-dashed border-green-500/30 hover:bg-green-500/10 text-green-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Übung hinzufügen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {isStarted && (
          <div className="p-4 border-t border-[var(--orb-border)] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleEndWorkout}
              disabled={workoutExercises.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Training beenden
            </button>
          </div>
        )}

        {/* Exercise Picker Modal */}
        {showExercisePicker && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[var(--orb-border)]">
                <h3 className="font-bold mb-3">Übung auswählen</h3>

                {/* Muscle Group Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedMuscleGroup('all')}
                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap ${
                      selectedMuscleGroup === 'all'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                    }`}
                  >
                    Alle
                  </button>
                  {Object.entries(MUSCLE_GROUP_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMuscleGroup(key as MuscleGroup)}
                      className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap ${
                        selectedMuscleGroup === key
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                      }`}
                    >
                      {config.icon} {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {availableExercises
                    .filter(
                      (ex) =>
                        selectedMuscleGroup === 'all' ||
                        ex.muscle_group === selectedMuscleGroup
                    )
                    .map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-xs text-adaptive-muted mt-1">
                          {MUSCLE_GROUP_CONFIG[exercise.muscle_group].label}
                          {exercise.equipment && ` • ${exercise.equipment}`}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="p-4 border-t border-[var(--orb-border)]">
                <button
                  onClick={() => setShowExercisePicker(false)}
                  className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
