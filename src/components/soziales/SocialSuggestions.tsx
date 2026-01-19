'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import type { ContactWithStats } from '@/lib/types/contacts';
import { getDisplayName } from '@/lib/types/contacts';

interface SocialSuggestionsProps {
  contacts: ContactWithStats[];
  maxDisplay?: number;
}

interface SuggestionContact {
  contact: ContactWithStats;
  daysSince: number;
  urgency: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Kategorisiere Kontakte basierend auf Zeit seit letzter Interaktion
 */
function categorizeBypriority(contacts: ContactWithStats[]): SuggestionContact[] {
  return contacts
    .filter(contact => contact.days_since_interaction !== null)
    .map(contact => {
      const daysSince = contact.days_since_interaction!;

      // Bestimme Urgency und Message basierend auf Zeit
      let urgency: 'high' | 'medium' | 'low';
      let message: string;

      if (daysSince > 90) {
        urgency = 'high';
        message = `Schon ${daysSince} Tage her! Zeit für ein Treffen.`;
      } else if (daysSince > 60) {
        urgency = 'medium';
        message = `${daysSince} Tage ohne Kontakt. Vielleicht mal melden?`;
      } else if (daysSince > 30) {
        urgency = 'low';
        message = `${daysSince} Tage her. Ein kurzes Hallo wäre nett.`;
      } else {
        // Skip - kürzlich kontaktiert
        return null;
      }

      return {
        contact,
        daysSince,
        urgency,
        message,
      };
    })
    .filter((item): item is SuggestionContact => item !== null)
    .sort((a, b) => b.daysSince - a.daysSince); // Sortiere nach längster Zeit
}

/**
 * Get urgency styling
 */
function getUrgencyStyles(urgency: 'high' | 'medium' | 'low') {
  switch (urgency) {
    case 'high':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: Clock,
      };
    case 'low':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: Users,
      };
  }
}

export default function SocialSuggestions({
  contacts,
  maxDisplay = 5
}: SocialSuggestionsProps) {
  const suggestions = useMemo(() => {
    const categorized = categorizeBypriority(contacts);
    return categorized.slice(0, maxDisplay);
  }, [contacts, maxDisplay]);

  if (suggestions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-400" />
          <h2 className="font-semibold text-green-300">Event-Vorschläge</h2>
        </div>

        {/* Empty State - All good! */}
        <div className="text-center py-8 text-adaptive-muted">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-50 text-green-400" />
          <p className="text-green-300">Alle Kontakte sind aktuell! 🎉</p>
          <p className="text-sm mt-1">Du bleibst gut in Verbindung.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-amber-400" />
        <h2 className="font-semibold text-amber-300">Event-Vorschläge</h2>
        <span className="text-sm text-adaptive-dim">Basierend auf Kontakt-Intervallen</span>
      </div>

      {/* Suggestion Cards */}
      <div className="space-y-2">
        {suggestions.map(({ contact, daysSince, urgency, message }) => {
          const styles = getUrgencyStyles(urgency);
          const Icon = styles.icon;

          return (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className={`
                flex items-center gap-3 p-3 ${styles.bg} border ${styles.border}
                hover:bg-white/10 rounded-lg transition-all group
              `}
            >
              {/* Urgency Icon */}
              <div className="flex-shrink-0">
                <Icon className={`w-5 h-5 ${styles.text}`} />
              </div>

              {/* Avatar */}
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

                <p className={`text-sm mt-1 ${styles.text}`}>
                  {message}
                </p>
              </div>

              {/* Days Badge */}
              <div className={`
                px-3 py-1 rounded-lg text-sm font-bold
                ${styles.bg} ${styles.text} border ${styles.border}
              `}>
                {daysSince}d
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Hint */}
      <div className="mt-4 text-center text-xs text-adaptive-dim">
        💡 Tipp: Plane ein Event mit diesen Kontakten, um die Beziehung zu stärken
      </div>
    </motion.div>
  );
}
