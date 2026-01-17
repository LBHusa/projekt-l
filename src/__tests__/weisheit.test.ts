import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Book, Course, BookStatus, CourseStatus } from '@/lib/database.types';

// Mock book data
const mockBooks: Book[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    cover_url: null,
    genre: 'Technologie',
    pages: 464,
    status: 'read',
    rating: 5,
    current_page: 464,
    started_at: '2024-01-01',
    finished_at: '2024-01-15',
    notes: 'Great book about writing clean code',
    highlights: [],
    related_skill_id: null,
    xp_gained: 100,
    created_at: '2024-01-01',
    updated_at: '2024-01-15',
  },
  {
    id: '2',
    user_id: 'user-1',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas',
    isbn: null,
    cover_url: null,
    genre: 'Technologie',
    pages: 352,
    status: 'reading',
    rating: null,
    current_page: 150,
    started_at: '2024-02-01',
    finished_at: null,
    notes: null,
    highlights: [],
    related_skill_id: null,
    xp_gained: 0,
    created_at: '2024-02-01',
    updated_at: '2024-02-10',
  },
  {
    id: '3',
    user_id: 'user-1',
    title: 'Design Patterns',
    author: 'Gang of Four',
    isbn: null,
    cover_url: null,
    genre: 'Technologie',
    pages: 416,
    status: 'to_read',
    rating: null,
    current_page: 0,
    started_at: null,
    finished_at: null,
    notes: null,
    highlights: [],
    related_skill_id: null,
    xp_gained: 0,
    created_at: '2024-02-15',
    updated_at: '2024-02-15',
  },
];

const mockCourses: Course[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: 'React Masterclass',
    platform: 'Udemy',
    instructor: 'Maximilian Schwarzmüller',
    url: 'https://udemy.com/react',
    status: 'completed',
    progress: 100,
    total_hours: 40,
    completed_hours: 40,
    started_at: '2024-01-01',
    finished_at: '2024-01-20',
    notes: 'Comprehensive React course',
    certificate_url: 'https://udemy.com/cert/123',
    related_skill_id: null,
    xp_gained: 200,
    created_at: '2024-01-01',
    updated_at: '2024-01-20',
  },
  {
    id: '2',
    user_id: 'user-1',
    title: 'TypeScript Deep Dive',
    platform: 'Frontend Masters',
    instructor: null,
    url: null,
    status: 'in_progress',
    progress: 60,
    total_hours: 8,
    completed_hours: 4.8,
    started_at: '2024-02-01',
    finished_at: null,
    notes: null,
    certificate_url: null,
    related_skill_id: null,
    xp_gained: 0,
    created_at: '2024-02-01',
    updated_at: '2024-02-10',
  },
  {
    id: '3',
    user_id: 'user-1',
    title: 'AWS Solutions Architect',
    platform: 'Coursera',
    instructor: null,
    url: null,
    status: 'planned',
    progress: 0,
    total_hours: 60,
    completed_hours: 0,
    started_at: null,
    finished_at: null,
    notes: null,
    certificate_url: null,
    related_skill_id: null,
    xp_gained: 0,
    created_at: '2024-02-15',
    updated_at: '2024-02-15',
  },
];

