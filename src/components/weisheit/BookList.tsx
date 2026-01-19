'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Edit2, Trash2, ChevronRight, Star, BookMarked } from 'lucide-react';
import type { Book, BookStatus } from '@/lib/database.types';

interface BookListProps {
  books: Book[];
  onAddBook?: () => void;
  onEditBook?: (book: Book) => void;
  onDeleteBook?: (bookId: string) => void;
  onUpdateProgress?: (bookId: string, currentPage: number) => void;
}

const statusLabels: Record<BookStatus, string> = {
  to_read: 'Zu lesen',
  reading: 'Lese gerade',
  read: 'Gelesen',
  abandoned: 'Abgebrochen',
};

const statusColors: Record<BookStatus, string> = {
  to_read: 'bg-blue-500/20 text-blue-400',
  reading: 'bg-amber-500/20 text-amber-400',
  read: 'bg-green-500/20 text-green-400',
  abandoned: 'bg-gray-500/20 text-gray-400',
};

export default function BookList({
  books,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onUpdateProgress,
}: BookListProps) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'all'>('all');

  const filteredBooks = filterStatus === 'all'
    ? books
    : books.filter(b => b.status === filterStatus);

  const calculateProgress = (book: Book): number => {
    if (!book.pages || book.pages === 0) return 0;
    return Math.round((book.current_page / book.pages) * 100);
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-adaptive-dim'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Bibliothek
        </h2>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as BookStatus | 'all')}
            className="px-2 py-1 text-sm bg-white/10 border border-white/20 rounded-lg text-adaptive-muted"
          >
            <option value="all">Alle</option>
            <option value="reading">Lese gerade</option>
            <option value="to_read">Zu lesen</option>
            <option value="read">Gelesen</option>
          </select>
          {onAddBook && (
            <button
              onClick={onAddBook}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buch
            </button>
          )}
        </div>
      </div>

      {/* Book List */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-8 text-adaptive-dim">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Keine Bücher gefunden</p>
          {onAddBook && filterStatus === 'all' && (
            <button
              onClick={onAddBook}
              className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Erstes Buch hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="relative bg-white/5 border border-white/10 hover:border-white/20 rounded-lg p-4 cursor-pointer transition-all"
              onClick={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{book.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[book.status]}`}>
                      {statusLabels[book.status]}
                    </span>
                  </div>
                  {book.author && (
                    <p className="text-sm text-adaptive-muted truncate">{book.author}</p>
                  )}
                  {book.status === 'read' && book.rating && (
                    <div className="mt-1">
                      {renderRating(book.rating)}
                    </div>
                  )}
                </div>

                {/* Progress for reading books */}
                {book.status === 'reading' && book.pages && (
                  <div className="text-right ml-4">
                    <div className="text-sm text-adaptive-muted">
                      {book.current_page} / {book.pages} S.
                    </div>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${calculateProgress(book)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedBook === book.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    {book.genre && (
                      <div className="text-adaptive-muted">
                        <span className="text-adaptive-dim">Genre:</span> {book.genre}
                      </div>
                    )}
                    {book.pages && (
                      <div className="text-adaptive-muted">
                        <span className="text-adaptive-dim">Seiten:</span> {book.pages}
                      </div>
                    )}
                    {book.started_at && (
                      <div className="text-adaptive-muted">
                        <span className="text-adaptive-dim">Begonnen:</span>{' '}
                        {new Date(book.started_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                    {book.finished_at && (
                      <div className="text-adaptive-muted">
                        <span className="text-adaptive-dim">Beendet:</span>{' '}
                        {new Date(book.finished_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>

                  {book.notes && (
                    <p className="text-sm text-adaptive-muted mb-3">{book.notes}</p>
                  )}

                  {book.xp_gained > 0 && (
                    <div className="text-xs text-indigo-400 mb-3">
                      +{book.xp_gained} XP erhalten
                    </div>
                  )}

                  {/* Progress Update for reading books */}
                  {book.status === 'reading' && onUpdateProgress && (
                    <div className="flex items-center gap-2 mb-4">
                      <BookMarked className="w-4 h-4 text-adaptive-dim" />
                      <input
                        type="number"
                        min={0}
                        max={book.pages || 9999}
                        value={book.current_page}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const page = parseInt(e.target.value) || 0;
                          onUpdateProgress(book.id, page);
                        }}
                        className="w-20 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded"
                      />
                      <span className="text-sm text-adaptive-dim">/ {book.pages || '?'} Seiten</span>
                    </div>
                  )}

                  {/* Actions */}
                  {(onEditBook || onDeleteBook) && (
                    <div className="flex gap-2">
                      {onEditBook && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBook(book);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </button>
                      )}
                      {onDeleteBook && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Buch wirklich löschen?')) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <ChevronRight
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-adaptive-dim transition-transform ${
                  expandedBook === book.id ? 'rotate-90' : ''
                }`}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
