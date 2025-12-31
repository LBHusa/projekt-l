'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, BookMarked, Plus, Star, Clock, CheckCircle2 } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import type { FactionWithStats, Book, Course, BookStatus, CourseStatus } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const BOOK_STATUS_CONFIG: Record<BookStatus, { label: string; color: string }> = {
  to_read: { label: 'Zu lesen', color: 'text-gray-400' },
  reading: { label: 'Lese ich', color: 'text-blue-400' },
  read: { label: 'Gelesen', color: 'text-green-400' },
  abandoned: { label: 'Abgebrochen', color: 'text-red-400' },
};

const COURSE_STATUS_CONFIG: Record<CourseStatus, { label: string; color: string }> = {
  planned: { label: 'Geplant', color: 'text-gray-400' },
  in_progress: { label: 'In Bearbeitung', color: 'text-blue-400' },
  completed: { label: 'Abgeschlossen', color: 'text-green-400' },
  abandoned: { label: 'Abgebrochen', color: 'text-red-400' },
};

export default function LernenPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient();

        const [factionData, factionStats] = await Promise.all([
          getFaction('lernen'),
          getUserFactionStat('lernen'),
        ]);

        if (factionData) {
          setFaction({
            ...factionData,
            stats: factionStats,
          });
        }

        // Load books
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('updated_at', { ascending: false });

        if (booksError && booksError.code !== 'PGRST116') {
          console.error('Error fetching books:', booksError);
        }

        setBooks(booksData || []);

        // Load courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('updated_at', { ascending: false });

        if (coursesError && coursesError.code !== 'PGRST116') {
          console.error('Error fetching courses:', coursesError);
        }

        setCourses(coursesData || []);
      } catch (err) {
        console.error('Error loading lernen data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-white/50">Lade Lern-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Lernen-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  const booksRead = books.filter(b => b.status === 'read').length;
  const currentlyReading = books.filter(b => b.status === 'reading').length;
  const coursesCompleted = courses.filter(c => c.status === 'completed').length;
  const coursesInProgress = courses.filter(c => c.status === 'in_progress').length;

  const additionalStats = [
    {
      label: 'Bucher gelesen',
      value: booksRead,
      icon: <BookMarked className="w-4 h-4" />,
      color: 'text-indigo-400',
    },
    {
      label: 'Kurse abgeschlossen',
      value: coursesCompleted,
      icon: <GraduationCap className="w-4 h-4" />,
      color: 'text-green-400',
    },
  ];

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

        {/* Learning Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
            <BookMarked className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-indigo-400">{booksRead}</div>
            <div className="text-sm text-white/50">Bucher gelesen</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{currentlyReading}</div>
            <div className="text-sm text-white/50">Lese gerade</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <GraduationCap className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">{coursesCompleted}</div>
            <div className="text-sm text-white/50">Kurse fertig</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-cyan-400">{coursesInProgress}</div>
            <div className="text-sm text-white/50">Kurse aktiv</div>
          </div>
        </motion.div>

        {/* Bookshelf */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold">Bucherregal</h2>
              <span className="text-sm text-white/40">({books.length} Bucher)</span>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm transition-colors"
              onClick={() => {/* TODO: Open create modal */}}
            >
              <Plus className="w-4 h-4" />
              Buch hinzufugen
            </button>
          </div>

          {books.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.slice(0, 10).map((book) => {
                const statusConfig = BOOK_STATUS_CONFIG[book.status];
                return (
                  <div
                    key={book.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden transition-colors group"
                  >
                    {/* Book Cover */}
                    <div className="aspect-[2/3] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-12 h-12 text-white/20" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">{book.title}</h3>
                      {book.author && (
                        <p className="text-xs text-white/40 truncate">{book.author}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {book.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-white/50">{book.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Bucher im Regal</p>
              <p className="text-sm mt-1">Fuge dein erstes Buch hinzu!</p>
            </div>
          )}
        </motion.div>

        {/* Course Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold">Kurs-Tracker</h2>
              <span className="text-sm text-white/40">({courses.length} Kurse)</span>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors"
              onClick={() => {/* TODO: Open create modal */}}
            >
              <Plus className="w-4 h-4" />
              Kurs hinzufugen
            </button>
          </div>

          {courses.length > 0 ? (
            <div className="space-y-3">
              {courses.slice(0, 5).map((course) => {
                const statusConfig = COURSE_STATUS_CONFIG[course.status];
                return (
                  <div
                    key={course.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{course.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/40">
                          {course.platform && <span>{course.platform}</span>}
                          {course.instructor && <span>by {course.instructor}</span>}
                        </div>
                      </div>
                      <span className={`text-xs ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {course.progress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-white/40">Fortschritt</span>
                          <span className="text-white/60">{course.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm text-white/40">
                      {course.total_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.completed_hours || 0}/{course.total_hours}h
                        </span>
                      )}
                      {course.certificate_url && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Zertifikat
                        </span>
                      )}
                      {course.xp_gained > 0 && (
                        <span className="text-green-400">+{course.xp_gained} XP</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Noch keine Kurse hinzugefugt</p>
              <p className="text-sm mt-1">Tracke deinen Lernfortschritt!</p>
            </div>
          )}
        </motion.div>

        {/* Skills Section */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
          <FactionSkillsSection
            factionId="lernen"
            factionColor={faction.color}
          />
        </div>
      </main>
    </div>
  );
}