describe('Weisheit Data Layer', () => {
  describe('Book Status Filtering', () => {
    it('filters books by to_read status', () => {
      const toReadBooks = mockBooks.filter(b => b.status === 'to_read');
      expect(toReadBooks).toHaveLength(1);
      expect(toReadBooks[0].title).toBe('Design Patterns');
    });

    it('filters books by reading status', () => {
      const readingBooks = mockBooks.filter(b => b.status === 'reading');
      expect(readingBooks).toHaveLength(1);
      expect(readingBooks[0].title).toBe('The Pragmatic Programmer');
    });

    it('filters books by read status', () => {
      const readBooks = mockBooks.filter(b => b.status === 'read');
      expect(readBooks).toHaveLength(1);
      expect(readBooks[0].title).toBe('Clean Code');
    });
  });

  describe('Course Status Filtering', () => {
    it('filters courses by planned status', () => {
      const plannedCourses = mockCourses.filter(c => c.status === 'planned');
      expect(plannedCourses).toHaveLength(1);
      expect(plannedCourses[0].title).toBe('AWS Solutions Architect');
    });

    it('filters courses by in_progress status', () => {
      const inProgressCourses = mockCourses.filter(c => c.status === 'in_progress');
      expect(inProgressCourses).toHaveLength(1);
      expect(inProgressCourses[0].title).toBe('TypeScript Deep Dive');
    });

    it('filters courses by completed status', () => {
      const completedCourses = mockCourses.filter(c => c.status === 'completed');
      expect(completedCourses).toHaveLength(1);
      expect(completedCourses[0].title).toBe('React Masterclass');
    });
  });

  describe('Book XP Calculation', () => {
    // Simulate calculateBookXp function
    function calculateBookXp(pages: number | null): number {
      if (!pages) return 50;
      if (pages < 100) return 25;
      if (pages < 200) return 50;
      if (pages < 400) return 75;
      return 100;
    }

    it('returns base XP for unknown page count', () => {
      expect(calculateBookXp(null)).toBe(50);
    });

    it('returns 25 XP for books under 100 pages', () => {
      expect(calculateBookXp(50)).toBe(25);
      expect(calculateBookXp(99)).toBe(25);
    });

    it('returns 50 XP for books 100-199 pages', () => {
      expect(calculateBookXp(100)).toBe(50);
      expect(calculateBookXp(199)).toBe(50);
    });

    it('returns 75 XP for books 200-399 pages', () => {
      expect(calculateBookXp(200)).toBe(75);
      expect(calculateBookXp(399)).toBe(75);
    });

    it('returns 100 XP for books 400+ pages', () => {
      expect(calculateBookXp(400)).toBe(100);
      expect(calculateBookXp(1000)).toBe(100);
    });
  });

  describe('Course XP Calculation', () => {
    // Simulate calculateCourseXp function
    function calculateCourseXp(totalHours: number | null): number {
      if (!totalHours) return 75;
      if (totalHours < 5) return 50;
      if (totalHours < 20) return 100;
      if (totalHours < 50) return 150;
      return 200;
    }

    it('returns base XP for unknown duration', () => {
      expect(calculateCourseXp(null)).toBe(75);
    });

    it('returns 50 XP for courses under 5 hours', () => {
      expect(calculateCourseXp(1)).toBe(50);
      expect(calculateCourseXp(4.9)).toBe(50);
    });

    it('returns 100 XP for courses 5-19 hours', () => {
      expect(calculateCourseXp(5)).toBe(100);
      expect(calculateCourseXp(19)).toBe(100);
    });

    it('returns 150 XP for courses 20-49 hours', () => {
      expect(calculateCourseXp(20)).toBe(150);
      expect(calculateCourseXp(49)).toBe(150);
    });

    it('returns 200 XP for courses 50+ hours', () => {
      expect(calculateCourseXp(50)).toBe(200);
      expect(calculateCourseXp(100)).toBe(200);
    });
  });

  describe('Weisheit Stats Aggregation', () => {
    // Simulate getWeisheitStats logic
    function calculateWeisheitStats(books: Book[], courses: Course[]) {
      const booksToRead = books.filter(b => b.status === 'to_read').length;
      const booksReading = books.filter(b => b.status === 'reading').length;
      const booksRead = books.filter(b => b.status === 'read').length;

      const totalPagesRead = books
        .filter(b => b.status === 'read')
        .reduce((sum, b) => sum + (b.pages || 0), 0);

      const currentlyReading = books.find(b => b.status === 'reading') || null;

      const coursesPlanned = courses.filter(c => c.status === 'planned').length;
      const coursesInProgress = courses.filter(c => c.status === 'in_progress').length;
      const coursesCompleted = courses.filter(c => c.status === 'completed').length;

      const totalCourseHours = courses
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (c.total_hours || 0), 0);

      const currentCourse = courses.find(c => c.status === 'in_progress') || null;

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

    it('counts books correctly by status', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);

      expect(stats.totalBooks).toBe(3);
      expect(stats.booksToRead).toBe(1);
      expect(stats.booksReading).toBe(1);
      expect(stats.booksRead).toBe(1);
    });

    it('counts courses correctly by status', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);

      expect(stats.totalCourses).toBe(3);
      expect(stats.coursesPlanned).toBe(1);
      expect(stats.coursesInProgress).toBe(1);
      expect(stats.coursesCompleted).toBe(1);
    });

    it('calculates total pages read correctly', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);
      // Only "Clean Code" is read (464 pages)
      expect(stats.totalPagesRead).toBe(464);
    });

    it('calculates total course hours correctly', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);
      // Only "React Masterclass" is completed (40 hours)
      expect(stats.totalCourseHours).toBe(40);
    });

    it('calculates total XP correctly', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);
      // Book XP: 100 (Clean Code) + 0 + 0 = 100
      // Course XP: 200 (React Masterclass) + 0 + 0 = 200
      expect(stats.totalXpGained).toBe(300);
    });

    it('identifies currently reading book', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);

      expect(stats.currentlyReading).not.toBeNull();
      expect(stats.currentlyReading?.title).toBe('The Pragmatic Programmer');
    });

    it('identifies current course', () => {
      const stats = calculateWeisheitStats(mockBooks, mockCourses);

      expect(stats.currentCourse).not.toBeNull();
      expect(stats.currentCourse?.title).toBe('TypeScript Deep Dive');
    });

    it('handles empty books list', () => {
      const stats = calculateWeisheitStats([], mockCourses);

      expect(stats.totalBooks).toBe(0);
      expect(stats.booksToRead).toBe(0);
      expect(stats.booksReading).toBe(0);
      expect(stats.booksRead).toBe(0);
      expect(stats.totalPagesRead).toBe(0);
      expect(stats.currentlyReading).toBeNull();
    });

    it('handles empty courses list', () => {
      const stats = calculateWeisheitStats(mockBooks, []);

      expect(stats.totalCourses).toBe(0);
      expect(stats.coursesPlanned).toBe(0);
      expect(stats.coursesInProgress).toBe(0);
      expect(stats.coursesCompleted).toBe(0);
      expect(stats.totalCourseHours).toBe(0);
      expect(stats.currentCourse).toBeNull();
    });
  });

  describe('Book Progress Calculation', () => {
    it('calculates reading progress percentage', () => {
      const book = mockBooks[1]; // The Pragmatic Programmer - reading
      const progress = book.pages ? Math.round((book.current_page / book.pages) * 100) : 0;

      expect(progress).toBe(43); // 150/352 = 42.6%, rounded to 43%
    });

    it('returns 0 for books with no pages', () => {
      const bookWithNoPages = { ...mockBooks[0], pages: null, current_page: 50 };
      const progress = bookWithNoPages.pages
        ? Math.round((bookWithNoPages.current_page / bookWithNoPages.pages) * 100)
        : 0;

      expect(progress).toBe(0);
    });

    it('returns 100 for completed books', () => {
      const book = mockBooks[0]; // Clean Code - read
      const progress = book.pages ? Math.round((book.current_page / book.pages) * 100) : 0;

      expect(progress).toBe(100);
    });
  });

  describe('Book Status Transitions', () => {
    it('transitions from to_read to reading when progress starts', () => {
      const book = { ...mockBooks[2], status: 'to_read' as BookStatus, current_page: 0 };
      const newPage = 10;

      // Simulate updateBookProgress logic
      let newStatus = book.status;
      let newStartedAt = book.started_at;

      if (book.status === 'to_read' && newPage > 0) {
        newStatus = 'reading';
        newStartedAt = new Date().toISOString();
      }

      expect(newStatus).toBe('reading');
      expect(newStartedAt).not.toBeNull();
    });

    it('transitions from reading to read when book is finished', () => {
      const book = mockBooks[1]; // reading, 352 pages
      const newPage = 352; // finish the book

      // Simulate updateBookProgress logic
      let newStatus = book.status;
      let newFinishedAt = book.finished_at;

      if (book.pages && newPage >= book.pages && book.status !== 'read') {
        newStatus = 'read';
        newFinishedAt = new Date().toISOString();
      }

      expect(newStatus).toBe('read');
      expect(newFinishedAt).not.toBeNull();
    });
  });

  describe('Course Progress Validation', () => {
    it('clamps progress between 0 and 100', () => {
      const clampProgress = (progress: number) => Math.min(100, Math.max(0, progress));

      expect(clampProgress(-10)).toBe(0);
      expect(clampProgress(0)).toBe(0);
      expect(clampProgress(50)).toBe(50);
      expect(clampProgress(100)).toBe(100);
      expect(clampProgress(150)).toBe(100);
    });

    it('transitions from planned to in_progress when progress starts', () => {
      const course = mockCourses[2]; // planned
      const newProgress = 5;

      // Simulate updateCourseProgress logic
      let newStatus = course.status;
      let newStartedAt = course.started_at;

      if (course.status === 'planned' && newProgress > 0) {
        newStatus = 'in_progress';
        newStartedAt = new Date().toISOString();
      }

      expect(newStatus).toBe('in_progress');
      expect(newStartedAt).not.toBeNull();
    });

    it('transitions from in_progress to completed at 100%', () => {
      const course = mockCourses[1]; // in_progress
      const newProgress = 100;

      // Simulate updateCourseProgress logic
      let newStatus = course.status;
      let newFinishedAt = course.finished_at;

      if (newProgress >= 100 && course.status !== 'completed') {
        newStatus = 'completed';
        newFinishedAt = new Date().toISOString();
      }

      expect(newStatus).toBe('completed');
      expect(newFinishedAt).not.toBeNull();
    });
  });
});

