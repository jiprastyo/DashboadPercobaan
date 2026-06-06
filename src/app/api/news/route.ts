import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedNews: any[] | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search')?.toLowerCase() || '';
  const sources = searchParams.get('sources')?.split(',').filter(Boolean) || [];
  const sectors = searchParams.get('sectors')?.split(',').filter(Boolean) || [];

  if (!cachedNews) {
    const dataPath = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
    if (fs.existsSync(dataPath)) {
      cachedNews = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      // Sort by date descending
      cachedNews!.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      cachedNews = [];
    }
  }

  let filtered = cachedNews!;

  if (search) {
    filtered = filtered.filter(n => 
      n.title?.toLowerCase().includes(search) || 
      n.excerpt?.toLowerCase().includes(search)
    );
  }

  if (sources.length > 0) {
    filtered = filtered.filter(n => sources.includes(n.source));
  }

  if (sectors.length > 0) {
    filtered = filtered.filter(n => n.sector_tags?.some((t: string) => sectors.includes(t)));
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
}
