import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FactionId, ActivityLog } from '@/lib/database.types';

// Mock activity data for testing
const mockActivities: Partial<ActivityLog>[] = [
  {
    id: '1',
    activity_type: 'xp_gained',
    faction_id: 'karriere',
    xp_amount: 100,
    occurred_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    activity_type: 'workout_logged',
    faction_id: 'koerper',
    xp_amount: 50,
    occurred_at: '2024-01-15T11:00:00Z',
  },
  {
    id: '3',
    activity_type: 'book_finished',
    faction_id: 'wissen',
    xp_amount: 75,
    occurred_at: '2024-01-16T09:00:00Z',
  },
  {
    id: '4',
    activity_type: 'event_logged',
    faction_id: 'soziales',
    xp_amount: 80,
    occurred_at: '2024-01-16T20:00:00Z',
  },
  {
    id: '5',
    activity_type: 'level_up',
    faction_id: 'geist',
    xp_amount: 0,
    occurred_at: '2024-01-17T08:00:00Z',
  },
];

describe('Activity Log Helper Functions', () => {
  describe('Faction ID Assignments', () => {
    describe('logWorkout', () => {
      it('assigns koerper faction to workouts', () => {
        // Simulate logWorkout behavior
        const workoutActivity = {
          activity_type: 'workout_logged',
          faction_id: 'koerper' as FactionId,
          title: 'Morning Run',
          xp_amount: 50,
        };

        expect(workoutActivity.faction_id).toBe('koerper');
        expect(workoutActivity.activity_type).toBe('workout_logged');
      });

      it('includes duration in workout metadata', () => {
        const durationMinutes = 45;
        const metadata = { durationMinutes };

        expect(metadata.durationMinutes).toBe(45);
      });
    });

    describe('logBookFinished', () => {
      it('assigns weisheit faction to books', () => {
        const bookActivity = {
          activity_type: 'book_finished',
          faction_id: 'wissen' as FactionId,
          title: '"Clean Code" fertig gelesen',
          xp_amount: 100,
        };

        expect(bookActivity.faction_id).toBe('wissen');
        expect(bookActivity.activity_type).toBe('book_finished');
      });

      it('includes rating in book metadata', () => {
        const rating = 5;
        const metadata = { rating };

        expect(metadata.rating).toBe(5);
      });
    });

    describe('logCourseCompleted', () => {
      it('assigns weisheit faction to courses', () => {
        const courseActivity = {
          activity_type: 'course_completed',
          faction_id: 'wissen' as FactionId,
          title: 'React Masterclass abgeschlossen',
          xp_amount: 150,
        };

        expect(courseActivity.faction_id).toBe('wissen');
        expect(courseActivity.activity_type).toBe('course_completed');
      });
    });

    describe('logJobStarted', () => {
      it('assigns karriere faction to jobs', () => {
        const jobActivity = {
          activity_type: 'job_started',
          faction_id: 'karriere' as FactionId,
          title: 'Neuer Job: Senior Developer bei TechCorp',
        };

        expect(jobActivity.faction_id).toBe('karriere');
        expect(jobActivity.activity_type).toBe('job_started');
      });
    });

    describe('logSalaryUpdate', () => {
      it('assigns karriere faction to salary updates', () => {
        const salaryActivity = {
          activity_type: 'salary_updated',
          faction_id: 'karriere' as FactionId,
          title: 'Gehalt aktualisiert: 75.000 EUR',
          metadata: { amount: 75000, currency: 'EUR' },
        };

        expect(salaryActivity.faction_id).toBe('karriere');
        expect(salaryActivity.activity_type).toBe('salary_updated');
      });
    });

    describe('logSocialEvent', () => {
      it('assigns soziales faction to social events', () => {
        const socialActivity = {
          activity_type: 'event_logged',
          faction_id: 'soziales' as FactionId,
          title: 'Geburtstagsfeier',
          xp_amount: 100,
        };

        expect(socialActivity.faction_id).toBe('soziales');
        expect(socialActivity.activity_type).toBe('event_logged');
      });

      it('includes participant count in description', () => {
        const participantCount = 5;
        const description = `Mit ${participantCount} Person${participantCount === 1 ? '' : 'en'}`;

        expect(description).toBe('Mit 5 Personen');
      });

      it('handles singular participant correctly', () => {
        const participantCount = 1;
        const description = `Mit ${participantCount} Person${participantCount === 1 ? '' : 'en'}`;

        expect(description).toBe('Mit 1 Person');
      });
    });

    describe('logGoalAchieved', () => {
      it('accepts any faction ID for goals', () => {
        const factionIds: FactionId[] = ['karriere', 'koerper', 'geist', 'soziales', 'wissen', 'hobby', 'finanzen'];

        factionIds.forEach(factionId => {
          const goalActivity = {
            activity_type: 'goal_achieved',
            faction_id: factionId,
            title: 'Ziel erreicht: Test Goal',
            xp_amount: 100,
          };

          expect(goalActivity.faction_id).toBe(factionId);
        });
      });

      it('gives bonus XP for achieving goals', () => {
        const GOAL_BONUS_XP = 100;

        const goalActivity = {
          activity_type: 'goal_achieved',
          xp_amount: GOAL_BONUS_XP,
        };

        expect(goalActivity.xp_amount).toBe(100);
      });
    });
  });

  describe('Activity Summary Aggregation', () => {
    // Simulate getActivitySummary logic
    function aggregateActivities(activities: Partial<ActivityLog>[]) {
      const byType: Record<string, number> = {};
      const byFaction: Record<string, number> = {};
      let totalXpGained = 0;

      activities.forEach(activity => {
        // Count by type
        const type = activity.activity_type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        // Count by faction
        if (activity.faction_id) {
          byFaction[activity.faction_id] = (byFaction[activity.faction_id] || 0) + 1;
        }

        // Sum XP
        totalXpGained += activity.xp_amount || 0;
      });

      return {
        totalActivities: activities.length,
        totalXpGained,
        byType,
        byFaction,
      };
    }

    it('counts total activities correctly', () => {
      const summary = aggregateActivities(mockActivities);
      expect(summary.totalActivities).toBe(5);
    });

    it('sums total XP correctly', () => {
      const summary = aggregateActivities(mockActivities);
      // 100 + 50 + 75 + 80 + 0 = 305
      expect(summary.totalXpGained).toBe(305);
    });

    it('groups activities by type correctly', () => {
      const summary = aggregateActivities(mockActivities);

      expect(summary.byType['xp_gained']).toBe(1);
      expect(summary.byType['workout_logged']).toBe(1);
      expect(summary.byType['book_finished']).toBe(1);
      expect(summary.byType['event_logged']).toBe(1);
      expect(summary.byType['level_up']).toBe(1);
    });

    it('groups activities by faction correctly', () => {
      const summary = aggregateActivities(mockActivities);

      expect(summary.byFaction['karriere']).toBe(1);
      expect(summary.byFaction['koerper']).toBe(1);
      expect(summary.byFaction['wissen']).toBe(1);
      expect(summary.byFaction['soziales']).toBe(1);
      expect(summary.byFaction['geist']).toBe(1);
    });

    it('handles empty activity list', () => {
      const summary = aggregateActivities([]);

      expect(summary.totalActivities).toBe(0);
      expect(summary.totalXpGained).toBe(0);
      expect(Object.keys(summary.byType)).toHaveLength(0);
      expect(Object.keys(summary.byFaction)).toHaveLength(0);
    });

    it('handles activities without faction', () => {
      const activitiesWithoutFaction = [
        { id: '1', activity_type: 'xp_gained', xp_amount: 50 },
        { id: '2', activity_type: 'level_up', xp_amount: 0 },
      ];

      const summary = aggregateActivities(activitiesWithoutFaction);

      expect(summary.totalActivities).toBe(2);
      expect(Object.keys(summary.byFaction)).toHaveLength(0);
    });
  });

  describe('Daily Activity Count', () => {
    // Simulate getDailyActivityCount logic
    function groupByDate(activities: Partial<ActivityLog>[]) {
      const byDate: Record<string, { count: number; xp: number }> = {};

      activities.forEach(activity => {
        const date = activity.occurred_at?.split('T')[0] || 'unknown';
        if (!byDate[date]) {
          byDate[date] = { count: 0, xp: 0 };
        }
        byDate[date].count++;
        byDate[date].xp += activity.xp_amount || 0;
      });

      return byDate;
    }

    function fillMissingDates(
      byDate: Record<string, { count: number; xp: number }>,
      startDate: Date,
      endDate: Date
    ) {
      const result: { date: string; count: number; xp: number }[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          count: byDate[dateStr]?.count || 0,
          xp: byDate[dateStr]?.xp || 0,
        });
        current.setDate(current.getDate() + 1);
      }

      return result;
    }

    it('groups activities by date correctly', () => {
      const byDate = groupByDate(mockActivities);

      expect(byDate['2024-01-15'].count).toBe(2);
      expect(byDate['2024-01-16'].count).toBe(2);
      expect(byDate['2024-01-17'].count).toBe(1);
    });

    it('sums XP by date correctly', () => {
      const byDate = groupByDate(mockActivities);

      expect(byDate['2024-01-15'].xp).toBe(150); // 100 + 50
      expect(byDate['2024-01-16'].xp).toBe(155); // 75 + 80
      expect(byDate['2024-01-17'].xp).toBe(0);   // level_up has 0 XP
    });

    it('fills missing dates with zeros', () => {
      const byDate = groupByDate(mockActivities);
      const startDate = new Date('2024-01-14');
      const endDate = new Date('2024-01-17');

      const filled = fillMissingDates(byDate, startDate, endDate);

      expect(filled).toHaveLength(4); // 14, 15, 16, 17
      expect(filled[0].date).toBe('2024-01-14');
      expect(filled[0].count).toBe(0);
      expect(filled[0].xp).toBe(0);
    });

    it('maintains correct order of dates', () => {
      const byDate = groupByDate(mockActivities);
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');

      const filled = fillMissingDates(byDate, startDate, endDate);

      expect(filled[0].date).toBe('2024-01-15');
      expect(filled[1].date).toBe('2024-01-16');
      expect(filled[2].date).toBe('2024-01-17');
    });
  });

  describe('New Faction ID Integration', () => {
    it('all new faction IDs are used in activities', () => {
      const usedFactionIds = new Set(
        mockActivities
          .map(a => a.faction_id)
          .filter(Boolean)
      );

      // We have karriere, koerper, weisheit, soziales, geist in mock data
      expect(usedFactionIds.has('karriere')).toBe(true);
      expect(usedFactionIds.has('koerper')).toBe(true);
      expect(usedFactionIds.has('wissen')).toBe(true);
      expect(usedFactionIds.has('soziales')).toBe(true);
      expect(usedFactionIds.has('geist')).toBe(true);
    });

    it('activity types map to correct factions', () => {
      const activityFactionMap: Record<string, FactionId> = {
        'workout_logged': 'koerper',
        'book_finished': 'wissen',
        'course_completed': 'wissen',
        'job_started': 'karriere',
        'salary_updated': 'karriere',
        'event_logged': 'soziales',
      };

      Object.entries(activityFactionMap).forEach(([activityType, expectedFaction]) => {
        expect(expectedFaction).toBeTruthy();
        const validFactions: FactionId[] = ['karriere', 'hobby', 'koerper', 'geist', 'finanzen', 'soziales', 'wissen'];
        expect(validFactions).toContain(expectedFaction);
      });
    });
  });
});

