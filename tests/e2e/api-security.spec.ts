import { test, expect } from '@playwright/test';

/**
 * API Security Tests - Phase 2
 *
 * Validates:
 * - SEC-04: Unauthenticated users redirected to login
 * - SEC-08: API routes return 401 without valid session
 * - SEC-09: Health Import webhook validates API key
 * - SEC-10: Error responses don't leak sensitive data
 */

test.describe('API Security - Authentication (SEC-04, SEC-08)', () => {

  test('Unauthenticated API requests return 401', async ({ request }) => {
    // Test multiple protected endpoints without auth
    const protectedEndpoints = [
      { method: 'GET', url: '/api/quests' },
      { method: 'GET', url: '/api/habits/list' },
      { method: 'GET', url: '/api/skills' },
      { method: 'GET', url: '/api/user/profile' },
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.fetch(endpoint.url, {
        method: endpoint.method,
      });

      expect(response.status(), `${endpoint.method} ${endpoint.url}`).toBe(401);

      const body = await response.json();
      expect(body.error).toContain('Unauthorized');
    }
  });

  test('Reminder log-action requires authentication', async ({ request }) => {
    const response = await request.post('/api/reminders/log-action', {
      data: { reminderId: 'test', action: 'test' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('Google Calendar auth requires authentication', async ({ request }) => {
    const response = await request.get('/api/integrations/google-calendar/auth');
    expect(response.status()).toBe(401);
  });

  test('Telegram send requires API key', async ({ request }) => {
    const response = await request.post('/api/integrations/telegram/send', {
      data: { userId: 'test', message: 'test' },
    });

    // Should be 401 (no API key) or 503 (not configured)
    expect([401, 503]).toContain(response.status());
  });

  test('Protected pages redirect to login when unauthenticated', async ({ page, context }) => {
    // Clear any existing auth state
    await context.clearCookies();

    const protectedPages = [
      '/quests',
      '/habits',
      '/profile',
      '/soziales',
      '/karriere',
    ];

    for (const pagePath of protectedPages) {
      await page.goto(pagePath);
      // Should redirect to login
      await page.waitForURL(/\/auth\/login|\/login/, { timeout: 5000 });
    }
  });

});

test.describe('API Security - Error Sanitization (SEC-10)', () => {

  test('Error responses do not contain stack traces', async ({ request }) => {
    // Send request without auth to trigger error
    const response = await request.post('/api/habits/create', {
      data: { invalid_field: 'should cause error' },
    });

    const body = await response.json();
    const bodyStr = JSON.stringify(body);

    // Error response should not contain:
    expect(bodyStr).not.toContain('at ');  // Stack trace pattern
    expect(bodyStr).not.toContain('.ts:');  // File paths
    expect(bodyStr).not.toContain('node_modules');
    expect(bodyStr).not.toContain('POSTGRES');
    expect(bodyStr).not.toContain('duplicate key');
    expect(bodyStr).not.toContain('constraint');
  });

  test('401 errors use generic unauthorized message', async ({ request }) => {
    const endpoints = [
      '/api/quests',
      '/api/habits/list',
      '/api/skills',
      '/api/geist/mood',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);

      expect(response.status()).toBe(401);

      const body = await response.json();
      // Should have simple error message, not expose internals
      expect(body.error).toMatch(/Unauthorized|please login/i);
      expect(JSON.stringify(body)).not.toMatch(/Error:|at .*:\d+/);
    }
  });

  test('Error messages do not contain database details', async ({ request }) => {
    // Try to trigger database errors
    const response = await request.post('/api/skills/xp', {
      data: {
        skillId: 'invalid-uuid-format',
        xp: 10
      },
    });

    const body = await response.json();
    const bodyStr = JSON.stringify(body);

    // Should not leak database internals
    expect(bodyStr).not.toContain('PostgreSQL');
    expect(bodyStr).not.toContain('supabase');
    expect(bodyStr).not.toContain('column');
    expect(bodyStr).not.toContain('table');
    expect(bodyStr).not.toContain('relation');
  });

});

test.describe('API Security - Webhook Auth (SEC-09)', () => {

  test('Health Import webhook rejects missing authorization', async ({ request }) => {
    const response = await request.post('/api/integrations/health-import/webhook', {
      data: {
        workouts: [],
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toMatch(/Authorization|auth/i);
  });

  test('Health Import webhook rejects invalid API key', async ({ request }) => {
    const response = await request.post('/api/integrations/health-import/webhook', {
      headers: {
        'Authorization': 'Bearer invalid_api_key_12345',
      },
      data: {
        workouts: [],
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toMatch(/Invalid|Unauthorized/i);
  });

  test('Health Import webhook health check is public', async ({ request }) => {
    const response = await request.get('/api/integrations/health-import/webhook');

    // Health check should be accessible
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

});

test.describe('API Security - User ID Spoofing Prevention', () => {

  test('Cannot bypass auth by spoofing user ID in request body', async ({ request }) => {
    const response = await request.post('/api/habits/create', {
      data: {
        name: 'Malicious Habit',
        user_id: '00000000-0000-0000-0000-000000000001',
      },
    });

    // Should be rejected - 401 no auth
    expect(response.status()).toBe(401);
  });

  test('Cannot access other user data via query params', async ({ request }) => {
    // Try to access data with spoofed user ID in query
    const response = await request.get('/api/quests?user_id=00000000-0000-0000-0000-000000000001');

    // Should still require auth
    expect(response.status()).toBe(401);
  });

});
