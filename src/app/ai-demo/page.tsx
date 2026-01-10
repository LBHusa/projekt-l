'use client';

// ============================================
// AI FACTION SUGGESTER DEMO PAGE
// Phase 5: AI Smart-Defaults & Kontext-Erkennung
// ============================================

import { useState } from 'react';
import { FactionSuggester, FactionSuggestionBadge } from '@/components/ai/FactionSuggester';
import { getSuggestionAccuracy } from '@/lib/data/ai-faction-feedback';
import type { FactionId } from '@/lib/database.types';

export default function AIDemoPage() {
  const [description, setDescription] = useState('');
  const [selectedFaction, setSelectedFaction] = useState<FactionId | null>(null);
  const [accuracy, setAccuracy] = useState<any>(null);

  const loadAccuracy = async () => {
    const stats = await getSuggestionAccuracy();
    setAccuracy(stats);
  };

  const examples = [
    'Coding a new feature for work',
    'Evening coding on side project',
    'Morning gym workout',
    'Meeting with friends for coffee',
    'Reading a book about philosophy',
    'Reviewing investment portfolio',
    'Learning React from online course',
  ];

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">AI Faction Suggester Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the AI-powered faction suggestion system
        </p>
      </div>

      {/* Input Section */}
      <div className="mb-8 rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Activity Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your activity..."
          className="w-full rounded-md border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          rows={3}
        />

        {/* Example Prompts */}
        <div className="mt-3">
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => setDescription(example)}
                className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full Suggester Component */}
      {description.trim().length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Full Suggester Component</h2>
          <FactionSuggester
            activityDescription={description}
            onAccept={(factionId) => {
              setSelectedFaction(factionId);
              alert(`Accepted: ${factionId}`);
            }}
            onReject={(suggested, actual) => {
              alert(`Rejected ${suggested}, selected ${actual} instead`);
            }}
            enabled={true}
            autoSuggest={true}
          />
        </div>
      )}

      {/* Badge Component */}
      {description.trim().length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Minimal Badge Component</h2>
          <FactionSuggestionBadge
            activityDescription={description}
            onAccept={(factionId) => {
              setSelectedFaction(factionId);
              alert(`Badge accepted: ${factionId}`);
            }}
            enabled={true}
          />
        </div>
      )}

      {/* Selected Faction Display */}
      {selectedFaction && (
        <div className="mb-8 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="font-semibold text-green-900 dark:text-green-100">
            Selected Faction: <span className="text-xl">{selectedFaction}</span>
          </p>
        </div>
      )}

      {/* Accuracy Stats */}
      <div className="mb-8 rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suggestion Accuracy</h2>
          <button
            onClick={loadAccuracy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Load Stats
          </button>
        </div>

        {accuracy && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Suggestions
              </p>
              <p className="text-2xl font-bold">{accuracy.total_suggestions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accepted
              </p>
              <p className="text-2xl font-bold text-green-600">
                {accuracy.accepted_suggestions}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Acceptance Rate
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {accuracy.acceptance_rate_percent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Confidence
              </p>
              <p className="text-2xl font-bold">
                {accuracy.avg_confidence.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {!accuracy && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click "Load Stats" to see your suggestion accuracy
          </p>
        )}
      </div>

      {/* How it Works */}
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold">How it Works</h2>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong>1. Context Analysis:</strong> The AI analyzes your activity description,
            current time, and recent activities to understand context.
          </p>
          <p>
            <strong>2. Faction Suggestion:</strong> Based on patterns, it suggests the most
            likely faction with a confidence score.
          </p>
          <p>
            <strong>3. User Feedback:</strong> Your acceptance or rejection is stored to
            improve future suggestions.
          </p>
          <p>
            <strong>4. ML Training:</strong> Feedback data will be used to train more
            accurate models over time.
          </p>
        </div>

        <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Examples:</strong>
            <br />
            • "9-17 Uhr Coding" → <strong>karriere</strong> (work hours)
            <br />
            • "Abends Coding" → <strong>hobbys</strong> (after work)
            <br />• "Nach Gym → Protein Shake" → <strong>gesundheit</strong> (context)
          </p>
        </div>
      </div>
    </div>
  );
}
