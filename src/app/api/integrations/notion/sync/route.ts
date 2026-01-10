import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Client } from '@notionhq/client';

// POST /api/integrations/notion/sync
// Synchronizes Books and Courses from Notion databases
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Notion integration
    const { data: integration, error: integrationError } = await supabase
      .from('notion_integrations')
      .select('access_token, workspace_id')
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Notion not connected' },
        { status: 404 }
      );
    }

    // Initialize Notion client
    const notion = new Client({ auth: integration.access_token });

    // Search for all data sources (databases) the integration has access to
    // Notion API v2 uses 'data_source' instead of 'database'
    const { results } = await notion.search({});
    const dataSources = results.filter((item) => item.object === 'data_source');

    let booksCount = 0;
    let coursesCount = 0;
    const errors: string[] = [];

    // Process each data source (database)
    for (const ds of dataSources) {
      if (ds.object !== 'data_source') continue;

      try {
        // Get database name to determine type
        const dsName = ('title' in ds && Array.isArray(ds.title) && ds.title.length > 0 && 'plain_text' in ds.title[0])
          ? ds.title[0].plain_text.toLowerCase()
          : '';

        // Check if it's a books database
        if (dsName.includes('book') || dsName.includes('reading') || dsName.includes('bücher')) {
          const syncedBooks = await syncBooksDataSource(notion, ds.id, user.id, supabase);
          booksCount += syncedBooks;
        }

        // Check if it's a courses database
        if (dsName.includes('course') || dsName.includes('learning') || dsName.includes('kurs')) {
          const syncedCourses = await syncCoursesDataSource(notion, ds.id, user.id, supabase);
          coursesCount += syncedCourses;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`DataSource ${ds.id}: ${errorMsg}`);
      }
    }

    // Update last sync timestamp
    await supabase
      .from('notion_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      synced: {
        books: booksCount,
        courses: coursesCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Notion sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Sync Books from Notion Data Source to books table
async function syncBooksDataSource(
  notion: Client,
  dataSourceId: string,
  userId: string,
  supabase: any
): Promise<number> {
  let count = 0;

  // Query all pages in the data source
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });

  for (const page of response.results) {
    if (page.object !== 'page' || !('properties' in page)) continue;

    try {
      const props = page.properties;

      // Extract title (usually in "Name" or "Title" property)
      const titleProp = props.Name || props.Title || props.name || props.title;
      let title = 'Untitled';
      if (titleProp && titleProp.type === 'title' && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
        title = titleProp.title[0].plain_text || 'Untitled';
      }

      // Extract other properties (adapt based on your Notion database structure)
      const author = extractText(props.Author || props.author);
      const status = extractSelect(props.Status || props.status) || 'to_read';
      const rating = extractNumber(props.Rating || props.rating);
      const pages = extractNumber(props.Pages || props.pages);

      // Check if book already exists (by title to avoid duplicates)
      const { data: existing } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', userId)
        .eq('title', title)
        .single();

      if (existing) {
        // Update existing book
        await supabase
          .from('books')
          .update({
            author,
            status: mapNotionStatusToBook(status),
            rating,
            pages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insert new book
        await supabase.from('books').insert({
          user_id: userId,
          title,
          author,
          status: mapNotionStatusToBook(status),
          rating,
          pages,
        });
      }

      count++;
    } catch (err) {
      console.error(`Failed to sync book page ${page.id}:`, err);
    }
  }

  return count;
}

// Sync Courses from Notion Data Source to courses table
async function syncCoursesDataSource(
  notion: Client,
  dataSourceId: string,
  userId: string,
  supabase: any
): Promise<number> {
  let count = 0;

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });

  for (const page of response.results) {
    if (page.object !== 'page' || !('properties' in page)) continue;

    try {
      const props = page.properties;

      // Extract title
      const titleProp = props.Name || props.Title || props.name || props.title;
      let title = 'Untitled Course';
      if (titleProp && titleProp.type === 'title' && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
        title = titleProp.title[0].plain_text || 'Untitled Course';
      }

      // Extract other properties
      const platform = extractText(props.Platform || props.platform);
      const instructor = extractText(props.Instructor || props.instructor);
      const url = extractUrl(props.URL || props.url);
      const status = extractSelect(props.Status || props.status) || 'planned';
      const progress = extractNumber(props.Progress || props.progress) || 0;

      // Check if course already exists
      const { data: existing } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', userId)
        .eq('title', title)
        .single();

      if (existing) {
        // Update existing course
        await supabase
          .from('courses')
          .update({
            platform,
            instructor,
            url,
            status: mapNotionStatusToCourse(status),
            progress: Math.min(Math.max(progress, 0), 100), // Clamp 0-100
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insert new course
        await supabase.from('courses').insert({
          user_id: userId,
          title,
          platform,
          instructor,
          url,
          status: mapNotionStatusToCourse(status),
          progress: Math.min(Math.max(progress, 0), 100),
        });
      }

      count++;
    } catch (err) {
      console.error(`Failed to sync course page ${page.id}:`, err);
    }
  }

  return count;
}

// Helper: Extract text from Notion property
function extractText(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text) && prop.rich_text.length > 0) {
    return prop.rich_text[0].plain_text || null;
  }
  if (prop.type === 'title' && Array.isArray(prop.title) && prop.title.length > 0) {
    return prop.title[0].plain_text || null;
  }
  return null;
}

// Helper: Extract select value
function extractSelect(prop: any): string | null {
  if (!prop || prop.type !== 'select' || !prop.select) return null;
  return prop.select.name || null;
}

// Helper: Extract number
function extractNumber(prop: any): number | null {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

// Helper: Extract URL
function extractUrl(prop: any): string | null {
  if (!prop || prop.type !== 'url') return null;
  return prop.url;
}

// Map Notion status to book status (to_read, reading, read, abandoned)
function mapNotionStatusToBook(notionStatus: string): string {
  const status = notionStatus.toLowerCase();
  if (status.includes('read') && !status.includes('reading')) return 'read';
  if (status.includes('reading') || status.includes('current')) return 'reading';
  if (status.includes('abandon') || status.includes('dnf')) return 'abandoned';
  return 'to_read';
}

// Map Notion status to course status (planned, in_progress, completed, abandoned)
function mapNotionStatusToCourse(notionStatus: string): string {
  const status = notionStatus.toLowerCase();
  if (status.includes('complet') || status.includes('done')) return 'completed';
  if (status.includes('progress') || status.includes('current') || status.includes('learning')) return 'in_progress';
  if (status.includes('abandon') || status.includes('drop')) return 'abandoned';
  return 'planned';
}
