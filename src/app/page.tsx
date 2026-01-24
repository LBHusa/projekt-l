'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Orb from '@/components/Orb';
import CharacterHeader from '@/components/CharacterHeader';
import AttributesPanel from '@/components/AttributesPanel';
import MentalStatsPanel from '@/components/MentalStatsPanel';
import {
  AchievementBadgeWidget,
  ClickableLifeBalanceRadar,
  HabitTrackerWidget,
  RecentActivityFeed,
  QuickActionsWidget,
  FactionStatsWidget,
  StreakHighlightWidget,
  TimeTrackingWidget,
  WeeklySummary,
  HabitCompletionModal,
  MoodLogModal,
  QuickTransactionModal,
} from '@/components/dashboard';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Heart, AlertCircle, Settings, Flame, Download, Bot, Swords, Plus } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getAllDomains, createDomainWithFactions, getDomainByName } from '@/lib/data/domains';
import { getUserProfile, getDomainStats, getTotalSkillCount, calculateAttributes } from '@/lib/data/user-skills';
import { getFactionsWithStats } from '@/lib/data/factions';
import { getContactsStats, getUpcomingBirthdays, getContactsNeedingAttention } from '@/lib/data/contacts';
import { UpcomingBirthdays, NeedingAttention } from '@/components/contacts';
import { logHabitCompletion } from '@/lib/data/habits';
import { saveMoodLog } from '@/lib/data/geist';
import { createTransaction, getAccounts } from '@/lib/data/finanzen';
import type { SkillDomain, UserAttributes, MentalStats, FactionWithStats, Account, MoodValue } from '@/lib/database.types';
import type { ContactWithStats } from '@/lib/types/contacts';
import type { QuickTransactionData } from '@/components/dashboard/modals/QuickTransactionModal';
import DomainForm, { type DomainFormData } from '@/components/DomainForm';

interface DomainWithLevel extends SkillDomain {
  level: number;
}

// Default attributes for fallback
const DEFAULT_ATTRIBUTES: UserAttributes = {
  str: 10,
  dex: 10,
  int: 10,
  cha: 10,
  wis: 10,
  vit: 10,
};


// Default mental stats for fallback
const DEFAULT_MENTAL_STATS: MentalStats = {
  stimmung: 50,
  motivation: 50,
  stress: 50,
  fokus: 50,
  kreativitaet: 50,
  soziale_batterie: 50,
};

interface UserProfileState {
  username: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  totalLevel: number;
  totalXp: number;
  attributes: UserAttributes;
  mentalStats: MentalStats;
}

