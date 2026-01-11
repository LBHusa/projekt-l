/**
 * API Route: Generate Health Import API Key
 * POST /api/integrations/health-import/generate-key
 *
 * Generiert einen neuen API-Schlüssel für Apple Health Import.
 * Der Key wird nur EINMALIG zurückgegeben und muss vom User gespeichert werden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/data/api-keys';

export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generiere neuen API Key
    const result = await generateApiKey(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate API key' },
        { status: 500 }
      );
    }

    // Erfolgreiche Response mit ungehashtem Key
    return NextResponse.json({
      success: true,
      api_key: result.key,
      key_id: result.key_id,
      warning: 'This key will only be shown once. Please save it securely.',
    });

  } catch (error) {
    console.error('Error in generate-key route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
