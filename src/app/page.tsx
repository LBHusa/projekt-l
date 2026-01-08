'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/dashboard';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Heart, AlertCircle, Settings, Flame, Download } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getAllDomains } from '@/lib/data/domains';
import { getUserProfile, getDomainStats, getTotalSkillCount } from '@/lib/data/user-skills';
import { getFactionsWithStats } from '@/lib/data/factions';
import { getContactsStats, getUpcomingBirthdays, getContactsNeedingAttention } from '@/lib/data/contacts';
import { UpcomingBirthdays, NeedingAttention } from '@/components/contacts';
import type { SkillDomain, UserAttributes, MentalStats, FactionWithStats } from '@/lib/database.types';
import type { ContactWithStats } from '@/lib/types/contacts';

// Familie-Domain ID - wird aus der Anzeige gefiltert
const FAMILIE_DOMAIN_ID = '77777777-7777-7777-7777-777777777777';

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
  totalLevel: number;
  totalXp: number;
  attributes: UserAttributes;
  mentalStats: MentalStats;
}

export default function Dashboard() {
  const [domains, setDomains] = useState<DomainWithLevel[]>([]);
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
    totalLevel: 1,
    totalXp: 0,
    attributes: DEFAULT_ATTRIBUTES,
    mentalStats: DEFAULT_MENTAL_STATS,
  });
  const [totalSkillCount, setTotalSkillCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load all data in parallel
        const [domainsData, profile, skillCount, contactStats, birthdays, attention, factionsData] = await Promise.all([
          getAllDomains(),
          getUserProfile(),
          getTotalSkillCount(),
          getContactsStats(),
          getUpcomingBirthdays(14),
          getContactsNeedingAttention(5),
          getFactionsWithStats(),
        ]);

        // Filter out Familie domain (now replaced by Contacts button)
        const filteredDomains = domainsData.filter(
          (domain) => domain.id !== FAMILIE_DOMAIN_ID
        );

        // Load user levels for each domain
        const domainsWithLevels = await Promise.all(
          filteredDomains.map(async (domain) => {
            const stats = await getDomainStats(domain.id);
            return {
              ...domain,
              level: stats.averageLevel || 1,
            };
          })
        );

        setDomains(domainsWithLevels);
        setFactions(factionsData);
        setContactsStats(contactStats);
        setTotalSkillCount(skillCount);
        setUpcomingBirthdays(birthdays);
        setAttentionContacts(attention);

        // Set user profile with attributes and mental stats
        if (profile) {
          setUserProfile({
            username: profile.username,
            avatarUrl: profile.avatar_url,
            totalLevel: profile.total_level,
            totalXp: profile.total_xp,
            attributes: profile.attributes || DEFAULT_ATTRIBUTES,
            mentalStats: profile.mental_stats || DEFAULT_MENTAL_STATS,
          });
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <CharacterHeader
            username={userProfile.username}
            avatarUrl={userProfile.avatarUrl}
            totalLevel={userProfile.totalLevel}
            totalXp={userProfile.totalXp}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/settings/notifications"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5 text-white/60" />
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
                    <h3 className="font-semibold text-white text-lg">Daten exportieren</h3>
                    <p className="text-sm text-white/60">Exportiere alle deine Projekt L Daten</p>
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

          {/* Quick Actions Row */}
          <div className="mb-8">
            <QuickActionsWidget />
          </div>

          {/* Habits + Achievements Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <HabitTrackerWidget />
            <AchievementBadgeWidget />
          </div>

          {/* Recent Activity + Contacts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Activity Feed */}
            <RecentActivityFeed limit={6} />

            {/* Contacts Section */}
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
                        <h3 className="font-semibold text-white">Kontakte</h3>
                        <p className="text-xs text-white/60">Familie & Freunde</p>
                      </div>
                    </div>
                    {contactsStats && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-center">
                          <span className="text-lg font-bold text-white">{contactsStats.total}</span>
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
                      <h3 className="font-semibold text-white">Habits verwalten</h3>
                      <p className="text-xs text-white/60">Gewohnheiten aufbauen & tracken</p>
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

          {/* Skill Domains Section */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-2">Skill-Bereiche</h2>
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
    </div>
  );
}
