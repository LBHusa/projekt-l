'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllDomains, getDomainByName } from '@/lib/data/domains';
import { getUserProfile, getDomainStats, getTotalSkillCount, calculateAttributes } from '@/lib/data/user-skills';
import { getFactionsWithStats } from '@/lib/data/factions';
import { getContactsStats, getUpcomingBirthdays, getContactsNeedingAttention } from '@/lib/data/contacts';
import { getTodaysHabits, getHabitsWithLogs } from '@/lib/data/habits';
import { getAchievementStats } from '@/lib/data/achievements';
import { getRecentActivity } from '@/lib/data/activity-log';
import { getAccounts } from '@/lib/data/finanzen';
import type { SkillDomain, UserAttributes, MentalStats, FactionWithStats, Account, HabitWithLogs, ActivityLog } from '@/lib/database.types';
import type { ContactWithStats } from '@/lib/types/contacts';
import type { AchievementStats } from '@/lib/data/achievements';

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

interface DomainWithLevel extends SkillDomain {
  level: number;
}

export interface DashboardData {
  domains: DomainWithLevel[];
  factions: FactionWithStats[];
  contactsStats: {
    total: number;
    favorites: number;
    needingAttention: number;
  } | null;
  upcomingBirthdays: ContactWithStats[];
  attentionContacts: ContactWithStats[];
  userProfile: {
    username: string | null;
    avatarUrl: string | null;
    avatarSeed: string | null;
    totalLevel: number;
    totalXp: number;
    attributes: UserAttributes;
    mentalStats: MentalStats;
  };
  totalSkillCount: number;
  accounts: Account[];
  // Widget data
  todaysHabits: HabitWithLogs[];
  allHabits: HabitWithLogs[];
  achievementStats: AchievementStats | null;
  recentActivities: ActivityLog[];
}

async function loadDashboardData(userId: string): Promise<DashboardData> {
  // Load all data in parallel
  const results = await Promise.allSettled([
    getAllDomains(),                           // 0
    getDomainByName('Familie'),                // 1
    getUserProfile(userId),                    // 2
    getTotalSkillCount(userId),                // 3
    getContactsStats(userId),                  // 4
    getUpcomingBirthdays(14, userId),          // 5
    getContactsNeedingAttention(5, userId),    // 6
    getFactionsWithStats(userId),              // 7
    getAccounts(userId),                       // 8
    calculateAttributes(userId),               // 9
    getTodaysHabits(userId),                   // 10
    getHabitsWithLogs(userId, 1),              // 11
    getAchievementStats(userId),               // 12
    getRecentActivity(8, userId),              // 13
  ]);

  // Extract values with fallbacks
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
  const todaysHabitsData = results[10].status === 'fulfilled' ? results[10].value : [];
  const allHabitsData = results[11].status === 'fulfilled' ? results[11].value : [];
  const achievementStatsData = results[12].status === 'fulfilled' ? results[12].value : null;
  const recentActivitiesData = results[13].status === 'fulfilled' ? results[13].value : [];

  // Filter out Familie domain
  const filteredDomains = familieDomain
    ? domainsData.filter((domain) => domain.id !== familieDomain.id)
    : domainsData;

  // Load user levels for each domain
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

  return {
    domains: domainsWithLevels,
    factions: factionsData,
    contactsStats: contactStats,
    upcomingBirthdays: birthdays,
    attentionContacts: attention,
    accounts: accountsData,
    totalSkillCount: skillCount,
    todaysHabits: todaysHabitsData,
    allHabits: allHabitsData,
    achievementStats: achievementStatsData,
    recentActivities: recentActivitiesData,
    userProfile: {
      username: profile?.username || null,
      avatarUrl: profile?.avatar_url || null,
      avatarSeed: profile?.avatar_seed || null,
      totalLevel: profile?.total_level || 1,
      totalXp: factionsData.reduce((sum, f) => sum + (f.stats?.total_xp || 0), 0),
      attributes: calculatedAttrs || profile?.attributes || DEFAULT_ATTRIBUTES,
      mentalStats: profile?.mental_stats || DEFAULT_MENTAL_STATS,
    },
  };
}

export function useDashboardData(userId: string | null) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => loadDashboardData(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
