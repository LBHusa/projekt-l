/**
 * Weekly Reports Cron API
 * POST /api/cron/weekly-reports
 *
 * Generates AI-powered weekly reports for all active users
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Service role client for system operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Anthropic client
let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return anthropic;
}

export async function POST(request: Request) {
  try {
    // Verify cron secret (optional but recommended)
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get week boundaries
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get active users with activity this week
    const { data: activeUsers, error: usersError } = await supabase
      .from('faction_xp')
      .select('user_id')
      .gte('updated_at', weekStart.toISOString())
      .order('user_id');

    if (usersError) throw usersError;

    const uniqueUserIds = [...new Set((activeUsers || []).map(u => u.user_id))];
    console.log(`[Weekly Reports] Found ${uniqueUserIds.length} active users`);

    let reportsGenerated = 0;
    let errors = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Check if report already exists for this week
        const { data: existing } = await supabase
          .from('weekly_reports')
          .select('id')
          .eq('user_id', userId)
          .eq('week_start', weekStartStr)
          .single();

        if (existing) {
          console.log(`[Weekly Reports] Skipping ${userId} - report exists`);
          continue;
        }

        // Gather weekly stats
        const stats = await gatherWeeklyStats(userId, weekStart, weekEnd);

        // Skip if minimal activity
        if (stats.quests_completed + stats.habits_tracked < 3) {
          console.log(`[Weekly Reports] Skipping ${userId} - minimal activity`);
          continue;
        }

        // Generate AI report
        const report = await generateAIReport(userId, stats);

        // Save report
        const { error: insertError } = await supabase
          .from('weekly_reports')
          .insert({
            user_id: userId,
            week_start: weekStartStr,
            week_end: weekEndStr,
            top_wins: report.top_wins,
            attention_area: report.attention_area,
            recognized_pattern: report.recognized_pattern,
            recommendation: report.recommendation,
            stats_snapshot: stats,
          });

        if (insertError) throw insertError;

        // Send push notification
        await sendReportNotification(userId, report.top_wins[0]);

        reportsGenerated++;
        console.log(`[Weekly Reports] Generated for ${userId}`);

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Weekly Reports] Error for ${userId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      reports_generated: reportsGenerated,
      errors,
      week: `${weekStartStr} to ${weekEndStr}`,
    });
  } catch (error) {
    console.error('[Weekly Reports] Fatal error:', error);
    return NextResponse.json(
      { error: 'Report generation failed' },
      { status: 500 }
    );
  }
}

/**
 * Gather weekly activity stats for a user
 */
async function gatherWeeklyStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date
) {
  const startStr = weekStart.toISOString();
  const endStr = weekEnd.toISOString();

  // Quests
  const { data: quests } = await supabase
    .from('quests')
    .select('status')
    .eq('user_id', userId)
    .gte('updated_at', startStr)
    .lte('updated_at', endStr);

  // Habits
  const { data: habits } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('logged_at', startStr)
    .lte('logged_at', endStr);

  // Faction XP
  const { data: factionXp } = await supabase
    .from('faction_xp')
    .select('faction_key, xp')
    .eq('user_id', userId);

  // Health events
  const { data: healthEvents } = await supabase
    .from('health_events')
    .select('hp_change, reason')
    .eq('user_id', userId)
    .gte('created_at', startStr)
    .lte('created_at', endStr);

  // Current health
  const { data: health } = await supabase
    .from('user_health')
    .select('current_hp')
    .eq('user_id', userId)
    .single();

  // Currency transactions
  const { data: transactions } = await supabase
    .from('currency_transactions')
    .select('amount, transaction_type')
    .eq('user_id', userId)
    .eq('currency', 'gold')
    .gte('created_at', startStr)
    .lte('created_at', endStr);

  // Mood entries
  const { data: moods } = await supabase
    .from('mood_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startStr)
    .lte('created_at', endStr);

  // Journal entries
  const { data: journals } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startStr)
    .lte('created_at', endStr);

  const factionActivity: Record<string, number> = {};
  (factionXp || []).forEach(f => {
    factionActivity[f.faction_key] = f.xp;
  });

  const goldEarned = (transactions || [])
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const goldSpent = (transactions || [])
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    quests_completed: (quests || []).filter(q => q.status === 'completed').length,
    quests_failed: (quests || []).filter(q => q.status === 'failed').length,
    habits_tracked: (habits || []).length,
    total_xp: Object.values(factionActivity).reduce((a, b) => a + b, 0),
    faction_activity: factionActivity,
    streaks_maintained: 0,
    streaks_broken: 0,
    hp_start: 100,
    hp_end: health?.current_hp || 100,
    gold_earned: goldEarned,
    gold_spent: goldSpent,
    mood_entries: (moods || []).length,
    journal_entries: (journals || []).length,
  };
}

