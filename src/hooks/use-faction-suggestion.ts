// ============================================
// USE FACTION SUGGESTION HOOK
// Phase 5: AI Smart-Defaults & Kontext-Erkennung
// ============================================

import { useState, useEffect } from 'react';
import { suggestFaction, storeFactionFeedback, type FactionSuggestion } from '@/lib/ai/faction-suggester';
import { getRecentActivities } from '@/lib/data/ai-faction-feedback';
import type { FactionId } from '@/lib/database.types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface UseFactionSuggestionOptions {
  activityDescription: string;
  enabled?: boolean;
  userId?: string;
  autoSuggest?: boolean; // Auto-trigger suggestion on description change
}

export interface UseFactionSuggestionResult {
  suggestions: FactionSuggestion[];
  isLoading: boolean;
  error: string | null;
  getSuggestions: () => Promise<void>;
  acceptSuggestion: (suggestion: FactionSuggestion) => Promise<void>;
  rejectSuggestion: (suggestion: FactionSuggestion, actualFactionId: FactionId) => Promise<void>;
  clearSuggestions: () => void;
}

/**
 * React Hook for AI-powered faction suggestions
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, acceptSuggestion } = useFactionSuggestion({
 *   activityDescription: "Coding a new feature",
 *   autoSuggest: true,
 * });
 *
 * if (suggestions.length > 0) {
 *   return (
 *     <div>
 *       <p>Suggested: {suggestions[0].faction_id}</p>
 *       <button onClick={() => acceptSuggestion(suggestions[0])}>Accept</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFactionSuggestion({
  activityDescription,
  enabled = true,
  userId = TEST_USER_ID,
  autoSuggest = false,
}: UseFactionSuggestionOptions): UseFactionSuggestionResult {
  const [suggestions, setSuggestions] = useState<FactionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = async () => {
    if (!enabled || !activityDescription.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get recent activities for context
      const recentActivities = await getRecentActivities(userId, 5);

      // Get AI suggestions
      const result = await suggestFaction({
        activityDescription,
        currentTime: new Date(),
        lastActivities: recentActivities,
      });

      setSuggestions(result);
    } catch (err) {
      console.error('Error getting faction suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptSuggestion = async (suggestion: FactionSuggestion) => {
    try {
      await storeFactionFeedback(
        activityDescription,
        suggestion.faction_id,
        suggestion.faction_id, // same as suggested since accepted
        true, // accepted
        userId,
        suggestion.confidence,
        suggestion.reasoning
      );
      clearSuggestions();
    } catch (err) {
      console.error('Error storing feedback:', err);
    }
  };

  const rejectSuggestion = async (
    suggestion: FactionSuggestion,
    actualFactionId: FactionId
  ) => {
    try {
      await storeFactionFeedback(
        activityDescription,
        suggestion.faction_id,
        actualFactionId,
        false, // rejected
        userId,
        suggestion.confidence,
        suggestion.reasoning
      );
      clearSuggestions();
    } catch (err) {
      console.error('Error storing feedback:', err);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setError(null);
  };

  // Auto-suggest on description change (debounced)
  useEffect(() => {
    if (!autoSuggest || !enabled) return;

    const timer = setTimeout(() => {
      if (activityDescription.trim().length > 3) {
        getSuggestions();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [activityDescription, autoSuggest, enabled]);

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  };
}
