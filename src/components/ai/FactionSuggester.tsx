'use client';

// ============================================
// FACTION SUGGESTER COMPONENT
// Phase 5: AI Smart-Defaults & Kontext-Erkennung
// ============================================

import { useFactionSuggestion } from '@/hooks/use-faction-suggestion';
import type { FactionId } from '@/lib/database.types';

export interface FactionSuggesterProps {
  activityDescription: string;
  onAccept: (factionId: FactionId) => void;
  onReject?: (suggestedFactionId: FactionId, actualFactionId: FactionId) => void;
  enabled?: boolean;
  autoSuggest?: boolean;
}

/**
 * AI-powered faction suggestion widget
 *
 * @example
 * ```tsx
 * <FactionSuggester
 *   activityDescription={description}
 *   onAccept={(factionId) => setSelectedFaction(factionId)}
 *   autoSuggest={true}
 * />
 * ```
 */
export function FactionSuggester({
  activityDescription,
  onAccept,
  onReject,
  enabled = true,
  autoSuggest = false,
}: FactionSuggesterProps) {
  const {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  } = useFactionSuggestion({
    activityDescription,
    enabled,
    autoSuggest,
  });

  if (!enabled || suggestions.length === 0) {
    return null;
  }

  const topSuggestion = suggestions[0];

  const handleAccept = async () => {
    await acceptSuggestion(topSuggestion);
    onAccept(topSuggestion.faction_id);
  };

  const handleReject = async (actualFactionId: FactionId) => {
    await rejectSuggestion(topSuggestion, actualFactionId);
    if (onReject) {
      onReject(topSuggestion.faction_id, actualFactionId);
    }
    clearSuggestions();
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-start gap-3">
        {/* AI Icon */}
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-2">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              AI-Vorschlag
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {topSuggestion.reasoning}
            </p>
          </div>

          {/* Suggested Faction */}
          <div className="mb-3">
            <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 dark:bg-gray-800">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {topSuggestion.faction_id}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({topSuggestion.confidence}% Sicherheit)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              ✓ Akzeptieren
            </button>

            <button
              onClick={clearSuggestions}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ✕ Verwerfen
            </button>
          </div>

          {/* Alternative Suggestions */}
          {suggestions.length > 1 && (
            <div className="mt-3 border-t border-blue-200 pt-3 dark:border-blue-800">
              <p className="mb-2 text-xs text-blue-700 dark:text-blue-300">
                Weitere Vorschläge:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(1).map((suggestion) => (
                  <button
                    key={suggestion.faction_id}
                    onClick={() => {
                      acceptSuggestion(suggestion);
                      onAccept(suggestion.faction_id);
                    }}
                    className="rounded-md border border-blue-300 bg-white px-3 py-1 text-xs text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-100 dark:hover:bg-gray-700"
                  >
                    {suggestion.faction_id} ({suggestion.confidence}%)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          Analysiere Kontext...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Fehler: {error}
        </div>
      )}
    </div>
  );
}

/**
 * Simple suggestion badge (minimal UI)
 */
export function FactionSuggestionBadge({
  activityDescription,
  onAccept,
  enabled = true,
}: Omit<FactionSuggesterProps, 'autoSuggest'>) {
  const { suggestions, acceptSuggestion } = useFactionSuggestion({
    activityDescription,
    enabled,
    autoSuggest: true,
  });

  if (!enabled || suggestions.length === 0) {
    return null;
  }

  const topSuggestion = suggestions[0];

  const handleClick = async () => {
    await acceptSuggestion(topSuggestion);
    onAccept(topSuggestion.faction_id);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
      title={topSuggestion.reasoning}
    >
      <span className="text-xs">🤖</span>
      <span className="font-medium">{topSuggestion.faction_id}</span>
      <span className="text-xs opacity-75">({topSuggestion.confidence}%)</span>
    </button>
  );
}
