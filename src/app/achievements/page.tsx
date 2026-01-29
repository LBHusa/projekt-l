'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Trophy, Lock, Search, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAchievements } from '@/lib/data/achievements';
import type { AchievementWithProgress } from '@/lib/data/achievements';

type FilterCategory = 'all' | 'unlocked' | 'locked';
type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

export default function AchievementsPage() {
  const { userId, loading: authLoading } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading || !userId) return;
    loadAchievements();
  }, [userId, authLoading]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAchievements(userId!);
      setAchievements(data);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Fehler beim Laden der Achievements');
    } finally {
      setLoading(false);
    }
  };

  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    // Status filter
    if (filter === 'unlocked' && !a.is_unlocked) return false;
    if (filter === 'locked' && a.is_unlocked) return false;

    // Rarity filter
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Stats
  const totalUnlocked = achievements.filter(a => a.is_unlocked).length;
  const totalAchievements = achievements.length;
  const progressPercent = totalAchievements > 0
    ? Math.round((totalUnlocked / totalAchievements) * 100)
    : 0;

  // Group by category
  const categories = [...new Set(achievements.map(a => a.category))];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'epic': return 'text-purple-400 bg-purple-400/20 border-purple-400/30';
      case 'rare': return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'Legendaer';
      case 'epic': return 'Episch';
      case 'rare': return 'Selten';
      default: return 'Normal';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-[var(--foreground-muted)]">Lade Achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadAchievements}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--background-secondary)]/80 backdrop-blur-sm border-b border-[var(--orb-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Achievements
              </h1>
              <p className="text-sm text-adaptive-muted">
                {totalUnlocked} von {totalAchievements} freigeschaltet ({progressPercent}%)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--background-secondary)]/80 rounded-xl border border-[var(--orb-border)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Fortschritt</h2>
            <span className="text-2xl font-bold text-yellow-400">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => {
              const count = achievements.filter(a => a.rarity === rarity && a.is_unlocked).length;
              const total = achievements.filter(a => a.rarity === rarity).length;
              return (
                <div key={rarity} className={`p-2 rounded-lg ${getRarityColor(rarity)}`}>
                  <div className="text-lg font-bold">{count}/{total}</div>
                  <div className="text-xs">{getRarityLabel(rarity)}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-adaptive-dim" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-[var(--orb-border)] rounded-lg text-sm focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {(['all', 'unlocked', 'locked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  filter === f
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'text-adaptive-muted hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'unlocked' ? 'Freigeschaltet' : 'Gesperrt'}
              </button>
            ))}
          </div>

          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
            className="px-3 py-2 bg-white/5 border border-[var(--orb-border)] rounded-lg text-sm focus:outline-none"
          >
            <option value="all">Alle Seltenheiten</option>
            <option value="common">Normal</option>
            <option value="rare">Selten</option>
            <option value="epic">Episch</option>
            <option value="legendary">Legendaer</option>
          </select>
        </div>

        {/* Achievements Grid */}
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 mx-auto mb-3 text-adaptive-dim" />
            <p className="text-adaptive-muted">Keine Achievements gefunden</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-4 rounded-xl border ${
                  achievement.is_unlocked
                    ? `${getRarityColor(achievement.rarity)} border`
                    : 'bg-white/5 border-white/10 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`text-4xl ${!achievement.is_unlocked && 'grayscale opacity-50'}`}>
                    {achievement.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{achievement.name}</h3>
                      {achievement.is_unlocked ? (
                        <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-adaptive-dim flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-adaptive-muted line-clamp-2">
                      {achievement.description}
                    </p>

                    {/* Progress */}
                    {!achievement.is_unlocked && achievement.current_progress > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-adaptive-dim mb-1">
                          <span>Fortschritt</span>
                          <span>{achievement.current_progress}/{achievement.requirement_value}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500/50"
                            style={{
                              width: `${(achievement.current_progress / achievement.requirement_value) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rewards & Info */}
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${getRarityColor(achievement.rarity)}`}>
                        {getRarityLabel(achievement.rarity)}
                      </span>
                      <span className="text-yellow-400">+{achievement.xp_reward} XP</span>
                      {achievement.unlocked_at && (
                        <span className="text-adaptive-dim">
                          {new Date(achievement.unlocked_at).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
