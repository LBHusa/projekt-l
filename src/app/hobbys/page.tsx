'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Clock, FolderOpen, Plus, Play, Pause, CheckCircle2 } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import type { FactionWithStats, HobbyProject, HobbyProjectStatus } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_CONFIG: Record<HobbyProjectStatus, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: 'Aktiv', icon: <Play className="w-3 h-3" />, color: 'text-green-400 bg-green-500/20' },
  paused: { label: 'Pausiert', icon: <Pause className="w-3 h-3" />, color: 'text-yellow-400 bg-yellow-500/20' },
  completed: { label: 'Abgeschlossen', icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-blue-400 bg-blue-500/20' },
  abandoned: { label: 'Aufgegeben', icon: <FolderOpen className="w-3 h-3" />, color: 'text-gray-400 bg-gray-500/20' },
};

export default function HobbysPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [projects, setProjects] = useState<HobbyProject[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient();

        const [factionData, factionStats] = await Promise.all([
          getFaction('hobbys'),
          getUserFactionStat('hobbys'),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        // Load hobby projects
        const { data: projectsData, error } = await supabase
          .from('hobby_projects')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('updated_at', { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching projects:', error);
        }

        const loadedProjects = projectsData || [];
        setProjects(loadedProjects);
        setTotalHours(loadedProjects.reduce((sum, p) => sum + (p.total_hours || 0), 0));
      } catch (err) {
        console.error('Error loading hobbys data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-white/50">Lade Hobby-Daten...</p>
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

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const additionalStats = [
    {
      label: 'Projekte',
      value: projects.length,
      icon: <FolderOpen className="w-4 h-4" />,
      color: 'text-purple-400',
    },
    {
      label: 'Investierte Zeit',
      value: `${Math.round(totalHours)}h`,
      icon: <Clock className="w-4 h-4" />,
      color: 'text-cyan-400',
    },
  ];

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
            <div className="text-2xl font-bold text-green-400">{activeProjects}</div>
            <div className="text-sm text-white/50">Aktive Projekte</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{completedProjects}</div>
            <div className="text-sm text-white/50">Abgeschlossen</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{Math.round(totalHours)}</div>
            <div className="text-sm text-white/50">Stunden gesamt</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {projects.length > 0 ? Math.round(totalHours / projects.length) : 0}
            </div>
            <div className="text-sm text-white/50">h/Projekt</div>
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
              onClick={() => {/* TODO: Open create modal */}}
            >
              <Plus className="w-4 h-4" />
              Neues Projekt
            </button>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => {
                const statusConfig = STATUS_CONFIG[project.status];
                return (
                  <div
                    key={project.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{project.icon || '🎯'}</span>
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          {project.category && (
                            <span className="text-xs text-white/40">{project.category}</span>
                          )}
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-white/60 mb-3 line-clamp-2">{project.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {project.total_hours || 0}h
                        </span>
                        {project.progress > 0 && (
                          <span>{project.progress}%</span>
                        )}
                      </div>

                      {project.progress > 0 && (
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Gamepad2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Hobby-Projekte</p>
              <p className="text-sm mt-1">Starte dein erstes Projekt!</p>
            </div>
          )}
        </motion.div>

        {/* Time Investment Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Zeit-Investment</h2>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
              Bald verfugbar
            </span>
          </div>
          <div className="text-center py-6 text-white/40">
            <p>Zeit-Tracking pro Hobby kommt bald</p>
            <p className="text-sm mt-1">Verfolge wie viel Zeit du in deine Hobbys investierst</p>
          </div>
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="hobbys"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}
