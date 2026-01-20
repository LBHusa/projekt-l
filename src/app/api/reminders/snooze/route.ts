import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authentifizierung prüfen
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { reminderId, snoozeMinutes = 60 } = await request.json();

    if (!reminderId) {
      return NextResponse.json(
        { error: 'reminderId ist erforderlich' },
        { status: 400 }
      );
    }

    // Berechne snoozed_until Zeitpunkt
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    // Update reminder mit snoozed_until
    const { error: updateError } = await supabase
      .from('habit_reminders')
      .update({ snoozed_until: snoozedUntil.toISOString() })
      .eq('id', reminderId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error snoozing reminder:', updateError);
      return NextResponse.json(
        { error: 'Snooze fehlgeschlagen' },
        { status: 500 }
      );
    }

    // Log the snooze action
    await supabase.from('reminder_delivery_log').insert({
      reminder_id: reminderId,
      user_id: user.id,
      scheduled_time: new Date().toISOString(),
      action_taken: 'snoozed',
      delivered: true,
    });

    return NextResponse.json({
      success: true,
      snoozedUntil: snoozedUntil.toISOString(),
      message: `Reminder für ${snoozeMinutes} Minuten pausiert`
    });
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    return NextResponse.json(
      { error: 'Failed to snooze reminder' },
      { status: 500 }
    );
  }
}
