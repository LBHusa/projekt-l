'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Edit2, Trash2, ChevronRight, ExternalLink, Award, Clock } from 'lucide-react';
import type { Course, CourseStatus } from '@/lib/database.types';

interface CourseListProps {
  courses: Course[];
  onAddCourse?: () => void;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onUpdateProgress?: (courseId: string, progress: number, completedHours?: number) => void;
}

const statusLabels: Record<CourseStatus, string> = {
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  completed: 'Abgeschlossen',
  abandoned: 'Abgebrochen',
};

const statusColors: Record<CourseStatus, string> = {
  planned: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-green-500/20 text-green-400',
  abandoned: 'bg-gray-500/20 text-gray-400',
};

export default function CourseList({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  onUpdateProgress,
}: CourseListProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CourseStatus | 'all'>('all');
  // Local state for slider to avoid race conditions during drag
  const [pendingProgress, setPendingProgress] = useState<{ courseId: string; value: number } | null>(null);

  const filteredCourses = filterStatus === 'all'
    ? courses
    : courses.filter(c => c.status === filterStatus);

  const formatHours = (hours: number | null): string => {
    if (!hours) return '?';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours} Std.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          Kurse
        </h2>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as CourseStatus | 'all')}
            className="px-2 py-1 text-sm bg-white/10 border border-white/20 rounded-lg text-white/70"
          >
            <option value="all">Alle</option>
            <option value="in_progress">In Arbeit</option>
            <option value="planned">Geplant</option>
            <option value="completed">Abgeschlossen</option>
          </select>
          {onAddCourse && (
            <button
              onClick={onAddCourse}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Kurs
            </button>
          )}
        </div>
      </div>

      {/* Course List */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Keine Kurse gefunden</p>
          {onAddCourse && filterStatus === 'all' && (
            <button
              onClick={onAddCourse}
              className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Ersten Kurs hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="relative bg-white/5 border border-white/10 hover:border-white/20 rounded-lg p-4 cursor-pointer transition-all"
              onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{course.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[course.status]}`}>
                      {statusLabels[course.status]}
                    </span>
                  </div>
                  {course.platform && (
                    <p className="text-sm text-white/60 truncate">{course.platform}</p>
                  )}
                  {course.instructor && (
                    <p className="text-xs text-white/40 truncate">von {course.instructor}</p>
                  )}
                </div>

                {/* Progress */}
                {course.status === 'in_progress' && (
                  <div className="text-right ml-4">
                    <div className="text-sm text-white/50">{course.progress}%</div>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Completed indicator */}
                {course.status === 'completed' && course.certificate_url && (
                  <Award className="w-5 h-5 text-green-400 ml-2" />
                )}
              </div>

              {/* Expanded details */}
              {expandedCourse === course.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    {course.total_hours && (
                      <div className="flex items-center gap-1 text-white/50">
                        <Clock className="w-3 h-3" />
                        <span>{formatHours(course.total_hours)}</span>
                      </div>
                    )}
                    {course.completed_hours > 0 && (
                      <div className="text-white/50">
                        <span className="text-white/30">Absolviert:</span>{' '}
                        {formatHours(course.completed_hours)}
                      </div>
                    )}
                    {course.started_at && (
                      <div className="text-white/50">
                        <span className="text-white/30">Begonnen:</span>{' '}
                        {new Date(course.started_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                    {course.finished_at && (
                      <div className="text-white/50">
                        <span className="text-white/30">Beendet:</span>{' '}
                        {new Date(course.finished_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>

                  {course.url && (
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:underline mb-3"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Kurs öffnen
                    </a>
                  )}

                  {course.notes && (
                    <p className="text-sm text-white/60 mb-3">{course.notes}</p>
                  )}

                  {course.xp_gained > 0 && (
                    <div className="text-xs text-indigo-400 mb-3">
                      +{course.xp_gained} XP erhalten
                    </div>
                  )}

                  {/* Progress slider for in_progress courses */}
                  {course.status === 'in_progress' && onUpdateProgress && (
                    <div className="mb-4">
                      <label className="text-xs text-white/40 block mb-2">Fortschritt aktualisieren (Slider loslassen zum Speichern)</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pendingProgress?.courseId === course.id ? pendingProgress.value : course.progress}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          // Only update local state during drag - don't save to DB yet
                          const progress = parseInt(e.target.value);
                          setPendingProgress({ courseId: course.id, value: progress });
                        }}
                        onPointerUp={(e) => {
                          // Save to DB when user releases the slider
                          e.stopPropagation();
                          if (pendingProgress?.courseId === course.id) {
                            onUpdateProgress(course.id, pendingProgress.value);
                            setPendingProgress(null);
                          }
                        }}
                        onMouseUp={(e) => {
                          // Fallback for non-pointer devices
                          e.stopPropagation();
                          if (pendingProgress?.courseId === course.id) {
                            onUpdateProgress(course.id, pendingProgress.value);
                            setPendingProgress(null);
                          }
                        }}
                        className="w-full accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-white/30 mt-1">
                        <span>0%</span>
                        <span className="text-amber-400 font-medium">
                          {pendingProgress?.courseId === course.id ? pendingProgress.value : course.progress}%
                        </span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}

                  {/* Certificate link */}
                  {course.certificate_url && (
                    <a
                      href={course.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline mb-3"
                    >
                      <Award className="w-3 h-3" />
                      Zertifikat anzeigen
                    </a>
                  )}

                  {/* Actions */}
                  {(onEditCourse || onDeleteCourse) && (
                    <div className="flex gap-2 mt-2">
                      {onEditCourse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCourse(course);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </button>
                      )}
                      {onDeleteCourse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Kurs wirklich löschen?')) {
                              onDeleteCourse(course.id);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <ChevronRight
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-transform ${
                  expandedCourse === course.id ? 'rotate-90' : ''
                }`}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
