'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import type { PersonalRecord } from '@/lib/database.types';
import { getPersonalRecords, MUSCLE_GROUP_CONFIG } from '@/lib/data/trainingslog';

export default function PersonalRecordsCard() {
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    const data = await getPersonalRecords();
    setPRs(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold">Personal Records</h2>
        </div>
        <div className="text-center py-6 text-adaptive-dim">Laden...</div>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold">Personal Records</h2>
        </div>
        <div className="text-center py-6 text-adaptive-dim">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine PRs</p>
          <p className="text-sm mt-1">Deine besten Leistungen erscheinen hier</p>
        </div>
      </div>
    );
  }

  // Show top 5 PRs
  const topPRs = prs.slice(0, 5);

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="font-semibold">Personal Records</h2>
        <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
          Top {topPRs.length}
        </span>
      </div>

      <div className="space-y-3">
        {topPRs.map((pr) => {
          const muscleConfig = MUSCLE_GROUP_CONFIG[pr.muscle_group];
          return (
            <div
              key={pr.exercise_id}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{muscleConfig.icon}</span>
                  <div>
                    <h3 className="font-medium">{pr.exercise_name}</h3>
                    <span className={`text-xs ${muscleConfig.color}`}>
                      {muscleConfig.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-yellow-400">
                    {pr.max_weight} kg
                  </div>
                  <div className="text-xs text-adaptive-dim">
                    {pr.reps_at_max} Wdh.
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-adaptive-dim">
                Erreicht: {new Date(pr.achieved_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          );
        })}
      </div>

      {prs.length > 5 && (
        <div className="mt-3 text-center text-sm text-adaptive-dim">
          +{prs.length - 5} weitere PRs
        </div>
      )}
    </div>
  );
}
