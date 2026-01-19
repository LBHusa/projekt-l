'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import type { ContactWithStats } from '@/lib/types/contacts';
import { getDisplayName } from '@/lib/types/contacts';

interface RelationshipScoreCardProps {
  contacts: ContactWithStats[];
  maxDisplay?: number;
}

const MAX_LEVEL = 50;

/**
 * Calculate composite relationship health score (0-100)
 * Lower score = more neglected = higher priority
 *
 * Formula:
 * - 40% from relationship_level
 * - 30% from XP progress
 * - 20% from trust_level
 * - 10% recency penalty (days since interaction)
 */
function calculateRelationshipScore(contact: ContactWithStats): number {
  const levelScore = (contact.relationship_level / MAX_LEVEL) * 40;
  const xpScore = ((contact.progress_percent ?? 0) / 100) * 30;
  const trustScore = ((contact.trust_level ?? 0) / 100) * 20;

  const daysSince = contact.days_since_interaction ?? 365;
  const recencyPenalty = (Math.min(daysSince, 365) / 365) * 10;

  const total = levelScore + xpScore + trustScore - recencyPenalty;
  return Math.max(0, Math.min(100, total));
}

/**
 * Sort contacts by health score (ascending = most neglected first)
 */
function sortContactsByHealthScore(contacts: ContactWithStats[]): Array<{ contact: ContactWithStats; score: number }> {
  return [...contacts]
    .filter(contact => (
      typeof contact.relationship_level === 'number' &&
      typeof contact.trust_level === 'number' &&
      typeof contact.progress_percent === 'number'
    ))
    .map(contact => ({
      contact,
      score: calculateRelationshipScore(contact)
    }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Get color styling based on relationship health score
 */
function getScoreColor(score: number): { bg: string; text: string } {
  if (score < 30) {
    return { bg: 'bg-red-500/10', text: 'text-red-400' };
  } else if (score < 50) {
    return { bg: 'bg-orange-500/10', text: 'text-orange-400' };
  } else if (score < 70) {
    return { bg: 'bg-yellow-500/10', text: 'text-yellow-400' };
  } else {
    return { bg: 'bg-green-500/10', text: 'text-green-400' };
  }
}

/**
 * Get color styling based on days since interaction
 */
function getUrgencyColor(days: number | null): string {
  if (days === null) return 'text-red-500';
  if (days > 90) return 'text-red-500';
  if (days > 60) return 'text-orange-500';
  if (days > 30) return 'text-yellow-500';
  return 'text-adaptive-muted';
}

export default function RelationshipScoreCard({
  contacts,
  maxDisplay = 5
}: RelationshipScoreCardProps) {
  const sortedWithScores = useMemo(() => {
    return sortContactsByHealthScore(contacts);
  }, [contacts]);

  const displayedContacts = useMemo(() => {
    return sortedWithScores.slice(0, maxDisplay);
  }, [sortedWithScores, maxDisplay]);

  if (displayedContacts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold text-purple-300">Beziehungspflege benötigt</h2>
          <span className="text-sm text-adaptive-dim">Nach Health-Score sortiert</span>
        </div>

        {/* Empty State */}
        <div className="text-center py-8 text-adaptive-dim">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Alle Beziehungen sind gesund! 🎉</p>
          <p className="text-sm mt-1">Weiter so!</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/30 rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="w-5 h-5 text-purple-400" />
        <h2 className="font-semibold text-purple-300">Beziehungspflege benötigt</h2>
        <span className="text-sm text-adaptive-dim">Nach Health-Score sortiert</span>
      </div>

      {/* Contact Cards */}
      <div className="space-y-2">
        {displayedContacts.map(({ contact, score }) => {
          const colors = getScoreColor(score);

          return (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
            >
              {/* Avatar with Category Gradient */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                bg-gradient-to-br ${
                  contact.relationship_category === 'family'
                    ? 'from-pink-500/30 to-rose-500/30'
                    : 'from-cyan-500/30 to-blue-500/30'
                }
              `}>
                {contact.first_name[0].toUpperCase()}
              </div>

              {/* Info Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {getDisplayName(contact)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    contact.relationship_category === 'family'
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {contact.relationship_category === 'family' ? 'Familie' : 'Freund'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className={getUrgencyColor(contact.days_since_interaction)}>
                    {contact.days_since_interaction !== null
                      ? `Vor ${contact.days_since_interaction} Tagen`
                      : 'Nie kontaktiert'}
                  </span>
                  <span className="text-adaptive-dim">
                    {contact.interaction_count} Interaktionen
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className="flex flex-col items-end gap-1">
                <div className={`
                  px-2 py-1 rounded-lg text-sm font-bold
                  ${colors.bg} ${colors.text}
                `}>
                  {score.toFixed(0)}
                </div>

                {/* Warning Icon if >30 days */}
                {contact.needs_attention && (
                  <AlertCircle className="w-4 h-4 text-orange-400 animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
