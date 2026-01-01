'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users, Heart, UserPlus, Calendar, ChevronRight,
  PartyPopper, MessageCircle, Gift
} from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import {
  getContactsByCategory,
  getUpcomingBirthdays,
  getContactsNeedingAttention,
  getContactsStats
} from '@/lib/data/contacts';
import type { FactionWithStats } from '@/lib/database.types';
import type { ContactWithStats } from '@/lib/types/contacts';

type TabType = 'alle' | 'familie' | 'freunde';

export default function SozialesPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [familyContacts, setFamilyContacts] = useState<ContactWithStats[]>([]);
  const [friendContacts, setFriendContacts] = useState<ContactWithStats[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<ContactWithStats[]>([]);
  const [needingAttention, setNeedingAttention] = useState<ContactWithStats[]>([]);
  const [stats, setStats] = useState({ family: 0, friend: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('alle');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          factionData,
          factionStats,
          familyData,
          friendData,
          birthdays,
          attention,
          contactStats
        ] = await Promise.all([
          getFaction('soziales'),
          getUserFactionStat('soziales'),
          getContactsByCategory('family'),
          getContactsByCategory('friend'),
          getUpcomingBirthdays(30),
          getContactsNeedingAttention(10),
          getContactsStats(),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        setFamilyContacts(familyData);
        setFriendContacts(friendData);
        setUpcomingBirthdays(birthdays);
        setNeedingAttention(attention);
        setStats({
          family: contactStats.byCategory.family,
          friend: contactStats.byCategory.friend,
        });
      } catch (err) {
        console.error('Error loading soziales data:', err);
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
          <div className="w-16 h-16 rounded-full bg-violet-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-white/50">Lade Soziales-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Soziales-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const totalContacts = stats.family + stats.friend;
  const allContacts = [...familyContacts, ...friendContacts].sort((a, b) =>
    a.first_name.localeCompare(b.first_name)
  );

  const displayedContacts = activeTab === 'alle'
    ? allContacts
    : activeTab === 'familie'
      ? familyContacts
      : friendContacts;

  const additionalStats = [
    {
      label: 'Kontakte gesamt',
      value: totalContacts,
      icon: <Users className="w-4 h-4" />,
      color: 'text-violet-400',
    },
    {
      label: 'Familie',
      value: stats.family,
      icon: <Heart className="w-4 h-4" />,
      color: 'text-pink-400',
    },
    {
      label: 'Freunde',
      value: stats.friend,
      icon: <Users className="w-4 h-4" />,
      color: 'text-cyan-400',
    },
  ];

  const tabs: { id: TabType; label: string; count: number; color: string }[] = [
    { id: 'alle', label: 'Alle', count: totalContacts, color: 'violet' },
    { id: 'familie', label: 'Familie', count: stats.family, color: 'pink' },
    { id: 'freunde', label: 'Freunde', count: stats.friend, color: 'cyan' },
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

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-violet-400">{totalContacts}</div>
            <div className="text-sm text-white/50">Kontakte</div>
          </div>
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 text-center">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-pink-400">{stats.family}</div>
            <div className="text-sm text-white/50">Familie</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-cyan-400">{stats.friend}</div>
            <div className="text-sm text-white/50">Freunde</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <Gift className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">{upcomingBirthdays.length}</div>
            <div className="text-sm text-white/50">Geburtstage</div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Link
            href="/contacts"
            className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-xl p-4 hover:border-violet-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Kontakte verwalten</h3>
                  <p className="text-sm text-white/50">{totalContacts} Kontakte</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
            </div>
          </Link>

          <Link
            href="/contacts?new=true&type=family"
            className="bg-[var(--background-secondary)]/80 border border-[var(--orb-border)] rounded-xl p-4 hover:border-pink-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Familie hinzufugen</h3>
                  <p className="text-sm text-white/50">Familienmitglied</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
            </div>
          </Link>

          <Link
            href="/contacts?new=true&type=friend"
            className="bg-[var(--background-secondary)]/80 border border-[var(--orb-border)] rounded-xl p-4 hover:border-cyan-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Freund hinzufugen</h3>
                  <p className="text-sm text-white/50">Neuer Kontakt</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
            </div>
          </Link>
        </motion.div>

        {/* Needing Attention */}
        {needingAttention.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-orange-400" />
              <h2 className="font-semibold">Lange nicht gehort</h2>
              <span className="text-sm text-white/40">Zeit fur eine Nachricht?</span>
            </div>
            <div className="space-y-2">
              {needingAttention.slice(0, 5).map((contact) => {
                const isFamily = familyContacts.some(fc => fc.id === contact.id);
                return (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${isFamily ? 'bg-pink-500/30' : 'bg-cyan-500/30'} flex items-center justify-center text-sm`}>
                        {contact.first_name[0]}
                      </div>
                      <div>
                        <span>{contact.first_name} {contact.last_name}</span>
                        <span className={`ml-2 text-xs ${isFamily ? 'text-pink-400' : 'text-cyan-400'}`}>
                          {isFamily ? 'Familie' : 'Freund'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-orange-400">
                      {contact.days_since_interaction
                        ? `${contact.days_since_interaction} Tage`
                        : 'Nie kontaktiert'}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Upcoming Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold">Bevorstehende Geburtstage</h2>
            </div>
            <div className="space-y-2">
              {upcomingBirthdays.slice(0, 5).map((contact) => {
                const isFamily = familyContacts.some(fc => fc.id === contact.id);
                return (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${isFamily ? 'bg-pink-500/30' : 'bg-cyan-500/30'} flex items-center justify-center text-sm`}>
                        {contact.first_name[0]}
                      </div>
                      <div>
                        <span>{contact.first_name} {contact.last_name}</span>
                        <span className={`ml-2 text-xs ${isFamily ? 'text-pink-400' : 'text-cyan-400'}`}>
                          {isFamily ? 'Familie' : 'Freund'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-400">
                        {contact.days_until_birthday === 0
                          ? 'Heute!'
                          : contact.days_until_birthday === 1
                          ? 'Morgen'
                          : `In ${contact.days_until_birthday} Tagen`}
                      </span>
                      <Calendar className="w-4 h-4 text-white/30" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Contacts with Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id
                    ? tab.color === 'violet' ? 'rgba(139, 92, 246, 0.2)'
                    : tab.color === 'pink' ? 'rgba(236, 72, 153, 0.2)'
                    : 'rgba(34, 211, 238, 0.2)'
                    : undefined,
                  color: activeTab === tab.id
                    ? tab.color === 'violet' ? 'rgb(167, 139, 250)'
                    : tab.color === 'pink' ? 'rgb(244, 114, 182)'
                    : 'rgb(34, 211, 238)'
                    : undefined,
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Contacts Grid */}
          {displayedContacts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayedContacts.slice(0, 12).map((contact) => {
                const isFamily = familyContacts.some(fc => fc.id === contact.id);
                return (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 text-center transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                      isFamily
                        ? 'from-pink-500/30 to-rose-500/30'
                        : 'from-cyan-500/30 to-blue-500/30'
                    } flex items-center justify-center mx-auto mb-2 text-lg`}>
                      {contact.first_name[0]}
                    </div>
                    <p className="text-sm font-medium truncate">
                      {contact.first_name}
                    </p>
                    <p className={`text-xs truncate ${isFamily ? 'text-pink-400' : 'text-cyan-400'}`}>
                      {isFamily ? 'Familie' : 'Freund'}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      Level {contact.relationship_level}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Kontakte in dieser Kategorie</p>
              <Link
                href="/contacts?new=true"
                className="inline-block mt-4 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 rounded-lg text-violet-400 text-sm transition-colors"
              >
                Ersten Kontakt hinzufugen
              </Link>
            </div>
          )}

          {displayedContacts.length > 12 && (
            <div className="mt-4 text-center">
              <Link
                href={`/contacts${activeTab !== 'alle' ? `?category=${activeTab === 'familie' ? 'family' : 'friend'}` : ''}`}
                className="text-sm text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1"
              >
                Alle {displayedContacts.length} anzeigen
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Social Events Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <PartyPopper className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold">Soziale Events</h2>
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              Phase 3
            </span>
          </div>
          <div className="text-center py-8 text-white/40">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Event-Tracking kommt in Phase 3</p>
            <p className="text-sm mt-1">Treffen, Partys & Aktivitaten tracken</p>
          </div>
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="soziales"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}
