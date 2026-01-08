import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@/lib/supabase';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json';
  const userId = request.nextUrl.searchParams.get('userId') || TEST_USER_ID;

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use json or csv' }, { status: 400 });
  }

  try {
    const supabase = createBrowserClient();

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

function convertToCSV(exportData: any): string {
  let csv = `# Projekt L Data Export\n`;
  csv += `# Exported at: ${exportData.exported_at}\n`;
  csv += `# User ID: ${exportData.user_id}\n\n`;

  // Convert each table to CSV section
  for (const [tableName, records] of Object.entries(exportData.data)) {
    if (!Array.isArray(records) || records.length === 0) continue;

    csv += `\n## ${tableName.toUpperCase()}\n`;

    // Headers
    const headers = Object.keys(records[0]);
    csv += headers.join(',') + '\n';

    // Rows
    for (const record of records) {
      const row = headers.map(header => {
        const value = record[header];
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
