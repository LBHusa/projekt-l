'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, Clock, Target } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { BookList, CourseList, BookForm, CourseForm, type BookFormData, type CourseFormData } from '@/components/weisheit';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import {
  getBooks,
  getCourses,
  getWeisheitStats,
  createBook,
  updateBook,
  deleteBook,
  updateBookProgress,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseProgress,
  type WeisheitStats,
} from '@/lib/data/weisheit';
import type { FactionWithStats, Book, Course } from '@/lib/database.types';

export default function WeisheitPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<WeisheitStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showBookForm, setShowBookForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const loadData = async () => {
    try {
      const [factionData, factionStats, booksData, coursesData, weisheitStats] = await Promise.all([
        getFaction('weisheit'),
        getUserFactionStat('weisheit'),
        getBooks(),
        getCourses(),
        getWeisheitStats(),
      ]);

      if (factionData) {
        setFaction({
          ...factionData,
          stats: factionStats,
        });
      }

      setBooks(booksData);
      setCourses(coursesData);
      setStats(weisheitStats);
    } catch (err) {
      console.error('Error loading weisheit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Book handlers
  const handleAddBook = () => {
    setEditingBook(null);
    setShowBookForm(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setShowBookForm(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    await deleteBook(bookId);
    await loadData();
  };

  const handleBookSubmit = async (data: BookFormData) => {
    if (editingBook) {
      await updateBook(editingBook.id, data);
    } else {
      await createBook(data);
    }
    setShowBookForm(false);
    setEditingBook(null);
    await loadData();
  };

  const handleBookProgressUpdate = async (bookId: string, currentPage: number) => {
    await updateBookProgress(bookId, currentPage);
    await loadData();
  };

  // Course handlers
  const handleAddCourse = () => {
    setEditingCourse(null);
    setShowCourseForm(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourse(courseId);
    await loadData();
  };

  const handleCourseSubmit = async (data: CourseFormData) => {
    if (editingCourse) {
      await updateCourse(editingCourse.id, data);
    } else {
      await createCourse(data);
    }
    setShowCourseForm(false);
    setEditingCourse(null);
    await loadData();
  };

  const handleCourseProgressUpdate = async (courseId: string, progress: number) => {
    try {
      console.log('Updating course progress:', { courseId, progress });
      await updateCourseProgress(courseId, progress);
      console.log('Course progress updated successfully');
      await loadData();
    } catch (error) {
      console.error('Error updating course progress:', error);
      alert('Fehler beim Speichern des Fortschritts. Bitte erneut versuchen.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-white/50">Lade Weisheit-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Weisheit-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  // Additional stats for the stats bar
  const additionalStats = [];
  if (stats) {
    if (stats.booksRead > 0) {
      additionalStats.push({
        label: 'Gelesene Bücher',
        value: stats.booksRead,
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-green-400',
      });
    }
    if (stats.coursesCompleted > 0) {
      additionalStats.push({
        label: 'Abgeschl. Kurse',
        value: stats.coursesCompleted,
        icon: <GraduationCap className="w-4 h-4" />,
        color: 'text-cyan-400',
      });
    }
    if (stats.totalPagesRead > 0) {
      additionalStats.push({
        label: 'Seiten gelesen',
        value: stats.totalPagesRead.toLocaleString('de-DE'),
        icon: <Target className="w-4 h-4" />,
        color: 'text-amber-400',
      });
    }
    if (stats.totalCourseHours > 0) {
      additionalStats.push({
        label: 'Kursstunden',
        value: `${stats.totalCourseHours} Std.`,
        icon: <Clock className="w-4 h-4" />,
        color: 'text-pink-400',
      });
    }
  }

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Currently Active Highlight */}
        {(stats?.currentlyReading || stats?.currentCourse) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Currently Reading */}
            {stats.currentlyReading && (
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <BookOpen className="w-4 h-4" />
                  Lese gerade
                </div>
                <h2 className="text-lg font-bold mb-1">{stats.currentlyReading.title}</h2>
                {stats.currentlyReading.author && (
                  <p className="text-white/70 text-sm">{stats.currentlyReading.author}</p>
                )}
                {stats.currentlyReading.pages && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                      <span>Seite {stats.currentlyReading.current_page}</span>
                      <span>{Math.round((stats.currentlyReading.current_page / stats.currentlyReading.pages) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${(stats.currentlyReading.current_page / stats.currentlyReading.pages) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Course */}
            {stats.currentCourse && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Aktueller Kurs
                </div>
                <h2 className="text-lg font-bold mb-1">{stats.currentCourse.title}</h2>
                {stats.currentCourse.platform && (
                  <p className="text-white/70 text-sm">{stats.currentCourse.platform}</p>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Fortschritt</span>
                    <span>{stats.currentCourse.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${stats.currentCourse.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Book List */}
          <BookList
            books={books}
            onAddBook={handleAddBook}
            onEditBook={handleEditBook}
            onDeleteBook={handleDeleteBook}
            onUpdateProgress={handleBookProgressUpdate}
          />

          {/* Course List */}
          <CourseList
            courses={courses}
            onAddCourse={handleAddCourse}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
            onUpdateProgress={handleCourseProgressUpdate}
          />
        </div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="weisheit"
            factionColor={faction.color}
          />
        </div>
      </main>

      {/* Book Form Modal */}
      <BookForm
        book={editingBook}
        isOpen={showBookForm}
        onClose={() => {
          setShowBookForm(false);
          setEditingBook(null);
        }}
        onSubmit={handleBookSubmit}
      />

      {/* Course Form Modal */}
      <CourseForm
        course={editingCourse}
        isOpen={showCourseForm}
        onClose={() => {
          setShowCourseForm(false);
          setEditingCourse(null);
        }}
        onSubmit={handleCourseSubmit}
      />
    </div>
  );
}
