'use client';

import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock } from 'lucide-react';
import type { HobbyProject, HobbyProjectStatus } from '@/lib/database.types';

interface ProjectTimeCardProps {
  project: HobbyProject;
  onEdit: (project: HobbyProject) => void;
  onDelete: (projectId: string) => void;
  onLogTime: (projectId: string) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  art: { label: '🎨 Art', color: 'bg-pink-500/20 text-pink-400' },
  music: { label: '🎵 Music', color: 'bg-purple-500/20 text-purple-400' },
  gaming: { label: '🎮 Gaming', color: 'bg-blue-500/20 text-blue-400' },
  sports: { label: '⚽ Sports', color: 'bg-green-500/20 text-green-400' },
  reading: { label: '📚 Reading', color: 'bg-yellow-500/20 text-yellow-400' },
  coding: { label: '💻 Coding', color: 'bg-cyan-500/20 text-cyan-400' },
  cooking: { label: '🍳 Cooking', color: 'bg-orange-500/20 text-orange-400' },
  photography: { label: '📷 Photography', color: 'bg-indigo-500/20 text-indigo-400' },
  writing: { label: '✍️ Writing', color: 'bg-teal-500/20 text-teal-400' },
  gardening: { label: '🌱 Gardening', color: 'bg-lime-500/20 text-lime-400' },
  other: { label: '📌 Other', color: 'bg-gray-500/20 text-gray-400' },
};

const STATUS_CONFIG: Record<HobbyProjectStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Paused', color: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: 'Completed', color: 'bg-blue-500/20 text-blue-400' },
  abandoned: { label: 'Abandoned', color: 'bg-gray-500/20 text-gray-400' },
};

const getCategoryColor = (category: string | null): string => {
  if (!category) return CATEGORY_CONFIG.other.color;
  return CATEGORY_CONFIG[category]?.color || CATEGORY_CONFIG.other.color;
};

const getCategoryLabel = (category: string | null): string => {
  if (!category) return CATEGORY_CONFIG.other.label;
  return CATEGORY_CONFIG[category]?.label || CATEGORY_CONFIG.other.label;
};

const getStatusConfig = (status: HobbyProjectStatus) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.active;
};

export default function ProjectTimeCard({
  project,
  onEdit,
  onDelete,
  onLogTime
}: ProjectTimeCardProps) {
  const categoryConfig = getCategoryColor(project.category);
  const statusConfig = getStatusConfig(project.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all border border-white/10 hover:border-purple-500/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{project.icon || '📦'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-adaptive-muted mt-0.5 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Category Badge */}
        {project.category && (
          <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ml-2 ${categoryConfig}`}>
            {getCategoryLabel(project.category)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-adaptive-muted">{project.progress}% Complete</span>
          {project.started_at && (
            <span className="text-xs text-adaptive-dim">
              Started {new Date(project.started_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-adaptive">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="font-medium">{(project.total_hours || 0).toFixed(1)}h</span>
          <span className="text-adaptive-dim">total</span>
        </div>

        {/* Status Badge */}
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(project)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          <span className="text-sm">Edit</span>
        </button>

        <button
          onClick={() => onDelete(project.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Delete</span>
        </button>

        <button
          onClick={() => onLogTime(project.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm">Log Time</span>
        </button>
      </div>
    </motion.div>
  );
}
