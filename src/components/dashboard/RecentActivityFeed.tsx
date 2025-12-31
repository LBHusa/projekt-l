'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Trophy, Dumbbell, BookOpen, Briefcase, Users, Target } from 'lucide-react';
import { getRecentActivity } from '@/lib/data/activity-log';
import type { ActivityLog, FactionId } from '@/lib/database.types';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  xp_gained: <Zap className="w-4 h-4" />,
  level_up: <Trophy className="w-4 h-4" />,
  workout_logged: <Dumbbell className="w-4 h-4" />,
  book_finished: <BookOpen className="w-4 h-4" />,
  course_completed: <BookOpen className="w-4 h-4" />,
  job_started: <Briefcase className="w-4 h-4" />,
  salary_update: <Briefcase className="w-4 h-4" />,
  goal_achieved: <Target className="w-4 h-4" />,
  social_event: <Users className="w-4 h-4" />,
  habit_completed: <Target className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  xp_gained: 'text-yellow-400 bg-yellow-400/20',
  level_up: 'text-purple-400 bg-purple-400/20',
  workout_logged: 'text-green-400 bg-green-400/20',
  book_finished: 'text-blue-400 bg-blue-400/20',
  course_completed: 'text-cyan-400 bg-cyan-400/20',
  job_started: 'text-amber-400 bg-amber-400/20',
  salary_update: 'text-emerald-400 bg-emerald-400/20',
  goal_achieved: 'text-pink-400 bg-pink-400/20',
  social_event: 'text-indigo-400 bg-indigo-400/20',
  habit_completed: 'text-orange-400 bg-orange-400/20',
};

const FACTION_COLORS: Record<FactionId, string> = {
  karriere: '#F59E0B',
  familie: '#EF4444',
  hobbys: '#8B5CF6',
  gesundheit: '#10B981',
  lernen: '#3B82F6',
  freunde: '#EC4899',
  finanzen: '#14B8A6',
};

interface RecentActivityFeedProps {
  limit?: number;
  factionId?: FactionId;
}

export default function RecentActivityFeed({ limit = 8, factionId }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FactionId | 'all'>('all');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getRecentActivity(limit);
        setActivities(data);
      } catch (err) {
        console.error('Error loading activities:', err);
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, [limit]);

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.faction_id === filter);

  const formatTimeAgo = (date: string) => {
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
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-white/10 rounded w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white/60" />
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Letzte Aktivitäten
          </h3>
        </div>
      </div>

      {/* Filter */}
      {!factionId && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Alle
          </FilterButton>
          {(['karriere', 'gesundheit', 'lernen', 'finanzen', 'hobbys', 'familie', 'freunde'] as FactionId[]).map((f) => (
            <FilterButton
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
              color={FACTION_COLORS[f]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </FilterButton>
          ))}
        </div>
      )}

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-10 h-10 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Noch keine Aktivitäten</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  ACTIVITY_COLORS[activity.activity_type] || 'text-white/60 bg-white/10'
                }`}
              >
                {ACTIVITY_ICONS[activity.activity_type] || <Activity className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 line-clamp-1">
                  {activity.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/40">
                    {formatTimeAgo(activity.occurred_at)}
                  </span>
                  {activity.faction_id && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${FACTION_COLORS[activity.faction_id]}20`,
                        color: FACTION_COLORS[activity.faction_id],
                      }}
                    >
                      {activity.faction_id}
                    </span>
                  )}
                </div>
              </div>

              {/* XP Badge */}
              {activity.xp_amount > 0 && (
                <span className="text-xs text-yellow-400 font-medium flex-shrink-0">
                  +{activity.xp_amount} XP
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface FilterButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}

function FilterButton({ children, active, onClick, color }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-white/20 text-white'
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
      }`}
      style={active && color ? { backgroundColor: `${color}30`, color } : undefined}
    >
      {children}
    </button>
  );
}