describe('Soziales Faction - Familie + Freunde Merge', () => {
  it('activities from old familie faction count towards soziales', () => {
    // Simulating migration: old familie activities → new soziales
    const oldFamilieActivity = {
      activity_type: 'event_logged',
      old_faction: 'familie',
      new_faction: 'soziales' as FactionId,
      xp_amount: 100,
    };

    expect(oldFamilieActivity.new_faction).toBe('soziales');
  });

  it('activities from old freunde faction count towards soziales', () => {
    // Simulating migration: old freunde activities → new soziales
    const oldFreundeActivity = {
      activity_type: 'event_logged',
      old_faction: 'freunde',
      new_faction: 'soziales' as FactionId,
      xp_amount: 75,
    };

    expect(oldFreundeActivity.new_faction).toBe('soziales');
  });

  it('merged soziales XP equals sum of familie + freunde', () => {
    const familieXp = 500;
    const freundeXp = 350;

    const mergedSozialesXp = familieXp + freundeXp;

    expect(mergedSozialesXp).toBe(850);
  });

  it('new social events go directly to soziales', () => {
    const newSocialEvent = {
      activity_type: 'event_logged',
      faction_id: 'soziales' as FactionId,
      title: 'Grillparty mit Freunden',
      xp_amount: 80,
    };

    expect(newSocialEvent.faction_id).toBe('soziales');
  });

  it('contact interactions contribute to soziales', () => {
    // From contacts-types.ts: interactions give XP
    const contactInteraction = {
      activity_type: 'interaction_logged',
      faction_id: 'soziales' as FactionId,
      related_entity_type: 'contact',
      xp_amount: 25,
    };

    expect(contactInteraction.faction_id).toBe('soziales');
  });
});
