import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json';

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use json or csv' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch all user data
    const [
      { data: habits },
      { data: habitLogs },
      { data: books },
      { data: courses },
      { data: transactions },
      { data: savingsGoals },
      { data: mentalStatsLogs },
      { data: factionStats },
    ] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('habit_logs').select('*').eq('user_id', userId),
      supabase.from('books').select('*').eq('user_id', userId),
      supabase.from('courses').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('savings_goals').select('*').eq('user_id', userId),
      supabase.from('mental_stats_logs').select('*').eq('user_id', userId),
      supabase.from('user_faction_stats').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      data: {
        habits: habits || [],
        habit_logs: habitLogs || [],
        books: books || [],
        courses: courses || [],
        transactions: transactions || [],
        savings_goals: savingsGoals || [],
        mental_stats_logs: mentalStatsLogs || [],
        user_faction_stats: factionStats || [],
      },
    };

    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="projekt-l-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // CSV format
    const csv = convertToCSV(exportData);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="projekt-l-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function convertToCSV(exportData: { exported_at: string; user_id: string; data: Record<string, unknown[]> }): string {
  let csv = `# Projekt L Data Export\n`;
  csv += `# Exported at: ${exportData.exported_at}\n`;
  csv += `# User ID: ${exportData.user_id}\n\n`;

  // Convert each table to CSV section
  for (const [tableName, records] of Object.entries(exportData.data)) {
    if (!Array.isArray(records) || records.length === 0) continue;

    csv += `\n## ${tableName.toUpperCase()}\n`;

    // Headers
    const headers = Object.keys(records[0] as Record<string, unknown>);
    csv += headers.join(',') + '\n';

    // Rows
    for (const record of records) {
      const row = headers.map(header => {
        const value = (record as Record<string, unknown>)[header];
        if (value === null || value === undefined) return '';
        // Escape commas and quotes
        const strValue = String(value).replace(/"/g, '""');
        return strValue.includes(',') ? `"${strValue}"` : strValue;
      });
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}
