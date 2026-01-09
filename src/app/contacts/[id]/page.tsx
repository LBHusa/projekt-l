'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  MessageCircle,
  Phone,
  MapPin,
  BellOff,
  Bell,
} from 'lucide-react';
import { ContactForm, InteractionForm } from '@/components/contacts';
import type {
  ContactWithStats,
  ContactFormData,
  InteractionFormData,
  ContactInteraction,
} from '@/lib/types/contacts';
import {
  RELATIONSHIP_TYPE_META,
  INTERACTION_TYPE_META,
  QUALITY_META,
  getDisplayName,
  calculateXpForNextLevel,
} from '@/lib/types/contacts';
import {
  getContactWithStatsById,
  updateContact,
  deleteContact,
  toggleFavorite,
} from '@/lib/data/contacts';
import { getInteractionsByContact, createInteraction, getInteractionStats } from '@/lib/data/interactions';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<ContactWithStats | null>(null);
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    last30Days: number;
    avgQuality: number;
    totalXp: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Lade Kontakt-Daten
  const loadContact = useCallback(async () => {
    try {
      const [contactData, interactionsData, statsData] = await Promise.all([
        getContactWithStatsById(id),
        getInteractionsByContact(id, 20),
        getInteractionStats(id),
      ]);

      if (!contactData) {
        router.push('/contacts');
        return;
      }

      setContact(contactData);
      setInteractions(interactionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading contact:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  // Kontakt bearbeiten
  const handleUpdateContact = async (data: ContactFormData) => {
    try {
      await updateContact(id, data);
      setShowEditForm(false);
      loadContact();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  // Kontakt löschen
  const handleDeleteContact = async () => {
    try {
      await deleteContact(id);
      router.push('/contacts');
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  // Favorit toggeln
  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(id);
      loadContact();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Interaktion loggen
  const handleLogInteraction = async (data: InteractionFormData) => {
    try {
      await createInteraction(data);
      setShowInteractionForm(false);
      loadContact();
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  // Aufmerksamkeits-Erinnerung unterdrücken
  const handleToggleSuppressAttention = async () => {
    try {
      await updateContact(id, {
        suppress_attention_reminder: !contact?.suppress_attention_reminder
      });
      loadContact();
    } catch (error) {
      console.error('Error toggling suppress attention:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const typeMeta = RELATIONSHIP_TYPE_META[contact.relationship_type];
  const displayName = getDisplayName(contact);
  const xpForNext = calculateXpForNextLevel(contact.relationship_level);

  // Formatiere Datum
  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatiere "vor X Tagen"
  const formatTimeAgo = (date: string): string => {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `Vor ${days} Tagen`;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link
          href="/contacts"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg transition-colors ${
              contact.is_favorite
                ? 'bg-red-500/20 text-red-500'
                : 'bg-white/5 text-adaptive-dim hover:text-red-500'
            }`}
            title={contact.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          >
            <Heart className="w-5 h-5" fill={contact.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleToggleSuppressAttention}
            className={`p-2 rounded-lg transition-colors ${
              contact.suppress_attention_reminder
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-white/5 text-adaptive-dim hover:text-amber-500'
            }`}
            title={contact.suppress_attention_reminder ? 'Erinnerungen aktivieren' : 'Erinnerungen deaktivieren'}
          >
            {contact.suppress_attention_reminder ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-adaptive-muted transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-adaptive-dim hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Profil-Karte */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl flex-shrink-0"
            style={{
              backgroundColor: contact.photo_url ? 'transparent' : 'var(--accent-primary)20',
              backgroundImage: contact.photo_url ? `url(${contact.photo_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!contact.photo_url && typeMeta.icon}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-adaptive">{displayName}</h1>
            <p className="text-adaptive-muted">{typeMeta.labelDe}</p>

            {/* Level & XP */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-adaptive-muted">Level {contact.relationship_level}</span>
                <span className="text-adaptive-dim">
                  {contact.current_xp} / {xpForNext} XP
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${contact.progress_percent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-adaptive">{contact.interaction_count}</p>
            <p className="text-xs text-adaptive-dim">Interaktionen</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-adaptive">{contact.trust_level}</p>
            <p className="text-xs text-adaptive-dim">Vertrauen</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-adaptive">
              {stats?.last30Days || 0}
            </p>
            <p className="text-xs text-adaptive-dim">Letzte 30 Tage</p>
          </div>
        </div>
      </motion.div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Wichtige Daten */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-adaptive-muted mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Wichtige Daten
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-adaptive-dim">Geburtstag</span>
              <span className="text-adaptive">{formatDate(contact.birthday)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-adaptive-dim">Jahrestag</span>
              <span className="text-adaptive">{formatDate(contact.anniversary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-adaptive-dim">Kennengelernt</span>
              <span className="text-adaptive">{formatDate(contact.met_date)}</span>
            </div>
            {contact.met_context && (
              <div className="flex justify-between">
                <span className="text-adaptive-dim">Kontext</span>
                <span className="text-adaptive">{contact.met_context}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Gemeinsame Interessen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-adaptive-muted mb-3">Gemeinsame Interessen</h3>
          {contact.shared_interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contact.shared_interests.map((interest, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-adaptive-dim text-sm">Keine Interessen hinterlegt</p>
          )}

          {contact.notes && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-adaptive-dim mb-1">Notizen</p>
              <p className="text-sm text-adaptive">{contact.notes}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Interaktions-Historie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-adaptive-muted flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Interaktions-Historie
          </h3>
          <button
            onClick={() => setShowInteractionForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neu
          </button>
        </div>

        {interactions.length > 0 ? (
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const interactionMeta = INTERACTION_TYPE_META[interaction.interaction_type];
              const qualityMeta = QUALITY_META[interaction.quality];

              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-xl">{interactionMeta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-adaptive font-medium">
                        {interaction.title || interactionMeta.labelDe}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: qualityMeta.color + '20',
                          color: qualityMeta.color,
                        }}
                      >
                        {qualityMeta.labelDe}
                      </span>
                    </div>
                    {interaction.description && (
                      <p className="text-sm text-adaptive-muted truncate">{interaction.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-adaptive-dim mt-1">
                      <span>{formatTimeAgo(interaction.occurred_at)}</span>
                      {interaction.duration_minutes && (
                        <span>{interaction.duration_minutes} Min</span>
                      )}
                      <span className="text-purple-400">+{interaction.xp_gained} XP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-adaptive-dim text-sm text-center py-4">
            Noch keine Interaktionen
          </p>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showEditForm && (
          <ContactForm
            initialData={{
              first_name: contact.first_name,
              last_name: contact.last_name ?? undefined,
              nickname: contact.nickname ?? undefined,
              relationship_type: contact.relationship_type,
              birthday: contact.birthday ?? undefined,
              anniversary: contact.anniversary ?? undefined,
              met_date: contact.met_date ?? undefined,
              met_context: contact.met_context ?? undefined,
              notes: contact.notes ?? undefined,
              shared_interests: contact.shared_interests,
              trust_level: contact.trust_level,
              is_favorite: contact.is_favorite,
            }}
            onSubmit={handleUpdateContact}
            onCancel={() => setShowEditForm(false)}
          />
        )}

        {showInteractionForm && (
          <InteractionForm
            contact={contact}
            onSubmit={handleLogInteraction}
            onCancel={() => setShowInteractionForm(false)}
          />
        )}

        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-adaptive mb-2">Kontakt löschen?</h3>
              <p className="text-adaptive-muted text-sm mb-4">
                {displayName} und alle Interaktionen werden unwiderruflich gelöscht.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteContact}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
