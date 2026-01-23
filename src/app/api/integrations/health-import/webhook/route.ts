// ============================================
// HEALTH IMPORT WEBHOOK ENDPOINT
// Apple Health Data Import via API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  importHealthData,
  validateApiKey,
  type HealthImportData,
} from '@/lib/data/health-import';

// Rate limiting tracking (simple in-memory implementation)
// For production, consider using Redis or Upstash
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

/**
 * Check rate limit for a given key (API key)
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    // First request or window expired
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * POST /api/integrations/health-import/webhook
 *
 * Main webhook endpoint for Apple Health data import
 *
 * Request Headers:
 * - Authorization: Bearer <API_KEY>
 *
 * Request Body:
 * {
 *   workouts?: HealthWorkout[],
 *   bodyMetrics?: HealthBodyMetric[],
 *   steps?: HealthSteps[],
 *   sleep?: HealthSleep[]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   imported: { workouts: 5, bodyMetrics: 2, steps: 7, sleep: 3 },
 *   skipped: { workouts: 1, bodyMetrics: 0, steps: 0, sleep: 0 },
 *   totalXP: 125,
 *   errors: []
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ============================================
    // 1. AUTHENTICATION - Bearer Token
    // ============================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // Validate API key and get user ID
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // ============================================
    // 2. RATE LIMITING - 10 req/min
    // ============================================
    if (!checkRateLimit(apiKey)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Maximum 10 requests per minute allowed',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ============================================
    // 3. REQUEST VALIDATION
    // ============================================
    let data: HealthImportData;
    try {
      data = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate that at least one data type is provided
    if (
      !data.workouts &&
      !data.bodyMetrics &&
      !data.steps &&
      !data.sleep
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'At least one data type (workouts, bodyMetrics, steps, sleep) must be provided',
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (data.workouts && !Array.isArray(data.workouts)) {
      return NextResponse.json(
        { error: 'workouts must be an array' },
        { status: 400 }
      );
    }
    if (data.bodyMetrics && !Array.isArray(data.bodyMetrics)) {
      return NextResponse.json(
        { error: 'bodyMetrics must be an array' },
        { status: 400 }
      );
    }
    if (data.steps && !Array.isArray(data.steps)) {
      return NextResponse.json(
        { error: 'steps must be an array' },
        { status: 400 }
      );
    }
    if (data.sleep && !Array.isArray(data.sleep)) {
      return NextResponse.json(
        { error: 'sleep must be an array' },
        { status: 400 }
      );
    }

    // ============================================
    // 4. IMPORT DATA
    // ============================================
    const result = await importHealthData(userId, data);

    // ============================================
    // 5. RESPONSE
    // ============================================
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'X-Total-XP': result.totalXP.toString(),
        'X-Imported-Count': (
          result.imported.workouts +
          result.imported.bodyMetrics +
          result.imported.steps +
          result.imported.sleep
        ).toString(),
      },
    });
  } catch (error) {
    console.error('[Health Import Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/health-import/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'health-import-webhook',
    version: '1.0.0',
    rateLimit: {
      requests: RATE_LIMIT,
      window: '1 minute',
    },
  });
}
