'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Heart, Calendar, Gift, ChevronRight, UserPlus } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import { getContactsByCategory, getUpcomingBirthdays, getContactsStats } from '@/lib/data/contacts';
import type { FactionWithStats } from '@/lib/database.types';
import type { ContactWithStats } from '@/lib/types/contacts';

export default function FamiliePage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<ContactWithStats[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [factionData, factionStats, familyContacts, birthdays, stats] = await Promise.all([
          getFaction('familie'),
          getUserFactionStat('familie'),
          getContactsByCategory('family'),
          getUpcomingBirthdays(30),
          getContactsStats(),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        setContacts(familyContacts);
        setUpcomingBirthdays(birthdays.filter(b =>
          familyContacts.some(fc => fc.id === b.id)
        ));
        setFamilyCount(stats.byCategory.family);
      } catch (err) {
        console.error('Error loading familie data:', err);
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
          <div className="w-16 h-16 rounded-full bg-pink-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-pink-400" />
          </div>
          <p className="text-white/50">Lade Familien-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Familie-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const additionalStats = [
    {
      label: 'Familienmitglieder',
      value: familyCount,
      icon: <Users className="w-4 h-4" />,
      color: 'text-pink-400',
    },
  ];

  if (upcomingBirthdays.length > 0) {
    additionalStats.push({
      label: 'Bald Geburtstag',
      value: upcomingBirthdays.length,
      icon: <Gift className="w-4 h-4" />,
      color: 'text-yellow-400',
    });
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Link
            href="/contacts?category=family"
            className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-4 hover:border-pink-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Alle Familienmitglieder</h3>
                  <p className="text-sm text-white/50">{familyCount} Kontakte</p>
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
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <h3 className="font-semibold">Familienmitglied hinzufugen</h3>
                  <p className="text-sm text-white/50">Neuen Kontakt erstellen</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
            </div>
          </Link>
        </motion.div>

        {/* Upcoming Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold">Bevorstehende Geburtstage</h2>
            </div>
            <div className="space-y-2">
              {upcomingBirthdays.slice(0, 5).map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500/30 flex items-center justify-center text-sm">
                      {contact.first_name[0]}
                    </div>
                    <span>
                      {contact.first_name} {contact.last_name}
                    </span>
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
              ))}
            </div>
          </motion.div>
        )}

        {/* Family Members Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <h2 className="font-semibold">Familienmitglieder</h2>
            </div>
            <Link
              href="/contacts?category=family"
              className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1"
            >
              Alle anzeigen
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {contacts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {contacts.slice(0, 8).map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="bg-white/5 hover:bg-white/10 rounded-lg p-3 text-center transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-rose-500/30 flex items-center justify-center mx-auto mb-2 text-lg">
                    {contact.first_name[0]}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {contact.first_name}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    Level {contact.relationship_level}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Familienmitglieder hinzugefugt</p>
              <Link
                href="/contacts?new=true&type=family"
                className="inline-block mt-4 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg text-pink-400 text-sm transition-colors"
              >
                Erstes Familienmitglied hinzufugen
              </Link>
            </div>
          )}
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="familie"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}
