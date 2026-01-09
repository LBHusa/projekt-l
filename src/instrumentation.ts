// ============================================
// Projekt L - Server Instrumentation
// Runs ONCE when Next.js server starts
// ============================================

export async function register() {
  // Only run on Node.js server, not in Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initReminderScheduler } = await import('./lib/cron/reminder-scheduler');

    console.log('[Instrumentation] Server starting...');
    console.log('[Instrumentation] Initializing reminder scheduler...');

    initReminderScheduler();

    console.log('[Instrumentation] Server ready ✅');
  }
}
