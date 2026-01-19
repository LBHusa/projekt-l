'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Clock } from 'lucide-react';
import type { ContactWithStats } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

interface NeedingAttentionProps {
  contacts: ContactWithStats[];
  maxDisplay?: number;
}

export default function NeedingAttention({ contacts, maxDisplay = 5 }: NeedingAttentionProps) {
  const displayContacts = contacts.slice(0, maxDisplay);

  if (displayContacts.length === 0) {
    return null;
  }

  // Format: "vor X Tagen" oder "Nie"
  const formatDaysSince = (days: number | null): string => {
    if (days === null) return 'Nie kontaktiert';
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    if (days < 365) return `vor ${Math.floor(days / 30)} Monaten`;
    return `vor ${Math.floor(days / 365)} Jahr(en)`;
  };

  // Farbe basierend auf Dringlichkeit
  const getDaysColor = (days: number | null): string => {
    if (days === null) return 'text-red-400';
    if (days > 90) return 'text-red-400';
    if (days > 60) return 'text-orange-400';
    if (days > 30) return 'text-yellow-400';
    return 'text-adaptive-muted';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-[var(--background-secondary)]/60 border border-amber-500/20 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-adaptive">Braucht Aufmerksamkeit</h3>
        </div>
        {contacts.length > maxDisplay && (
          <Link
            href="/contacts?filter=attention"
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Alle ({contacts.length})
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {displayContacts.map((contact) => {
          const typeMeta = RELATIONSHIP_TYPE_META[contact.relationship_type];
          const displayName = getDisplayName(contact);
          const daysSince = contact.days_since_interaction;

          return (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: contact.photo_url ? 'transparent' : 'rgba(245, 158, 11, 0.2)',
                  backgroundImage: contact.photo_url ? `url(${contact.photo_url})` : undefined,
                  backgroundSize: 'cover',
                }}
              >
                {!contact.photo_url && <span className="text-sm">{typeMeta.icon}</span>}
              </div>

              {/* Name & Type */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate group-hover:text-amber-300 transition-colors">
                  {displayName}
                </p>
                <p className="text-xs text-adaptive-dim">{typeMeta.labelDe}</p>
              </div>

              {/* Days Since */}
              <div className={`text-xs font-medium flex items-center gap-1 ${getDaysColor(daysSince)}`}>
                <Clock className="w-3 h-3" />
                {formatDaysSince(daysSince)}
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
