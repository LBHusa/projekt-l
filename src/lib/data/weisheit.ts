import { createBrowserClient } from '@/lib/supabase';
import type { Book, Course, BookStatus, CourseStatus } from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

// ============================================
// WEISHEIT DATA ACCESS
// Books & Courses for the Weisheit faction
// ============================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// BOOKS
// ============================================

export async function getBooks(
  userId: string = TEST_USER_ID
): Promise<Book[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    throw error;
  }

  return data || [];
}

export async function getBooksByStatus(
  status: BookStatus,
  userId: string = TEST_USER_ID
): Promise<Book[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching books by status:', error);
    throw error;
  }

  return data || [];
}

export async function getBook(bookId: string): Promise<Book | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export interface CreateBookInput {
  title: string;
  author?: string | null;
  isbn?: string | null;
  cover_url?: string | null;
  genre?: string | null;
  pages?: number | null;
  status?: BookStatus;
  notes?: string | null;
  related_skill_id?: string | null;
}

export async function createBook(
  input: CreateBookInput,
  userId: string = TEST_USER_ID
): Promise<Book> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('books')
    .insert({
      ...input,
      user_id: userId,
      status: input.status || 'to_read',
      current_page: 0,
      rating: null,
      xp_gained: 0,
      highlights: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating book:', error);
    throw error;
  }

  // ============================================
  // XP INTEGRATION FOR BOOKS CREATED AS 'READ'
  // ============================================
  if (input.status === 'read' && data) {
    const xpGained = calculateBookXp(data.pages);

    // Award XP to Weisheit faction
    if (xpGained > 0) {
      try {
        await updateFactionStats('weisheit', xpGained, userId);
      } catch (err) {
        console.error('Error updating faction stats for book creation:', err);
      }
    }

    // Log activity to feed
    try {
      await logActivity({
        userId,
        activityType: 'book_finished',
        factionId: 'weisheit',
        title: `Buch gelesen: "${data.title}"`,
        description: data.author ? `von ${data.author}` : undefined,
        xpAmount: xpGained,
        relatedEntityType: 'book',
        relatedEntityId: data.id,
        metadata: {
          pages: data.pages,
          genre: data.genre,
        },
      });
    } catch (err) {
      console.error('Error logging book creation activity:', err);
    }

    // Update book with XP and finished timestamp
    try {
      await supabase
        .from('books')
        .update({
          xp_gained: xpGained,
          finished_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    } catch (err) {
      console.error('Error updating book XP:', err);
    }
  }

  return data;
}

export async function updateBook(
  bookId: string,
  input: Partial<CreateBookInput & {
    rating?: number | null;
    current_page?: number;
    started_at?: string | null;
    finished_at?: string | null;
  }>
): Promise<Book> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('books')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .select()
    .single();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }

  return data;
}

export async function deleteBook(bookId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function updateBookProgress(
  bookId: string,
  currentPage: number,
  userId: string = TEST_USER_ID
): Promise<Book> {
  const book = await getBook(bookId);
  if (!book) {
    throw new Error('Book not found');
  }

  const updates: Partial<Book> = {
    current_page: currentPage,
  };

  // If just started reading, set started_at
  if (book.status === 'to_read' && currentPage > 0) {
    updates.status = 'reading';
    updates.started_at = new Date().toISOString();
  }

  // If finished reading (current_page >= pages)
  if (book.pages && currentPage >= book.pages && book.status !== 'read') {
    updates.status = 'read';
    updates.finished_at = new Date().toISOString();
    const xpGained = calculateBookXp(book.pages);
    updates.xp_gained = xpGained;

    // Update book first
    const updatedBook = await updateBook(bookId, updates);

    // Award XP to user's Weisheit faction
    if (xpGained > 0) {
      try {
        await updateFactionStats('weisheit', xpGained, userId);
      } catch (err) {
        console.error('Error updating faction stats for book completion:', err);
      }
    }

    // Log activity for feed visibility
    try {
      await logActivity({
        userId,
        activityType: 'book_finished',
        factionId: 'weisheit',
        title: `"${book.title}" fertig gelesen`,
        description: book.rating ? `Bewertung: ${'⭐'.repeat(book.rating)}` : undefined,
        xpAmount: xpGained,
        relatedEntityType: 'book',
        relatedEntityId: bookId,
        metadata: { rating: book.rating },
      });
    } catch (err) {
      console.error('Error logging book completion activity:', err);
    }

    return updatedBook;
  }

  // Normal path - book not yet completed
  return updateBook(bookId, updates);
}

// Calculate XP based on book length
function calculateBookXp(pages: number | null): number {
  if (!pages) return 50; // Base XP for unknown page count
  if (pages < 100) return 25;
  if (pages < 200) return 50;
  if (pages < 400) return 75;
  return 100; // Books 400+ pages
}

// ============================================
// COURSES
// ============================================

export async function getCourses(
  userId: string = TEST_USER_ID
): Promise<Course[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }

  return data || [];
}

