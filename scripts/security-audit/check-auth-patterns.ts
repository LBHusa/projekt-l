/**
 * Security Audit: Check Auth Patterns
 *
 * Verifies that all API routes properly authenticate users
 * by checking for auth.getUser() calls.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  file: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

// API routes that don't require authentication
const PUBLIC_ROUTES = [
  'api/auth/', // Auth routes handle their own auth
  'api/integrations/telegram/webhook', // Webhook callback
  'api/integrations/health-import/webhook', // Webhook callback
  'api/integrations/google-calendar/callback', // OAuth callback
  'api/books/lookup', // Public book lookup (OpenLibrary API)
];

// Patterns that indicate authentication
const AUTH_PATTERNS = [
  /auth\.getUser\(\)/,
  /getUser\(\)/,
  /supabase\.auth\.getUser\(\)/,
  /createServerClient.*auth/,
  /x-internal-api-key/i, // Internal API key authentication
  /INTERNAL_API_KEY/, // Internal API key check
];

function isPublicRoute(filePath: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    filePath.includes(route.replace(/\//g, path.sep))
  );
}

function checkFileForAuth(filePath: string): CheckResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip public routes
  if (isPublicRoute(filePath)) {
    return {
      file: relativePath,
      status: 'pass',
      message: 'Public route (auth not required)',
    };
  }

  // Check for auth patterns
  const hasAuth = AUTH_PATTERNS.some((pattern) => pattern.test(content));

  if (hasAuth) {
    return {
      file: relativePath,
      status: 'pass',
      message: 'Auth check found',
    };
  }

  // Check if it's a test/mock route
  if (filePath.includes('/test/') || content.includes('// TEST ONLY')) {
    return {
      file: relativePath,
      status: 'warn',
      message: 'Test route - verify it is not exposed in production',
    };
  }

  return {
    file: relativePath,
    status: 'fail',
    message: 'No auth.getUser() or similar auth check found',
  };
}

function findApiRoutes(dir: string): string[] {
  const routes: string[] = [];

  function walk(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name === 'route.ts') {
        routes.push(fullPath);
      }
    }
  }

  walk(dir);
  return routes;
}

export function checkAuthPatterns(): { results: CheckResult[]; passed: boolean } {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

  if (!fs.existsSync(apiDir)) {
    console.error('API directory not found:', apiDir);
    return { results: [], passed: false };
  }

  const routes = findApiRoutes(apiDir);
  const results = routes.map(checkFileForAuth);

  const failures = results.filter((r) => r.status === 'fail');
  const warnings = results.filter((r) => r.status === 'warn');
  const passes = results.filter((r) => r.status === 'pass');

  console.log('\n=== Auth Pattern Check ===\n');
  console.log(`Total routes: ${results.length}`);
  console.log(`Passed: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    failures.forEach((r) => console.log(`  [FAIL] ${r.file}: ${r.message}`));
  }

  if (warnings.length > 0) {
    console.log('\n--- WARNINGS ---');
    warnings.forEach((r) => console.log(`  [WARN] ${r.file}: ${r.message}`));
  }

  return { results, passed: failures.length === 0 };
}

// Run if executed directly
if (require.main === module) {
  const { passed } = checkAuthPatterns();
  process.exit(passed ? 0 : 1);
}
