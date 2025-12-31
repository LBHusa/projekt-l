'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users, Heart, AlertCircle, List, GitBranch, Share2, Upload, Calendar } from 'lucide-react';
import { ContactList, ContactForm, InteractionForm, RelationshipGraph, RelationshipTree } from '@/components/contacts';
import type { ContactWithStats, Contact, ContactFormData, InteractionFormData, RelationshipCategory } from '@/lib/types/contacts';
import { CATEGORY_META } from '@/lib/types/contacts';

type ViewMode = 'list' | 'tree' | 'graph';
import {
  getContactsWithStats,
  createContact,
  toggleFavorite,
  getContactsStats,
} from '@/lib/data/contacts';
import { createInteraction } from '@/lib/data/interactions';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    favorites: number;
    needingAttention: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<RelationshipCategory | null>(null);

  // Lade Kontakte
  const loadContacts = useCallback(async () => {
    try {
      const [contactsData, statsData] = await Promise.all([
        getContactsWithStats({ is_archived: false }),
        getContactsStats(),
      ]);
      setContacts(contactsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Kontakt erstellen
  const handleCreateContact = async (data: ContactFormData) => {
    try {
      await createContact(data);
      setShowContactForm(false);
      loadContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  // Favorit toggeln
  const handleToggleFavorite = async (contact: ContactWithStats) => {
    try {
      await toggleFavorite(contact.id);
      loadContacts();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Interaktion loggen
  const handleLogInteraction = async (data: InteractionFormData) => {
    try {
      await createInteraction(data);
      setShowInteractionForm(null);
      loadContacts();
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  // Kontakt-Detail öffnen
  const handleContactClick = (contact: ContactWithStats) => {
    router.push(`/contacts/${contact.id}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Kontakte</h1>
            <p className="text-white/60 text-sm">Beziehungen pflegen & XP sammeln</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/calendar/export"
            download
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors"
            title="Geburtstage & Jahrestage als ICS exportieren"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Kalender</span>
          </a>
          <Link
            href="/contacts/import"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importieren</span>
          </Link>
          <button
            onClick={() => setShowContactForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Neuer Kontakt</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Gesamt</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm">Favoriten</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.favorites}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm">Aufmerksamkeit</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.needingAttention}</p>
          </motion.div>
        </div>
      )}

      {/* View Toggle + Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === 'tree'
                ? 'bg-pink-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Stammbaum</span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === 'graph'
                ? 'bg-cyan-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Netzwerk</span>
          </button>
        </div>

        {/* Category Filter (for Graph view) */}
        {viewMode === 'graph' && (
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">Filter:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedCategory === null
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                Alle
              </button>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as RelationshipCategory)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedCategory === key
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{
                    backgroundColor:
                      selectedCategory === key ? `${meta.color}40` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {meta.icon} {meta.labelDe}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content based on View Mode */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {viewMode === 'list' && (
            <ContactList
              contacts={contacts}
              onContactClick={handleContactClick}
              onQuickInteraction={(contact) => setShowInteractionForm(contact)}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {viewMode === 'tree' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <RelationshipTree
                contacts={contacts}
                onContactClick={handleContactClick}
              />
            </motion.div>
          )}

          {viewMode === 'graph' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <RelationshipGraph
                contacts={contacts}
                onContactClick={handleContactClick}
                selectedCategory={selectedCategory}
              />
            </motion.div>
          )}
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showContactForm && (
          <ContactForm
            onSubmit={handleCreateContact}
            onCancel={() => setShowContactForm(false)}
          />
        )}

        {showInteractionForm && (
          <InteractionForm
            contact={showInteractionForm}
            onSubmit={handleLogInteraction}
            onCancel={() => setShowInteractionForm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
