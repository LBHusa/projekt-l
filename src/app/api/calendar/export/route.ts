// ============================================
// Projekt L - Calendar Export API
// GET /api/calendar/export
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateIcsCalendar, getIcsFilename, type IcsExportOptions } from '@/lib/export/ics-generator';
import type { Contact, RelationshipCategory } from '@/lib/types/contacts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Query Parameter parsen
    const type = (searchParams.get('type') || 'all') as IcsExportOptions['type'];
    const category = searchParams.get('category') as RelationshipCategory | null;
    const favoriteOnly = searchParams.get('favorite') === 'true';

    // Kontakte abrufen
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    // Filter anwenden
    if (category) {
      query = query.eq('relationship_category', category);
    }

    if (favoriteOnly) {
      query = query.eq('is_favorite', true);
    }

    // Nur Kontakte mit relevanten Daten
    if (type === 'birthdays') {
      query = query.not('birthday', 'is', null);
    } else if (type === 'anniversaries') {
      query = query.not('anniversary', 'is', null);
    } else {
      // 'all' - Kontakte die mindestens ein Datum haben
      query = query.or('birthday.not.is.null,anniversary.not.is.null');
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts for calendar export:', error);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Kontakte' },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Keine Kontakte mit Datumsinformationen gefunden' },
        { status: 404 }
      );
    }

    // ICS generieren
    const icsContent = generateIcsCalendar(contacts as Contact[], {
      type,
      includeDescription: true,
    });

    const filename = getIcsFilename(type);

    // Als Datei-Download zurückgeben
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Kalender-Export' },
      { status: 500 }
    );
  }
}
