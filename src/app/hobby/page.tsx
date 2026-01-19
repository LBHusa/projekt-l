'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Clock, FolderOpen, Plus, Play, Pause, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import {
  getHobbyProjects,
  createHobbyProject,
  updateHobbyProject,
  deleteHobbyProject,
  getHobbyStats,
  logHobbyTime,
  getRecentTimeLogs,
  getCategoryInfo,
} from '@/lib/data/hobbys';
import { HobbyProjectForm, TimeLogForm, ProjectTimeCard } from '@/components/hobbys';
import type { HobbyProjectFormData } from '@/components/hobbys';
import type { TimeLogFormData } from '@/components/hobbys';
import type { FactionWithStats, HobbyProject, HobbyTimeLog, HobbyProjectStatus } from '@/lib/database.types';

const STATUS_CONFIG: Record<HobbyProjectStatus, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: 'Aktiv', icon: <Play className="w-3 h-3" />, color: 'text-green-400 bg-green-500/20' },
  paused: { label: 'Pausiert', icon: <Pause className="w-3 h-3" />, color: 'text-yellow-400 bg-yellow-500/20' },
  completed: { label: 'Abgeschlossen', icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-blue-400 bg-blue-500/20' },
  abandoned: { label: 'Aufgegeben', icon: <FolderOpen className="w-3 h-3" />, color: 'text-gray-400 bg-gray-500/20' },
};

export default function HobbysPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [projects, setProjects] = useState<HobbyProject[]>([]);
  const [recentLogs, setRecentLogs] = useState<(HobbyTimeLog & { project?: HobbyProject })[]>([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    activeProjects: 0,
    completedProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTimeLogForm, setShowTimeLogForm] = useState(false);
  const [editingProject, setEditingProject] = useState<HobbyProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      const [factionData, factionStats, projectsData, hobbyStats, logs] = await Promise.all([
        getFaction('hobby'),
        getUserFactionStat('hobby'),
        getHobbyProjects(),
        getHobbyStats(),
        getRecentTimeLogs(undefined, 5),
      ]);

      if (factionData) {
        setFaction({
          ...factionData,
          stats: factionStats,
        });
      }

      setProjects(projectsData);
      setRecentLogs(logs);
      setStats({
        totalHours: hobbyStats.totalHoursAllTime,
        hoursThisWeek: hobbyStats.totalHoursThisWeek,
        hoursThisMonth: hobbyStats.totalHoursThisMonth,
        activeProjects: hobbyStats.activeProjects,
        completedProjects: hobbyStats.completedProjects,
      });
    } catch (err) {
      console.error('Error loading hobbys data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (data: HobbyProjectFormData) => {
    await createHobbyProject(data);
    setShowProjectForm(false);
    await loadData();
  };

  const handleUpdateProject = async (data: HobbyProjectFormData) => {
    if (!editingProject) return;
    await updateHobbyProject(editingProject.id, data);
    setEditingProject(null);
    await loadData();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Projekt wirklich löschen? Alle Zeit-Logs werden ebenfalls gelöscht.')) return;
    await deleteHobbyProject(projectId);
    await loadData();
  };

  const handleLogTime = async (data: TimeLogFormData) => {
    await logHobbyTime(data);
    setShowTimeLogForm(false);
    setSelectedProjectId(undefined);
    await loadData();
  };

  const openTimeLogForProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowTimeLogForm(true);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} Std`;
    return `${hours}h ${mins}m`;
  };

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return then.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-adaptive-muted">Lade Hobby-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Hobbys-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const additionalStats = [
    {
      label: 'Projekte',
      value: projects.length,
      icon: <FolderOpen className="w-4 h-4" />,
      color: 'text-purple-400',
    },
    {
      label: 'Investierte Zeit',
      value: `${Math.round(stats.totalHours)}h`,
      icon: <Clock className="w-4 h-4" />,
      color: 'text-cyan-400',
    },
  ];

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Project Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.activeProjects}</div>
            <div className="text-sm text-adaptive-muted">Aktive Projekte</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.completedProjects}</div>
            <div className="text-sm text-adaptive-muted">Abgeschlossen</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{Math.round(stats.totalHours)}</div>
            <div className="text-sm text-adaptive-muted">Stunden gesamt</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats.hoursThisWeek}</div>
            <div className="text-sm text-adaptive-muted">Std diese Woche</div>
          </div>
        </motion.div>

        {/* Projects List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold">Hobby-Projekte</h2>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
              onClick={() => setShowProjectForm(true)}
            >
              <Plus className="w-4 h-4" />
              Neues Projekt
            </button>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectTimeCard
                  key={project.id}
                  project={project}
                  onEdit={setEditingProject}
                  onDelete={handleDeleteProject}
                  onLogTime={openTimeLogForProject}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-adaptive-dim">
              <Gamepad2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Hobby-Projekte</p>
              <p className="text-sm mt-1">Starte dein erstes Projekt!</p>
            </div>
          )}
        </motion.div>

        {/* Time Investment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold">Zeit-Investment</h2>
            </div>
            <button
              onClick={() => setShowTimeLogForm(true)}
              disabled={activeProjects.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Zeit loggen
            </button>
          </div>

          {/* Time Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-cyan-400">{stats.hoursThisWeek}h</div>
              <div className="text-xs text-adaptive-dim">Diese Woche</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{stats.hoursThisMonth}h</div>
              <div className="text-xs text-adaptive-dim">Dieser Monat</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-adaptive">{Math.round(stats.totalHours)}h</div>
              <div className="text-xs text-adaptive-dim">Gesamt</div>
            </div>
          </div>

          {/* Recent Time Logs */}
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm text-adaptive-muted mb-2">Letzte Einträge</h3>
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{log.project?.icon || '🎯'}</span>
                    <div>
                      <div className="text-sm">{log.project?.name || 'Unbekanntes Projekt'}</div>
                      {log.notes && (
                        <div className="text-xs text-adaptive-dim line-clamp-1">{log.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-cyan-400">
                      {formatDuration(log.duration_minutes)}
                    </div>
                    <div className="text-xs text-adaptive-dim">
                      {formatTimeAgo(log.logged_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-adaptive-dim">
              <p className="text-sm">Noch keine Zeit geloggt</p>
              <p className="text-xs mt-1">Logge Zeit für deine aktiven Projekte</p>
            </div>
          )}
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="hobby"
            factionColor={faction.color}
          />
        </div>
      </main>

      {/* Project Form Modal */}
      {showProjectForm && (
        <HobbyProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowProjectForm(false)}
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <HobbyProjectForm
          project={editingProject}
          onSubmit={handleUpdateProject}
          onCancel={() => setEditingProject(null)}
        />
      )}

      {/* Time Log Form Modal */}
      {showTimeLogForm && (
        <TimeLogForm
          projects={activeProjects}
          selectedProjectId={selectedProjectId}
          onSubmit={handleLogTime}
          onCancel={() => {
            setShowTimeLogForm(false);
            setSelectedProjectId(undefined);
          }}
        />
      )}
    </div>
  );
}
