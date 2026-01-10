'use client';

import { motion } from 'framer-motion';
import { Briefcase, Plus, Edit2, Trash2, TrendingUp, Clock, Euro } from 'lucide-react';
import type { FreelanceProject, FreelanceClient } from '@/lib/database.types';

interface ProjectListProps {
  projects: (FreelanceProject & { client?: FreelanceClient })[];
  onAddProject: () => void;
  onEditProject: (project: FreelanceProject) => void;
  onDeleteProject: (projectId: string) => void;
}

const statusColors = {
  planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  planning: 'Planung',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
};

export function ProjectList({ projects, onAddProject, onEditProject, onDeleteProject }: ProjectListProps) {
  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Projekte</h3>
            <p className="text-sm text-white/50">{projects.length} gesamt</p>
          </div>
        </div>
        <button
          onClick={onAddProject}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Neues Projekt</span>
        </button>
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Noch keine Projekte angelegt</p>
          <button
            onClick={onAddProject}
            className="mt-4 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Erstes Projekt anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[var(--background-tertiary)] rounded-lg p-4 border border-amber-500/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{project.name}</h4>
                  {project.client && (
                    <p className="text-sm text-white/60">
                      Kunde: {project.client.name}
                    </p>
                  )}
                  {project.description && (
                    <p className="text-sm text-white/50 mt-1">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs border ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {project.actual_cost > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4 text-green-400" />
                    <span className="text-white/70">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: project.currency,
                        maximumFractionDigits: 0,
                      }).format(project.actual_cost)}
                    </span>
                  </div>
                )}

                {project.actual_hours > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-white/70">
                      {project.actual_hours}h
                    </span>
                  </div>
                )}

                {project.hourly_rate && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-white/70">
                      {project.hourly_rate}€/h
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {(project.start_date || project.end_date) && (
                <div className="text-sm text-white/50 mb-3">
                  {project.start_date && (
                    <span>
                      Start: {new Date(project.start_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {project.start_date && project.end_date && <span className="mx-2">•</span>}
                  {project.end_date && (
                    <span>
                      Ende: {new Date(project.end_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => onEditProject(project)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Projekt "${project.name}" wirklich löschen?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 transition-colors text-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