/**
 * Generate AI report using Claude
 */
async function generateAIReport(userId: string, stats: Record<string, unknown>) {
  const client = getAnthropicClient();

  // Get user's memory context if available
  let memoryContext = '';
  try {
    const { data: summary } = await supabase
      .from('user_summaries')
      .select('weekly_summary, preferences, patterns')
      .eq('user_id', userId)
      .single();

    if (summary) {
      memoryContext = `
User Context:
- Recent summary: ${summary.weekly_summary || 'None'}
- Preferences: ${JSON.stringify(summary.preferences || {})}
- Known patterns: ${JSON.stringify(summary.patterns || {})}
`;
    }
  } catch {
    // No summary available
  }

  const prompt = `Du bist der persoenliche Buddy des Users in einer Gamification-App.
Erstelle einen warmherzigen, persoenlichen Wochen-Rueckblick.

${memoryContext}

Diese Woche:
- Quests abgeschlossen: ${stats.quests_completed}
- Quests fehlgeschlagen: ${stats.quests_failed}
- Habits getrackt: ${stats.habits_tracked}
- Gesamt-XP: ${stats.total_xp}
- Factions: ${JSON.stringify(stats.faction_activity)}
- HP am Ende: ${stats.hp_end}
- Gold verdient: ${stats.gold_earned}
- Gold ausgegeben: ${stats.gold_spent}
- Mood-Eintraege: ${stats.mood_entries}
- Journal-Eintraege: ${stats.journal_entries}

Erstelle einen Rueckblick mit:

1. top_wins: Genau 3 konkrete Erfolge (z.B. "7-Tage Meditation Streak erreicht")
   - Sei spezifisch, nicht generisch
   - Wenn wenig Aktivitaet, finde trotzdem positives

2. attention_area: Ein Lebensbereich der vernachlaessigt wurde (1 Satz)
   - Basierend auf Faction-Aktivitaet
   - Freundlich, nicht vorwurfsvoll

3. recognized_pattern: Ein erkanntes Verhaltensmuster (1 Satz)
   - Basierend auf Aktivitaetsmuster
   - Kann positiv oder verbesserungswuerdig sein

4. recommendation: Eine konkrete Empfehlung fuer naechste Woche (1-2 Saetze)
   - Actionable und spezifisch
   - Aufbauend auf erkanntem Pattern

Ton: Warmherzig, ehrlich, ermutigend. Keine leeren Phrasen.
Sprache: Deutsch (informell, "Du"-Anrede)

Antworte NUR mit validem JSON:
{"top_wins": ["...", "...", "..."], "attention_area": "...", "recognized_pattern": "...", "recommendation": "..."}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in AI response');
  }

  try {
    return JSON.parse(textContent.text);
  } catch {
    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Send push notification about new report
 */
async function sendReportNotification(userId: string, firstWin: string) {
  try {
    // Get user's push subscription
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!sub) return;

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: userId,
      notification_type: 'weekly_report',
      title: 'Dein Wochen-Rueckblick ist da!',
      body: `${firstWin}`,
      sent_at: new Date().toISOString(),
    });

    // TODO: Actual push sending via web-push library
    // For now, just logging
    console.log(`[Weekly Reports] Notification logged for ${userId}`);
  } catch (error) {
    console.error(`[Weekly Reports] Notification error for ${userId}:`, error);
  }
}
