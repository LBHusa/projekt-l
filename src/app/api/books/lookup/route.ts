import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN required' }, { status: 400 });
  }

  try {
    // OpenLibrary API with explicit Accept header
    const response = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const data = await response.json();

    // Get author name if available
    let authorName = '';
    if (data.authors?.[0]?.key) {
      const authorResponse = await fetch(
        `https://openlibrary.org${data.authors[0].key}.json`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (authorResponse.ok) {
        const authorData = await authorResponse.json();
        authorName = authorData.name || '';
      }
    }

    return NextResponse.json({
      title: data.title || '',
      author: authorName,
      pages: data.number_of_pages || null,
      cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
      isbn: isbn,
    });
  } catch (error) {
    console.error('OpenLibrary API error:', error);
    return NextResponse.json({ error: 'API error' }, { status: 500 });
  }
}
