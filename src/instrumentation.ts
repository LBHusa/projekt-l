// ============================================
// Projekt L - Server Instrumentation
// Runs ONCE when Next.js server starts
// ============================================

export async function register() {
  // Only run on Node.js server, not in Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initReminderScheduler } = await import('./lib/cron/reminder-scheduler');
    const { initQuestExpiryScheduler } = await import('./lib/cron/quest-expiry-scheduler');
    const { initProactiveScheduler } = await import('./lib/cron/proactive-scheduler');
    const { initHealthInactivityScheduler } = await import('./lib/cron/health-inactivity-scheduler');
    const { initProactiveQuestScheduler } = await import('./lib/cron/proactive-quest-scheduler');
    const { initWeeklySummaryScheduler } = await import('./lib/cron/weekly-summary-scheduler');
    const { initWeeklyReportScheduler } = await import('./lib/cron/weekly-report-scheduler');
    const { ensureCollection } = await import('./lib/ai/memory-rag');

    console.log('[Instrumentation] Server starting...');

    // Ensure Qdrant memory collection exists
    console.log('[Instrumentation] Ensuring Qdrant memory collection...');
    try {
      await ensureCollection();
      console.log('[Instrumentation] Qdrant memory collection ready');
    } catch (error) {
      console.error('[Instrumentation] Warning: Qdrant collection init failed:', error);
      // Don't block startup - memory features will work when Qdrant is available
    }

    // Initialize cron schedulers
    console.log('[Instrumentation] Initializing reminder scheduler...');
    initReminderScheduler();

    console.log('[Instrumentation] Initializing quest expiry scheduler...');
    initQuestExpiryScheduler();

    console.log('[Instrumentation] Initializing proactive reminder scheduler...');
    initProactiveScheduler();

    console.log('[Instrumentation] Initializing health inactivity scheduler...');
    initHealthInactivityScheduler();

    console.log('[Instrumentation] Initializing proactive quest scheduler...');
    initProactiveQuestScheduler();

    console.log('[Instrumentation] Initializing weekly summary scheduler...');
    initWeeklySummaryScheduler();

    console.log('[Instrumentation] Initializing weekly report scheduler...');
    initWeeklyReportScheduler();

    console.log('[Instrumentation] Server ready (7 schedulers active)');
  }
}
