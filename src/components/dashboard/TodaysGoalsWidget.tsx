'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Target,
  Swords,
  Clock,
  Trophy,
  ChevronRight,
  Loader2,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Quest {
  id: string;
  type: 'daily' | 'weekly' | 'story';
  status: 'active' | 'completed' | 'failed' | 'archived';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  title: string;
  description: string;
  xp_reward: number;
  progress: number;
  required_actions: number;
  completed_actions: number;
  expires_at?: string;
  created_at: string;
}

interface TodaysGoalsWidgetProps {
  initialQuests?: Quest[];
  onRefresh?: () => void;
}

const DIFFICULTY_COLORS = {
  easy: 'from-green-500 to-emerald-500',
  medium: 'from-blue-500 to-cyan-500',
  hard: 'from-purple-500 to-pink-500',
  epic: 'from-orange-500 to-red-500',
};

const TYPE_ICONS = {
  daily: Clock,
  weekly: Swords,
  story: Trophy,
};

export default function TodaysGoalsWidget({ initialQuests, onRefresh }: TodaysGoalsWidgetProps) {
  const [quests, setQuests] = useState<Quest[]>(initialQuests || []);
  const [loading, setLoading] = useState(!initialQuests);

  useEffect(() => {
    if (!initialQuests) {
      loadTodaysQuests();
    }
  }, [initialQuests]);

  const loadTodaysQuests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quests?status=active');
      const data = await response.json();

      if (response.ok && data.quests) {
        // Filter for today's relevant quests:
        // - Daily quests
        // - Weekly quests expiring this week
        // - Story quests with progress
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

        const todaysQuests = data.quests.filter((quest: Quest) => {
          // Always include daily quests
          if (quest.type === 'daily') return true;

          // Include weekly quests expiring this week
          if (quest.type === 'weekly' && quest.expires_at) {
            const expiresAt = new Date(quest.expires_at);
            return expiresAt <= endOfWeek;
          }

          // Include story quests with any progress or created recently
          if (quest.type === 'story') {
            const createdAt = new Date(quest.created_at);
            const isRecent = (now.getTime() - createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000;
            return quest.progress > 0 || isRecent;
          }

          return false;
        });

        // Sort by: type priority (daily first), then by deadline
        const sorted = todaysQuests.sort((a: Quest, b: Quest) => {
          const typePriority = { daily: 0, weekly: 1, story: 2 };
          if (typePriority[a.type] !== typePriority[b.type]) {
            return typePriority[a.type] - typePriority[b.type];
          }
          // Then by expires_at (soonest first)
          if (a.expires_at && b.expires_at) {
            return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
          }
          return 0;
        });

        setQuests(sorted.slice(0, 5)); // Show max 5 quests
      }
    } catch (error) {
      console.error('Error loading today\'s quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff < 0) return 'Abgelaufen';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}T ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return `< 1h`;
  };

  const isUrgent = (quest: Quest) => {
    if (!quest.expires_at) return false;
    const now = new Date();
    const expires = new Date(quest.expires_at);
    const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft < 6;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-adaptive-muted uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Heute anstehend
        </h3>
        <Link
          href="/quests"
          className="text-xs text-adaptive-muted hover:text-adaptive transition-colors flex items-center gap-1"
        >
          Alle <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-adaptive-muted" />
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm text-adaptive-muted mb-3">Keine aktiven Quests</p>
          <Link
            href="/quests"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors text-sm text-purple-400"
          >
            <Plus className="w-4 h-4" />
            Quest erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map((quest, index) => {
            const TypeIcon = TYPE_ICONS[quest.type];
            const progressPercent = quest.required_actions > 0
              ? Math.round((quest.completed_actions / quest.required_actions) * 100)
              : 0;
            const urgent = isUrgent(quest);

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Link
                  href={`/quests/${quest.id}`}
                  className={`block p-3 rounded-lg transition-all hover:bg-white/10 ${
                    urgent ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${DIFFICULTY_COLORS[quest.difficulty]} bg-opacity-20`}>
                      <TypeIcon className="w-4 h-4 text-white" />
                    </div>

                    {/* Quest Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-adaptive truncate">
                          {quest.title}
                        </span>
                        {urgent && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${DIFFICULTY_COLORS[quest.difficulty]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                          />
                        </div>
                        <span className="text-xs text-adaptive-muted tabular-nums">
                          {quest.completed_actions}/{quest.required_actions}
                        </span>
                      </div>

                      {/* Time remaining */}
                      {quest.expires_at && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          urgent ? 'text-red-400' : 'text-adaptive-dim'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(quest.expires_at)}
                        </div>
                      )}
                    </div>

                    {/* XP Badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full flex-shrink-0">
                      <span className="text-xs font-bold text-yellow-400">{quest.xp_reward}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer Quick Stats */}
      {quests.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-adaptive-muted">
          <span>
            {quests.reduce((sum, q) => sum + q.completed_actions, 0)} / {quests.reduce((sum, q) => sum + q.required_actions, 0)} Schritte heute
          </span>
          <span className="text-yellow-400 font-medium">
            {quests.reduce((sum, q) => sum + q.xp_reward, 0)} XP mgl.
          </span>
        </div>
      )}
    </motion.div>
  );
}
