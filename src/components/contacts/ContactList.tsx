'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Users, Heart, AlertCircle } from 'lucide-react';
import ContactCard from './ContactCard';
import type { ContactWithStats, RelationshipCategory, ContactFilters } from '@/lib/types/contacts';
import { CATEGORY_META } from '@/lib/types/contacts';

interface ContactListProps {
  contacts: ContactWithStats[];
  onContactClick?: (contact: ContactWithStats) => void;
  onQuickInteraction?: (contact: ContactWithStats) => void;
  onToggleFavorite?: (contact: ContactWithStats) => void;
  onFilterChange?: (filters: ContactFilters) => void;
}

export default function ContactList({
  contacts,
  onContactClick,
  onQuickInteraction,
  onToggleFavorite,
  onFilterChange,
}: ContactListProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<RelationshipCategory | 'all' | 'favorites' | 'attention'>('all');

  // Filtere Kontakte
  const filteredContacts = contacts.filter((contact) => {
    // Suchfilter
    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch =
        contact.first_name.toLowerCase().includes(searchLower) ||
        (contact.last_name?.toLowerCase().includes(searchLower)) ||
        (contact.nickname?.toLowerCase().includes(searchLower));
      if (!nameMatch) return false;
    }

    // Kategorie-Filter
    if (activeCategory === 'favorites') return contact.is_favorite;
    if (activeCategory === 'attention') return contact.needs_attention;
    if (activeCategory !== 'all') return contact.relationship_category === activeCategory;

    return true;
  });

  // Statistiken für Filter-Badges
  const stats = {
    all: contacts.length,
    family: contacts.filter((c) => c.relationship_category === 'family').length,
    friend: contacts.filter((c) => c.relationship_category === 'friend').length,
    professional: contacts.filter((c) => c.relationship_category === 'professional').length,
    other: contacts.filter((c) => c.relationship_category === 'other').length,
    favorites: contacts.filter((c) => c.is_favorite).length,
    attention: contacts.filter((c) => c.needs_attention).length,
  };

  const categories: Array<{ key: RelationshipCategory | 'all' | 'favorites' | 'attention'; label: string; icon: string; color?: string }> = [
    { key: 'all', label: 'Alle', icon: '👥' },
    { key: 'family', label: CATEGORY_META.family.labelDe, icon: CATEGORY_META.family.icon, color: CATEGORY_META.family.color },
    { key: 'friend', label: CATEGORY_META.friend.labelDe, icon: CATEGORY_META.friend.icon, color: CATEGORY_META.friend.color },
    { key: 'professional', label: CATEGORY_META.professional.labelDe, icon: CATEGORY_META.professional.icon, color: CATEGORY_META.professional.color },
    { key: 'favorites', label: 'Favoriten', icon: '❤️', color: '#ef4444' },
    { key: 'attention', label: 'Aufmerksamkeit', icon: '⚠️', color: '#f59e0b' },
  ];

  return (
    <div className="space-y-4">
      {/* Suchleiste */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-adaptive-dim" />
        <input
          type="text"
          placeholder="Kontakt suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Kategorie-Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
            }`}
            style={{
              borderColor: activeCategory === cat.key && cat.color ? cat.color : 'transparent',
              borderWidth: '1px',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span className="text-xs text-adaptive-dim">
              {stats[cat.key as keyof typeof stats]}
            </span>
          </button>
        ))}
      </div>

      {/* Kontaktliste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredContacts.map((contact) => (
            <motion.div
              key={contact.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ContactCard
                contact={contact}
                onClick={() => onContactClick?.(contact)}
                onQuickInteraction={() => onQuickInteraction?.(contact)}
                onToggleFavorite={() => onToggleFavorite?.(contact)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Leere State */}
      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-adaptive-dim mx-auto mb-4" />
          <p className="text-adaptive-dim">
            {search
              ? 'Keine Kontakte gefunden'
              : activeCategory === 'favorites'
              ? 'Keine Favoriten'
              : activeCategory === 'attention'
              ? 'Alle Kontakte sind gepflegt!'
              : 'Noch keine Kontakte'}
          </p>
        </div>
      )}
    </div>
  );
}
