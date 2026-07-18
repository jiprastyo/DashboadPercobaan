/**
 * scripts/scrapers/setkab.ts — Setkab RSS Parser
 * Parses https://setkab.go.id/feed/ for labor/employment related articles.
 */

import RSSParser from 'rss-parser';
import path from 'path';
import {
  SETKAB,
  log,
  matchesKeywords,
  monthStr,
  timestamp,
  writeJSON,
  readJSON,
  ensureDir,
} from '../config';

interface SetkabArticle {
  title: string;
  date: string;
  summary: string;
  link: string;
  categories: string[];
  author: string;
  _source_url: string;
  _scraped_at: string;
}

export async function scrapeSetkab(): Promise<{ total: number; newItems: number }> {
  log('setkab', 'Starting Setkab RSS parser');
  const parser = new RSSParser();
  
  let feed;
  try {
    feed = await parser.parseURL(SETKAB.rssUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('setkab', `Error parsing RSS feed: ${msg}`);
    // Retry with fetch + parseString
    try {
      log('setkab', 'Retrying with manual fetch...');
      const { fetchWithRetry } = await import('../config');
      const res = await fetchWithRetry(SETKAB.rssUrl);
      const xml = await res.text();
      feed = await parser.parseString(xml);
    } catch (retryErr: unknown) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      log('setkab', `Retry failed: ${retryMsg}`);
      return { total: 0, newItems: 0 };
    }
  }

  if (!feed || !feed.items) {
    log('setkab', 'No items in feed');
    return { total: 0, newItems: 0 };
  }

  log('setkab', `Feed has ${feed.items.length} total items`);

  // Filter by labor/employment keywords
  const filtered: SetkabArticle[] = [];
  for (const item of feed.items) {
    const combinedText = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''} ${(item.categories || []).join(' ')}`;
    
    if (matchesKeywords(combinedText, SETKAB.keywords)) {
      filtered.push({
        title: item.title || '',
        date: item.isoDate || item.pubDate || '',
        summary: (item.contentSnippet || '').slice(0, 500),
        link: item.link || '',
        categories: item.categories || [],
        author: item.creator || item.author || '',
        _source_url: item.link || SETKAB.rssUrl,
        _scraped_at: timestamp(),
      });
    }
  }

  log('setkab', `Filtered ${filtered.length} labor-related articles`);

  // Save by month
  const month = monthStr();
  ensureDir(SETKAB.dataDir);
  const outPath = path.join(SETKAB.dataDir, `${month}.json`);

  const existing = readJSON<SetkabArticle[]>(outPath) || [];
  const existingLinks = new Set(existing.map((e) => e.link));
  const newItems = filtered.filter((i) => !existingLinks.has(i.link));
  const merged = [...existing, ...newItems];

  writeJSON(outPath, merged);
  log('setkab', `${newItems.length} new, ${merged.length} total for ${month}`);

  return { total: merged.length, newItems: newItems.length };
}

// Run directly
if (require.main === module) {
  scrapeSetkab()
    .then((result) => {
      log('setkab', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('setkab', `Fatal error: ${err}`);
      process.exit(1);
    });
}
