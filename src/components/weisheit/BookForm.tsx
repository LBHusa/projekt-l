'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, X, Star } from 'lucide-react';
import type { Book, BookStatus } from '@/lib/database.types';

interface BookFormProps {
  book?: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookFormData) => Promise<void>;
}

export interface BookFormData {
  title: string;
  author: string | null;
  isbn: string | null;
  genre: string | null;
  pages: number | null;
  status: BookStatus;
  rating: number | null;
  notes: string | null;
}

const genres = [
  'Belletristik',
  'Sachbuch',
  'Biografie',
  'Wissenschaft',
  'Technologie',
  'Wirtschaft',
  'Philosophie',
  'Geschichte',
  'Selbsthilfe',
  'Fantasy',
  'Thriller',
  'Andere',
];

export default function BookForm({ book, isOpen, onClose, onSubmit }: BookFormProps) {
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: null,
    isbn: null,
    genre: null,
    pages: null,
    status: 'to_read',
    rating: null,
    notes: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        genre: book.genre,
        pages: book.pages,
        status: book.status,
        rating: book.rating,
        notes: book.notes,
      });
    } else {
      setFormData({
        title: '',
        author: null,
        isbn: null,
        genre: null,
        pages: null,
        status: 'to_read',
        rating: null,
        notes: null,
      });
    }
    setError(null);
  }, [book, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating: prev.rating === rating ? null : rating,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            {book ? 'Buch bearbeiten' : 'Neues Buch'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Titel *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="Buchtitel"
              required
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Autor</label>
            <input
              type="text"
              value={formData.author || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value || null }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="Autor des Buches"
            />
          </div>

          {/* Genre & Pages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Genre</label>
              <select
                value={formData.genre || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value || null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Auswählen...</option>
                {genres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Seiten</label>
              <input
                type="number"
                min={1}
                value={formData.pages || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pages: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="z.B. 320"
              />
            </div>
          </div>

          {/* ISBN */}
          <div>
            <label className="block text-sm text-white/60 mb-1">ISBN</label>
            <input
              type="text"
              value={formData.isbn || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value || null }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="978-3-..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as BookStatus }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              <option value="to_read">Zu lesen</option>
              <option value="reading">Lese gerade</option>
              <option value="read">Gelesen</option>
              <option value="abandoned">Abgebrochen</option>
            </select>
          </div>

          {/* Rating (only for read books) */}
          {formData.status === 'read' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Bewertung</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        formData.rating && star <= formData.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/20'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Gedanken zum Buch..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Speichern...' : book ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
