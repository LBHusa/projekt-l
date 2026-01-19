'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, Clock, AlertCircle } from 'lucide-react';
import type { ContactWithStats } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

interface ContactCardProps {
  contact: ContactWithStats;
  onClick?: () => void;
  onQuickInteraction?: () => void;
  onToggleFavorite?: () => void;
}

export default function ContactCard({
  contact,
  onClick,
  onQuickInteraction,
  onToggleFavorite,
}: ContactCardProps) {
  const typeMeta = RELATIONSHIP_TYPE_META[contact.relationship_type];
  const displayName = getDisplayName(contact);

  // Formatiere "vor X Tagen"
  const formatDaysAgo = (days: number | null): string => {
    if (days === null) return 'Noch nie';
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `Vor ${days} Tagen`;
  };

  return (
    <motion.div
      className="relative bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)] p-4 cursor-pointer hover:border-white/20 transition-colors"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header mit Foto und Name */}
      <div className="flex items-start gap-3">
        {/* Foto / Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            backgroundColor: contact.photo_url ? 'transparent' : 'var(--accent-primary)20',
            backgroundImage: contact.photo_url ? `url(${contact.photo_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!contact.photo_url && typeMeta.icon}
        </div>

        {/* Name und Typ */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{displayName}</h3>
          <p className="text-sm text-adaptive-muted">{typeMeta.labelDe}</p>
        </div>

        {/* Favorite */}
        <button
          className={`p-1 rounded-full transition-colors ${
            contact.is_favorite ? 'text-red-500' : 'text-adaptive-dim hover:text-red-500'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
        >
          <Heart className="w-5 h-5" fill={contact.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Level-Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-adaptive-muted">Level {contact.relationship_level}</span>
          <span className="text-adaptive-dim">{contact.progress_percent}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${contact.progress_percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Letzte Interaktion */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-adaptive-dim">
          <Clock className="w-3 h-3" />
          <span>{formatDaysAgo(contact.days_since_interaction)}</span>
        </div>

        {contact.needs_attention && (
          <div className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="w-3 h-3" />
            <span className="animate-pulse">Aufmerksamkeit</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-adaptive-muted hover:text-white text-sm transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onQuickInteraction?.();
          }}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Interaktion</span>
        </button>
      </div>

      {/* Geburtstag-Badge */}
      {contact.days_until_birthday !== null && contact.days_until_birthday <= 7 && (
        <motion.div
          className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {contact.days_until_birthday === 0
            ? 'Heute Geburtstag!'
            : `In ${contact.days_until_birthday}T`}
        </motion.div>
      )}
    </motion.div>
  );
}
