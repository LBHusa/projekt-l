// ============================================
// Weekly Report Scheduler
// Phase 4: Visuelle Belohnungen
// Runs every Sunday at 18:00 to generate AI reports
// ============================================

import cron from 'node-cron';

// Cron schedule: Every Sunday at 18:00 (6 PM)
const REPORT_CRON = '0 18 * * 0';

/**
 * Initialize the weekly report scheduler
 */
export function initWeeklyReportScheduler(): void {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Weekly Reports] Skipping scheduler in development');
    return;
  }

  cron.schedule(REPORT_CRON, async () => {
    console.log('[Weekly Reports] Starting weekly report generation...');

    try {
      // Trigger the API route
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const cronSecret = process.env.CRON_SECRET;

      const response = await fetch(`${baseUrl}/api/cron/weekly-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret || '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log(`[Weekly Reports] Generated ${result.reports_generated} reports`);
    } catch (error) {
      console.error('[Weekly Reports] Scheduler error:', error);
    }
  });

  console.log('[Weekly Reports] Scheduler initialized (Sundays 18:00)');
}