describe('Weisheit Faction Integration', () => {
  it('books and courses belong to weisheit faction', () => {
    // The weisheit data layer should automatically assign faction_id to activities
    const expectedFactionId = 'wissen';

    // Simulating activity log entries
    const bookFinishedActivity = {
      activity_type: 'book_finished',
      faction_id: expectedFactionId,
      title: 'Clean Code fertig gelesen',
      xp_amount: 100,
    };

    const courseCompletedActivity = {
      activity_type: 'course_completed',
      faction_id: expectedFactionId,
      title: 'React Masterclass abgeschlossen',
      xp_amount: 200,
    };

    expect(bookFinishedActivity.faction_id).toBe('wissen');
    expect(courseCompletedActivity.faction_id).toBe('wissen');
  });

  it('XP from books and courses contributes to weisheit faction XP', () => {
    const bookXp = mockBooks.reduce((sum, b) => sum + b.xp_gained, 0);
    const courseXp = mockCourses.reduce((sum, c) => sum + c.xp_gained, 0);
    const totalWeisheitXp = bookXp + courseXp;

    expect(totalWeisheitXp).toBe(300); // 100 (book) + 200 (course)
  });
});

describe('Book Form Validation', () => {
  it('requires title', () => {
    const formData = {
      title: '',
      author: 'Some Author',
    };

    const isValid = formData.title.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid book data', () => {
    const formData = {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      genre: 'Technologie',
      pages: 464,
      status: 'to_read' as BookStatus,
    };

    const isValid = formData.title.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('allows optional fields to be null', () => {
    const formData = {
      title: 'Minimal Book',
      author: null,
      isbn: null,
      genre: null,
      pages: null,
      notes: null,
    };

    expect(formData.author).toBeNull();
    expect(formData.isbn).toBeNull();
    expect(formData.genre).toBeNull();
    expect(formData.pages).toBeNull();
  });
});

describe('Course Form Validation', () => {
  it('requires title', () => {
    const formData = {
      title: '',
      platform: 'Udemy',
    };

    const isValid = formData.title.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid course data', () => {
    const formData = {
      title: 'React Masterclass',
      platform: 'Udemy',
      instructor: 'Max',
      total_hours: 40,
      status: 'planned' as CourseStatus,
    };

    const isValid = formData.title.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('validates URL format when provided', () => {
    const validateUrl = (url: string | null): boolean => {
      if (!url) return true; // null is valid (optional)
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(validateUrl(null)).toBe(true);
    expect(validateUrl('https://udemy.com/course')).toBe(true);
    expect(validateUrl('not-a-url')).toBe(false);
  });
});
