// ============================================
// AI FACTION SUGGESTER TESTS
// Phase 5: AI Smart-Defaults & Kontext-Erkennung
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK before importing the module
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      throw new Error('Anthropic SDK should not be instantiated in tests');
    }),
  };
});

// Now import the module (which will use our mock)
import { suggestFaction } from '@/lib/ai/faction-suggester';

describe('AI Faction Suggester', () => {
  beforeEach(() => {
    // Clear environment variable to force rule-based fallback
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_ANTHROPIC_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Rule-based suggestions (fallback)', () => {
    it('should suggest "karriere" for coding during work hours', async () => {
      const workTime = new Date();
      workTime.setHours(10); // 10 AM

      const suggestions = await suggestFaction({
        activityDescription: 'Coding a new feature for the project',
        currentTime: workTime,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('karriere');
      expect(suggestions[0].confidence).toBeGreaterThan(0);
    });

    it('should suggest "hobby" for coding outside work hours', async () => {
      const eveningTime = new Date();
      eveningTime.setHours(20); // 8 PM

      const suggestions = await suggestFaction({
        activityDescription: 'Working on my personal coding project',
        currentTime: eveningTime,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('hobby');
    });

    it('should suggest "koerper" for gym activities', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Went to the gym and did a workout',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('koerper');
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(85);
    });

    it('should suggest "soziales" for social activities', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Meeting with friends for dinner',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('soziales');
    });

    it('should suggest "geist" for learning activities', async () => {
      // Use German keywords that match the rule-based fallback
      const suggestions = await suggestFaction({
        activityDescription: 'Ein Buch lesen und meditieren',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('geist');
    });

    it('should suggest "finanzen" for financial activities', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Reviewing my investment portfolio',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('finanzen');
    });

    it('should return default suggestion for vague descriptions', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Did something',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeLessThanOrEqual(60);
    });

    it('should consider last activities for context', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Continuing work',
        lastActivities: ['Morning standup meeting', 'Code review', 'Sprint planning'],
      });

      expect(suggestions.length).toBeGreaterThan(0);
      // Context from last activities should influence suggestion
    });

    it('should return max 3 suggestions', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Coding and learning new technology',
      });

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return suggestions sorted by confidence', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Gym workout and meditation',
      });

      if (suggestions.length > 1) {
        // Check that suggestions are sorted descending by confidence
        for (let i = 1; i < suggestions.length; i++) {
          expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
            suggestions[i].confidence
          );
        }
      }
    });

    it('should include reasoning for suggestions', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Morning gym session',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].reasoning).toBeTruthy();
      expect(typeof suggestions[0].reasoning).toBe('string');
    });
  });

  describe('Time-based context', () => {
    it('should consider morning hours (9-12)', async () => {
      const morning = new Date();
      morning.setHours(9);

      const suggestions = await suggestFaction({
        activityDescription: 'Working on project',
        currentTime: morning,
      });

      // Morning work hours should lean towards karriere
      const karriereSuggestion = suggestions.find(s => s.faction_id === 'karriere');
      expect(karriereSuggestion).toBeTruthy();
    });

    it('should consider afternoon hours (13-17)', async () => {
      const afternoon = new Date();
      afternoon.setHours(14);

      const suggestions = await suggestFaction({
        activityDescription: 'Code review and meetings',
        currentTime: afternoon,
      });

      const karriereSuggestion = suggestions.find(s => s.faction_id === 'karriere');
      expect(karriereSuggestion).toBeTruthy();
    });

    it('should consider evening hours (18-22)', async () => {
      const evening = new Date();
      evening.setHours(19);

      const suggestions = await suggestFaction({
        activityDescription: 'Coding on side project',
        currentTime: evening,
      });

      const hobbySuggestion = suggestions.find(s => s.faction_id === 'hobby');
      expect(hobbySuggestion).toBeTruthy();
    });

    it('should consider late night hours (23-6)', async () => {
      const lateNight = new Date();
      lateNight.setHours(23);

      const suggestions = await suggestFaction({
        activityDescription: 'Working on a project',
        currentTime: lateNight,
      });

      // Late night work is more likely hobby/passion project
      const hobbySuggestion = suggestions.find(s => s.faction_id === 'hobby');
      expect(hobbySuggestion).toBeTruthy();
    });
  });

  describe('Multi-keyword detection', () => {
    it('should handle activities with multiple keywords', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Gym workout followed by healthy meal prep and meditation',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].faction_id).toBe('koerper');
    });

    it('should prioritize strongest keyword', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Quick meeting before going to the gym',
      });

      // Gym should be stronger than meeting
      expect(suggestions[0].faction_id).toBe('koerper');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty description gracefully', async () => {
      const suggestions = await suggestFaction({
        activityDescription: '',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeLessThanOrEqual(60);
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'This is a very long description that goes on and on '.repeat(20);

      const suggestions = await suggestFaction({
        activityDescription: longDesc + ' about coding',
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const suggestions = await suggestFaction({
        activityDescription: '💻 Coding @ café! 🚀',
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle non-English characters', async () => {
      const suggestions = await suggestFaction({
        activityDescription: 'Programmieren und Lernen über KI',
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
