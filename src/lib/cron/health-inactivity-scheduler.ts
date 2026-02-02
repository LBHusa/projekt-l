// ============================================
// Projekt L - Health Inactivity Scheduler
// Applies HP damage to users inactive for 3+ days
// Runs daily at 3:00 AM
// ============================================

import cron from 'node-cron';

// Base URL for internal API calls
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Call the inactivity check API endpoint
 */
async function runInactivityCheck(): Promise<void> {
  console.log('[Health Inactivity] Running scheduled inactivity check...');

  try {
    const response = await fetch(`${BASE_URL}/api/health/inactivity-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[Health Inactivity] Check complete:', result);
    } else {
      console.error('[Health Inactivity] Check failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[Health Inactivity] Error calling API:', error);
  }
}

/**
 * Initialize the health inactivity scheduler
 * Runs daily at 3:00 AM server time
 */
export function initHealthInactivityScheduler(): void {
  // Schedule: At 3:00 AM every day
  // Cron expression: minute hour day-of-month month day-of-week
  cron.schedule('0 3 * * *', () => {
    runInactivityCheck();
  });

  console.log('[Health Inactivity] Scheduler initialized - Running daily at 3:00 AM');
}
