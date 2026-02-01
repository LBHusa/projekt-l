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

    console.log('[Instrumentation] Server starting...');

    // Initialize cron schedulers
    console.log('[Instrumentation] Initializing reminder scheduler...');
    initReminderScheduler();

    console.log('[Instrumentation] Initializing quest expiry scheduler...');
    initQuestExpiryScheduler();

    console.log('[Instrumentation] Initializing proactive reminder scheduler...');
    initProactiveScheduler();

    console.log('[Instrumentation] Server ready (3 schedulers active)');
  }
}