export async function getCoursesByStatus(
  status: CourseStatus,
  userId: string = TEST_USER_ID
): Promise<Course[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses by status:', error);
    throw error;
  }

  return data || [];
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export interface CreateCourseInput {
  title: string;
  platform?: string | null;
  instructor?: string | null;
  url?: string | null;
  total_hours?: number | null;
  status?: CourseStatus;
  notes?: string | null;
  related_skill_id?: string | null;
}

export async function createCourse(
  input: CreateCourseInput,
  userId: string = TEST_USER_ID
): Promise<Course> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('courses')
    .insert({
      ...input,
      user_id: userId,
      status: input.status || 'planned',
      progress: 0,
      completed_hours: 0,
      xp_gained: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    throw error;
  }

  return data;
}

export async function updateCourse(
  courseId: string,
  input: Partial<CreateCourseInput & {
    progress?: number;
    completed_hours?: number;
    started_at?: string | null;
    finished_at?: string | null;
    certificate_url?: string | null;
  }>
): Promise<Course> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('courses')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating course:', error);
    throw error;
  }

  return data;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
}

export async function updateCourseProgress(
  courseId: string,
  progress: number,
  completedHours?: number
): Promise<Course> {
  const course = await getCourse(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const updates: Partial<Course> = {
    progress: Math.min(100, Math.max(0, progress)),
  };

  if (completedHours !== undefined) {
    updates.completed_hours = completedHours;
  }

  // If just started, set started_at
  if (course.status === 'planned' && progress > 0) {
    updates.status = 'in_progress';
    updates.started_at = new Date().toISOString();
  }

  // If completed (100%)
  if (progress >= 100 && course.status !== 'completed') {
    updates.status = 'completed';
    updates.finished_at = new Date().toISOString();
    const xpGained = calculateCourseXp(course.total_hours);
    updates.xp_gained = xpGained;

    // ============================================
    // XP INTEGRATION FOR COURSE COMPLETION
    // ============================================

    // Award XP to Weisheit faction
    if (xpGained > 0) {
      try {
        await updateFactionStats('weisheit', xpGained, TEST_USER_ID);
      } catch (err) {
        console.error('Error updating faction stats for course completion:', err);
      }
    }

    // Log activity to feed
    try {
      await logActivity({
        userId: TEST_USER_ID,
        activityType: 'course_completed',
        factionId: 'weisheit',
        title: `Kurs abgeschlossen: "${course.title}"`,
        description: course.platform ? `auf ${course.platform}` : undefined,
        xpAmount: xpGained,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
        metadata: {
          total_hours: course.total_hours,
          platform: course.platform,
        },
      });
    } catch (err) {
      console.error('Error logging course completion activity:', err);
    }
  }

  return updateCourse(courseId, updates);
}

// Calculate XP based on course duration
function calculateCourseXp(totalHours: number | null): number {
  if (!totalHours) return 75; // Base XP for unknown duration
  if (totalHours < 5) return 50;
  if (totalHours < 20) return 100;
  if (totalHours < 50) return 150;
  return 200; // Courses 50+ hours
}

// ============================================
// WEISHEIT STATS
// ============================================

export interface WeisheitStats {
  // Books
  totalBooks: number;
  booksToRead: number;
  booksReading: number;
  booksRead: number;
  totalPagesRead: number;

  // Courses
  totalCourses: number;
  coursesPlanned: number;
  coursesInProgress: number;
  coursesCompleted: number;
  totalCourseHours: number;

  // Combined
  totalXpGained: number;
  currentlyReading: Book | null;
  currentCourse: Course | null;
}

export async function getWeisheitStats(
  userId: string = TEST_USER_ID
): Promise<WeisheitStats> {
  const [books, courses] = await Promise.all([
    getBooks(userId),
    getCourses(userId),
  ]);

  // Book stats
  const booksToRead = books.filter(b => b.status === 'to_read').length;
  const booksReading = books.filter(b => b.status === 'reading').length;
  const booksRead = books.filter(b => b.status === 'read').length;

  const totalPagesRead = books
    .filter(b => b.status === 'read')
    .reduce((sum, b) => sum + (b.pages || 0), 0);

  const currentlyReading = books.find(b => b.status === 'reading') || null;

  // Course stats
  const coursesPlanned = courses.filter(c => c.status === 'planned').length;
  const coursesInProgress = courses.filter(c => c.status === 'in_progress').length;
  const coursesCompleted = courses.filter(c => c.status === 'completed').length;

  const totalCourseHours = courses
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + (c.total_hours || 0), 0);

  const currentCourse = courses.find(c => c.status === 'in_progress') || null;

  // Total XP
  const bookXp = books.reduce((sum, b) => sum + b.xp_gained, 0);
  const courseXp = courses.reduce((sum, c) => sum + c.xp_gained, 0);

  return {
    totalBooks: books.length,
    booksToRead,
    booksReading,
    booksRead,
    totalPagesRead,
    totalCourses: courses.length,
    coursesPlanned,
    coursesInProgress,
    coursesCompleted,
    totalCourseHours,
    totalXpGained: bookXp + courseXp,
    currentlyReading,
    currentCourse,
  };
}
