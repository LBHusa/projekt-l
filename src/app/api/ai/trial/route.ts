/**
 * AI Trial Status API Endpoint
 * GET /api/ai/trial - Returns current trial status for authenticated user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrialStatus } from '@/lib/ai/trial';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get trial status
    const trialStatus = await getTrialStatus(user.id);

    return NextResponse.json({
      success: true,
      ...trialStatus,
      // Convert dates to ISO strings for JSON
      trialEndsAt: trialStatus.trialEndsAt?.toISOString() || null,
      trialStartedAt: trialStatus.trialStartedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[Trial API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial status' },
      { status: 500 }
    );
  }
}
