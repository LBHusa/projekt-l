'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Cake, ChevronRight } from 'lucide-react';
import type { ContactWithStats } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

interface UpcomingBirthdaysProps {
  contacts: ContactWithStats[];
  maxDisplay?: number;
}

export default function UpcomingBirthdays({ contacts, maxDisplay = 5 }: UpcomingBirthdaysProps) {
  const displayContacts = contacts.slice(0, maxDisplay);

  if (displayContacts.length === 0) {
    return null;
  }

  // Format: "in X Tagen" oder "Heute!" oder "Morgen"
  const formatDaysUntil = (days: number | null): string => {
    if (days === null) return '';
    if (days === 0) return 'Heute!';
    if (days === 1) return 'Morgen';
    if (days <= 7) return `in ${days} Tagen`;
    return `in ${days} Tagen`;
  };

  // Farbe basierend auf Dringlichkeit
  const getDaysColor = (days: number | null): string => {
    if (days === null) return 'text-adaptive-dim';
    if (days === 0) return 'text-pink-400';
    if (days === 1) return 'text-orange-400';
    if (days <= 7) return 'text-yellow-400';
    return 'text-adaptive-muted';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--background-secondary)]/60 border border-pink-500/20 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-medium text-adaptive">Geburtstage</h3>
        </div>
        {contacts.length > maxDisplay && (
          <Link
            href="/contacts?filter=birthdays"
            className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
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
          const daysUntil = contact.days_until_birthday;

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
                  backgroundColor: contact.photo_url ? 'transparent' : 'rgba(236, 72, 153, 0.2)',
                  backgroundImage: contact.photo_url ? `url(${contact.photo_url})` : undefined,
                  backgroundSize: 'cover',
                }}
              >
                {!contact.photo_url && <span className="text-sm">{typeMeta.icon}</span>}
              </div>

              {/* Name & Type */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate group-hover:text-pink-300 transition-colors">
                  {displayName}
                </p>
                <p className="text-xs text-adaptive-dim">{typeMeta.labelDe}</p>
              </div>

              {/* Days Until */}
              <div className={`text-xs font-medium ${getDaysColor(daysUntil)}`}>
                {formatDaysUntil(daysUntil)}
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
