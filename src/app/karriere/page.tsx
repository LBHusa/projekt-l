'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Target, TrendingUp, Clock } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { JobTimeline, SalaryChart, JobForm, SalaryForm, type JobFormData, type SalaryFormData } from '@/components/karriere';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import { getJobHistory, getSalaryHistory, getKarriereStats, getCurrentSalary, type KarriereStats } from '@/lib/data/karriere';
import type { FactionWithStats, JobHistory, SalaryEntry } from '@/lib/database.types';

export default function KarrierePage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [jobs, setJobs] = useState<JobHistory[]>([]);
  const [salaries, setSalaries] = useState<(SalaryEntry & { job?: JobHistory })[]>([]);
  const [stats, setStats] = useState<KarriereStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobHistory | null>(null);
  const [showSalaryForm, setShowSalaryForm] = useState(false);

  const loadData = async () => {
    try {
      const [factionData, factionStats, jobsData, salariesData, karriereStats] = await Promise.all([
        getFaction('karriere'),
        getUserFactionStat('karriere'),
        getJobHistory(),
        getSalaryHistory(),
        getKarriereStats(),
      ]);

      if (factionData) {
        setFaction({
          ...factionData,
          stats: factionStats,
        });
      }

      setJobs(jobsData);
      setSalaries(salariesData);
      setStats(karriereStats);
    } catch (err) {
      console.error('Error loading karriere data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Job handlers
  const handleAddJob = () => {
    setEditingJob(null);
    setShowJobForm(true);
  };

  const handleEditJob = (job: JobHistory) => {
    setEditingJob(job);
    setShowJobForm(true);
  };

  const handleJobSubmit = async (data: JobFormData) => {
    const { createJob, updateJob } = await import('@/lib/data/karriere');
    const userId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth

    if (editingJob) {
      await updateJob(editingJob.id, data);
    } else {
      await createJob(data, userId);
    }

    setShowJobForm(false);
    setEditingJob(null);
    await loadData();
  };

  const handleDeleteJob = async (jobId: string) => {
    const { deleteJob } = await import('@/lib/data/karriere');
    await deleteJob(jobId);
    await loadData();
  };

  // Salary handlers
  const handleAddSalary = () => {
    setShowSalaryForm(true);
  };

  const handleSalarySubmit = async (data: SalaryFormData) => {
    const { createSalaryEntry } = await import('@/lib/data/karriere');
    const userId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth
    await createSalaryEntry(data, userId);
    setShowSalaryForm(false);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-white/50">Lade Karriere-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Karriere-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  // Additional stats for the stats bar
  const additionalStats = [];
  if (stats) {
    if (stats.yearsExperience > 0) {
      additionalStats.push({
        label: 'Berufserfahrung',
        value: `${stats.yearsExperience} J.`,
        icon: <Clock className="w-4 h-4" />,
        color: 'text-cyan-400',
      });
    }
    if (stats.activeGoals > 0) {
      additionalStats.push({
        label: 'Aktive Ziele',
        value: stats.activeGoals,
        icon: <Target className="w-4 h-4" />,
        color: 'text-pink-400',
      });
    }
    if (stats.salaryGrowth !== 0) {
      additionalStats.push({
        label: 'Gehaltswachstum',
        value: `${stats.salaryGrowth > 0 ? '+' : ''}${stats.salaryGrowth}%`,
        icon: <TrendingUp className="w-4 h-4" />,
        color: stats.salaryGrowth >= 0 ? 'text-green-400' : 'text-red-400',
      });
    }
  }

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

        {/* Current Job Highlight */}
        {stats?.currentJob && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 md:p-6"
          >
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Briefcase className="w-4 h-4" />
              Aktueller Job
            </div>
            <h2 className="text-xl font-bold mb-1">{stats.currentJob.position}</h2>
            <p className="text-white/70">{stats.currentJob.company}</p>
            {stats.currentSalary && (
              <div className="mt-3 text-sm text-amber-400">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: stats.currentSalary.currency || 'EUR',
                  maximumFractionDigits: 0,
                }).format(stats.currentSalary.amount)}
                {stats.currentSalary.period === 'monthly' ? '/Monat' : '/Jahr'}
              </div>
            )}
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Job Timeline */}
          <JobTimeline
            jobs={jobs}
            onAddJob={handleAddJob}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
          />

          {/* Salary Chart */}
          <SalaryChart
            salaries={salaries}
            currentSalary={stats?.currentSalary}
            onAddSalary={handleAddSalary}
          />
        </div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="karriere"
            factionColor={faction.color}
          />
        </div>
      </main>

      {/* Forms */}
      <JobForm
        job={editingJob}
        isOpen={showJobForm}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSubmit={handleJobSubmit}
      />

      <SalaryForm
        jobs={jobs}
        defaultJobId={stats?.currentJob?.id}
        isOpen={showSalaryForm}
        onClose={() => setShowSalaryForm(false)}
        onSubmit={handleSalarySubmit}
      />
    </div>
  );
}
