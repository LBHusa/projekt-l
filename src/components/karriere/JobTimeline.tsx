'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Calendar, ChevronRight, Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import type { JobHistory } from '@/lib/database.types';

interface JobTimelineProps {
  jobs: JobHistory[];
  onAddJob?: () => void;
  onEditJob?: (job: JobHistory) => void;
  onDeleteJob?: (jobId: string) => void;
}

export default function JobTimeline({
  jobs,
  onAddJob,
  onEditJob,
  onDeleteJob,
}: JobTimelineProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return `${remainingMonths} Mon.`;
    } else if (remainingMonths === 0) {
      return `${years} Jahr${years > 1 ? 'e' : ''}`;
    }
    return `${years} J. ${remainingMonths} Mon.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-400" />
          Karriere-Timeline
        </h2>
        {onAddJob && (
          <button
            onClick={onAddJob}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Job hinzufügen
          </button>
        )}
      </div>

      {/* Timeline */}
      {jobs.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Jobs eingetragen</p>
          {onAddJob && (
            <button
              onClick={onAddJob}
              className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Ersten Job hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />

          {/* Jobs */}
          <div className="space-y-4">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative pl-14"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-4 top-4 w-5 h-5 rounded-full border-2 ${
                    job.is_current
                      ? 'bg-green-500 border-green-400'
                      : 'bg-[var(--background-secondary)] border-white/30'
                  }`}
                />

                {/* Job Card */}
                <div
                  className={`bg-white/5 border rounded-lg p-4 cursor-pointer transition-all ${
                    job.is_current
                      ? 'border-green-500/30 hover:border-green-500/50'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.position}</h3>
                        {job.is_current && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                            Aktuell
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Building2 className="w-4 h-4" />
                        <span>{job.company}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/50 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(job.start_date)} - {job.end_date ? formatDate(job.end_date) : 'Heute'}
                      </div>
                      <div className="text-xs text-white/30 mt-1">
                        {calculateDuration(job.start_date, job.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedJob === job.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-2">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                      )}
                      {job.employment_type && (
                        <div className="text-sm text-white/50 mb-2">
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs">
                            {job.employment_type === 'full_time' && 'Vollzeit'}
                            {job.employment_type === 'part_time' && 'Teilzeit'}
                            {job.employment_type === 'freelance' && 'Freelance'}
                            {job.employment_type === 'contract' && 'Befristet'}
                            {job.employment_type === 'internship' && 'Praktikum'}
                          </span>
                        </div>
                      )}
                      {job.description && (
                        <p className="text-sm text-white/60">{job.description}</p>
                      )}

                      {/* Actions */}
                      {(onEditJob || onDeleteJob) && (
                        <div className="flex gap-2 mt-4">
                          {onEditJob && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditJob(job);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              Bearbeiten
                            </button>
                          )}
                          {onDeleteJob && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Job wirklich löschen?')) {
                                  onDeleteJob(job.id);
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
                      expandedJob === job.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
