import { NextResponse } from 'next/server';
import { getTodayTimeStats } from '@/lib/data/habits';

export async function GET() {
  try {
    const stats = await getTodayTimeStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching today time stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time stats' },
      { status: 500 }
    );
  }
}
