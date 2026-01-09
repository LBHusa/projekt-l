'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  Trophy,
  Dumbbell,
  BookOpen,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Target,
  Users,
  CheckCircle,
  Smile,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import { getRecentActivity } from '@/lib/data/activity-log';
import type { ActivityLog, FactionId } from '@/lib/database.types';
import { FACTION_COLORS, FACTION_ORDER, ACTIVITY_COLORS } from '@/lib/ui/constants';

const ACTIVITY_TYPE_ICONS: Record<string, React.ReactNode> = {
  xp_gained: <Zap className="w-4 h-4" />,
  level_up: <Trophy className="w-4 h-4" />,
  workout_logged: <Dumbbell className="w-4 h-4" />,
  book_finished: <BookOpen className="w-4 h-4" />,
  course_completed: <GraduationCap className="w-4 h-4" />,
  job_started: <Briefcase className="w-4 h-4" />,
  salary_updated: <TrendingUp className="w-4 h-4" />,
  salary_update: <TrendingUp className="w-4 h-4" />,
  goal_achieved: <Target className="w-4 h-4" />,
  event_logged: <Users className="w-4 h-4" />,
  social_event: <Users className="w-4 h-4" />,
  habit_completed: <CheckCircle className="w-4 h-4" />,
  mood_logged: <Smile className="w-4 h-4" />,
  transaction_added: <DollarSign className="w-4 h-4" />,
};

interface GroupedActivities {
  date: string;
  label: string;
  activities: ActivityLog[];
  isToday: boolean;
}

function groupActivitiesByDay(activities: ActivityLog[]): GroupedActivities[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups: Record<string, ActivityLog[]> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.occurred_at);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  const sorted = Object.entries(groups)
    .map(([dateKey, acts]) => {
      const date = new Date(dateKey);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      let label: string;
      if (diffDays === 0) label = 'Heute';
      else if (diffDays === 1) label = 'Gestern';
      else if (diffDays <= 7) label = `Vor ${diffDays} Tagen`;
      else label = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

      return {
        date: dateKey,
        label,
        activities: acts,
        isToday: diffDays === 0,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return sorted;
}

interface RecentActivityFeedProps {
  limit?: number;
  factionId?: FactionId;
}

export default function RecentActivityFeed({ limit = 8, factionId }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FactionId | 'all'>('all');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(['today', 'yesterday'])
  );

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

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
          <Activity className="w-5 h-5 text-adaptive-muted" />
          <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider">
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
          {FACTION_ORDER.map((f) => (
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
          <p className="text-adaptive-dim text-sm">Noch keine Aktivitäten</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupActivitiesByDay(filteredActivities).map((group) => {
            const dayKey =
              group.label === 'Heute'
                ? 'today'
                : group.label === 'Gestern'
                ? 'yesterday'
                : group.date;
            const isExpanded = expandedDays.has(dayKey);

            return (
              <div
                key={group.date}
                className="border-b border-[var(--orb-border)] last:border-0 pb-3"
              >
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(dayKey)}
                  className="flex items-center justify-between w-full mb-2 hover:opacity-80 transition"
                >
                  <h3 className="text-sm font-semibold text-adaptive">
                    {group.label}
                    <span className="ml-2 text-xs text-adaptive-dim">
                      ({group.activities.length})
                    </span>
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Activities (collapsible) */}
                {isExpanded && (
                  <div className="space-y-2">
                    {group.activities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {/* Activity Type Icon (primary) */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            ACTIVITY_COLORS[activity.activity_type] ||
                            'text-white/60 bg-white/10'
                          }`}
                        >
                          {ACTIVITY_TYPE_ICONS[activity.activity_type] || (
                            <Activity className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-adaptive line-clamp-1">
                            {activity.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            {/* Faction Badge (secondary) */}
                            {activity.faction_id && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${FACTION_COLORS[activity.faction_id]}20`,
                                  color: FACTION_COLORS[activity.faction_id],
                                }}
                              >
                                {activity.faction_id}
                              </span>
                            )}

                            {/* XP Badge */}
                            {activity.xp_amount > 0 && (
                              <span className="text-xs text-green-400">
                                +{activity.xp_amount} XP
                              </span>
                            )}

                            {/* Timestamp */}
                            <span className="text-xs text-adaptive-dim opacity-60">
                              {new Date(activity.occurred_at).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          ? 'bg-white/20 text-adaptive'
          : 'bg-white/5 text-adaptive-muted hover:bg-white/10 hover:text-adaptive'
      }`}
      style={active && color ? { backgroundColor: `${color}30`, color } : undefined}
    >
      {children}
    </button>
  );
}