export default function Dashboard() {
  const [domains, setDomains] = useState<DomainWithLevel[]>([]);
  const { userId, loading: authLoading } = useAuth();
  const [factions, setFactions] = useState<FactionWithStats[]>([]);
  const [contactsStats, setContactsStats] = useState<{
    total: number;
    favorites: number;
    needingAttention: number;
  } | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<ContactWithStats[]>([]);
  const [attentionContacts, setAttentionContacts] = useState<ContactWithStats[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileState>({
    username: null,
    avatarUrl: null,
    avatarSeed: null,
    totalLevel: 1,
    totalXp: 0,
    attributes: DEFAULT_ATTRIBUTES,
    mentalStats: DEFAULT_MENTAL_STATS,
  });
  const [totalSkillCount, setTotalSkillCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showDomainForm, setShowDomainForm] = useState(false);

  // Load data function - uses Promise.allSettled to prevent cascade failures
  const loadData = async () => {
    try {
      // Load all data in parallel with graceful error handling
      const results = await Promise.allSettled([
        getAllDomains(),
        getDomainByName('Familie'),
        getUserProfile(userId!),
        getTotalSkillCount(),
        getContactsStats(),
        getUpcomingBirthdays(14),
        getContactsNeedingAttention(5),
        getFactionsWithStats(userId!),
        getAccounts(userId!),
        calculateAttributes(userId!),
      ]);

      // Extract values with fallbacks for failed requests
      const domainsData = results[0].status === 'fulfilled' ? results[0].value : [];
      const familieDomain = results[1].status === 'fulfilled' ? results[1].value : null;
      const profile = results[2].status === 'fulfilled' ? results[2].value : null;
      const skillCount = results[3].status === 'fulfilled' ? results[3].value : 0;
      const contactStats = results[4].status === 'fulfilled' ? results[4].value : null;
      const birthdays = results[5].status === 'fulfilled' ? results[5].value : [];
      const attention = results[6].status === 'fulfilled' ? results[6].value : [];
      const factionsData = results[7].status === 'fulfilled' ? results[7].value : [];
      const accountsData = results[8].status === 'fulfilled' ? results[8].value : [];
      const calculatedAttrs = results[9].status === 'fulfilled' ? results[9].value : null;

      // Log any failed requests for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Dashboard data load failed for index ${index}:`, result.reason);
        }
      });

      // Filter out Familie domain (now replaced by Contacts button)
      const filteredDomains = familieDomain
        ? domainsData.filter((domain) => domain.id !== familieDomain.id)
        : domainsData;

      // Load user levels for each domain with graceful error handling
      const domainResults = await Promise.allSettled(
        filteredDomains.map(async (domain) => {
          const stats = await getDomainStats(domain.id);
          return {
            ...domain,
            level: stats.averageLevel || 1,
          };
        })
      );

      const domainsWithLevels = domainResults
        .filter((r): r is PromiseFulfilledResult<DomainWithLevel> => r.status === 'fulfilled')
        .map(r => r.value);

      setDomains(domainsWithLevels);
      setFactions(factionsData);
      setContactsStats(contactStats);
      setTotalSkillCount(skillCount);
      setUpcomingBirthdays(birthdays);
      setAttentionContacts(attention);
      setAccounts(accountsData);

      // Set user profile with attributes and mental stats
      if (profile) {
        setUserProfile({
          username: profile.username,
          avatarUrl: profile.avatar_url,
          avatarSeed: profile.avatar_seed,
          totalLevel: profile.total_level,
          // Compute totalXp from factions (single source of truth)
          totalXp: factionsData.reduce((sum, f) => sum + (f.stats?.total_xp || 0), 0),
          attributes: calculatedAttrs || profile.attributes || DEFAULT_ATTRIBUTES,
          mentalStats: profile.mental_stats || DEFAULT_MENTAL_STATS,
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !userId) return;
    loadData();
  }, [userId, authLoading]);

  // Modal handlers
  const handleHabitsComplete = async (habitIds: string[]) => {
    try {
      const results = await Promise.all(
        habitIds.map((id) => logHabitCompletion(id, true))
      );
      const totalXP = results.reduce((sum, r) => sum + (r?.xpGained || 0), 0);

      setHabitModalOpen(false);
      await loadData(); // Refresh dashboard
    } catch (error) {
      console.error('Error completing habits:', error);
    }
  };

  const handleMoodLog = async (mood: MoodValue, note?: string) => {
    try {
      await saveMoodLog(mood, note);
      setMoodModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  const handleTransactionCreate = async (data: QuickTransactionData) => {
    try {
      await createTransaction(data);
      setTransactionModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleDomainCreate = async (data: DomainFormData) => {
    try {
      const factionsMapped = data.factions.map(f => ({
        faction_id: f.faction_id,
        weight: f.weight,
        is_primary: f.is_primary,
      }));
      
      await createDomainWithFactions(
        {
          name: data.name,
          icon: data.icon,
          color: data.color,
          description: data.description,
        },
        factionsMapped
      );
      
      setShowDomainForm(false);
      await loadData();
    } catch (error) {
      console.error("Error creating domain:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] animate-pulse mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Character Info */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <CharacterHeader
            username={userProfile.username}
            avatarUrl={userProfile.avatarUrl}
            avatarSeed={userProfile.avatarSeed}
            totalLevel={userProfile.totalLevel}
            totalXp={userProfile.totalXp}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/settings"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5 text-adaptive-muted" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Character Stats: Attributes + Life Balance + Mental Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            <AttributesPanel attributes={userProfile.attributes} />
            <ClickableLifeBalanceRadar factions={factions} />
            <MentalStatsPanel stats={userProfile.mentalStats} />
          </div>

          {/* Faction Stats Widget - Full Width */}
          <div className="mb-8">
            <FactionStatsWidget factions={factions} />
          </div>

          {/* Data Export Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-adaptive text-lg">Daten exportieren</h3>
                    <p className="text-sm text-adaptive-muted">Exportiere alle deine Projekt L Daten</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => window.location.href = '/api/export?format=json'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  JSON Export
                </button>
                <button
                  onClick={() => window.location.href = '/api/export?format=csv'}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV Export
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions + Habits + Time Tracking + Streak Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <QuickActionsWidget
              onOpenHabitModal={() => setHabitModalOpen(true)}
              onOpenMoodModal={() => setMoodModalOpen(true)}
              onOpenTransactionModal={() => setTransactionModalOpen(true)}
            />
            <HabitTrackerWidget />
            <TimeTrackingWidget />
            <StreakHighlightWidget />
          </div>


          {/* AI & Quests Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Questmaster Card */}
            <Link href="/quests" className="block">
              <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6 hover:border-purple-500/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Swords className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-adaptive">Questmaster</h3>
                    <p className="text-adaptive-muted text-sm">Tägliche & wöchentliche Quests</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* AI Skill-Coach Card */}
            <Link href="/ai-chat-demo" className="block">
              <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6 hover:border-cyan-500/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <Bot className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-adaptive">AI Skill-Coach</h3>
                    <p className="text-adaptive-muted text-sm">Persönlicher Lern-Assistent</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
          {/* Achievements Row */}
          <div className="mb-8">
            <AchievementBadgeWidget />
          </div>

          {/* Weekly Summary + Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <WeeklySummary />
            <RecentActivityFeed limit={6} />
          </div>

          {/* Contacts Section */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <Link href="/contacts">
                <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-4 hover:from-pink-500/30 hover:to-purple-500/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-adaptive">Kontakte</h3>
                        <p className="text-xs text-adaptive-muted">Familie & Freunde</p>
                      </div>
                    </div>
                    {contactsStats && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-center">
                          <span className="text-lg font-bold text-adaptive">{contactsStats.total}</span>
                        </div>
                        {contactsStats.favorites > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            <Heart className="w-4 h-4" fill="currentColor" />
                            {contactsStats.favorites}
                          </span>
                        )}
                        {contactsStats.needingAttention > 0 && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {contactsStats.needingAttention}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {/* Habits Quick Link */}
              <Link href="/habits">
                <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-xl p-4 hover:from-orange-500/30 hover:to-amber-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-adaptive">Habits verwalten</h3>
                      <p className="text-xs text-adaptive-muted">Gewohnheiten aufbauen & tracken</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* AI Chat Quick Link */}
              <Link href="/ai-chat-demo">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 hover:from-purple-500/30 hover:to-pink-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-adaptive">AI Skill-Coach</h3>
                      <p className="text-xs text-adaptive-muted">Skills per Chat verwalten</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Quest System Quick Link */}
              <Link href="/quests">
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                      <Swords className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-adaptive">Quest System</h3>
                      <p className="text-xs text-adaptive-muted">AI-generierte Herausforderungen</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Birthday & Attention Widgets */}
              {(upcomingBirthdays.length > 0 || attentionContacts.length > 0) && (
                <div className="space-y-4">
                  {upcomingBirthdays.length > 0 && (
                    <UpcomingBirthdays contacts={upcomingBirthdays} maxDisplay={2} />
                  )}
                  {attentionContacts.length > 0 && (
                    <NeedingAttention contacts={attentionContacts} maxDisplay={2} />
                  )}
                </div>
              )}
            </motion.div>
          </div>

          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <h2 className="text-2xl font-bold">Skill-Bereiche</h2>
              <motion.button
                onClick={() => setShowDomainForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Neuen Bereich erstellen"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Neu</span>
              </motion.button>
            </div>
            <p className="text-[var(--foreground-muted)]">
              Wähle einen Bereich, um deine Skills zu erkunden
            </p>
          </motion.div>

          {/* Orbs Grid */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {domains.map((domain, index) => (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.6 + index * 0.08,
                  type: 'spring',
                  stiffness: 200,
                }}
              >
                <Orb
                  id={domain.id}
                  name={domain.name}
                  icon={domain.icon}
                  color={domain.color}
                  level={domain.level}
                  href={`/domain/${domain.id}`}
                  size="lg"
                  showParticles
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-3 gap-4 md:gap-8 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <div className="bg-[var(--background-secondary)]/50 rounded-xl p-4 text-center border border-[var(--orb-border)]">
              <div className="text-2xl md:text-3xl font-bold text-[var(--accent-primary)]">
                {totalSkillCount}
              </div>
              <div className="text-xs md:text-sm text-[var(--foreground-muted)]">Skills</div>
            </div>
            <div className="bg-[var(--background-secondary)]/50 rounded-xl p-4 text-center border border-[var(--orb-border)]">
              <div className="text-2xl md:text-3xl font-bold text-[var(--accent-secondary)]">
                {userProfile.totalXp >= 1000
                  ? `${(userProfile.totalXp / 1000).toFixed(1)}K`
                  : userProfile.totalXp}
              </div>
              <div className="text-xs md:text-sm text-[var(--foreground-muted)]">Gesamt-XP</div>
            </div>
            <div className="bg-[var(--background-secondary)]/50 rounded-xl p-4 text-center border border-[var(--orb-border)]">
              <div className="text-2xl md:text-3xl font-bold text-[var(--accent-success)]">
                {domains.length}
              </div>
              <div className="text-xs md:text-sm text-[var(--foreground-muted)]">Bereiche</div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--orb-border)] bg-[var(--background-secondary)]/30">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-sm text-[var(--foreground-muted)]">
          Projekt L - Life Gamification System
        </div>
      </footer>

      {/* Quick Actions Modals */}
      <HabitCompletionModal
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onComplete={handleHabitsComplete}
      />

      <MoodLogModal
        isOpen={moodModalOpen}
        onClose={() => setMoodModalOpen(false)}
        onSubmit={handleMoodLog}
      />

      <QuickTransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSubmit={handleTransactionCreate}
        accounts={accounts}
      />

      <DomainForm
        isOpen={showDomainForm}
        onClose={() => setShowDomainForm(false)}
        onSubmit={handleDomainCreate}
        mode="create"
      />
    </div>
  );
}
