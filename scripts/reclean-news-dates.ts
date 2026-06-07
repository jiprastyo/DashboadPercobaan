import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const HISTORICAL_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const TARGET_DATE = new Date('2026-02-01T00:00:00Z');
const CONCURRENCY = 50; // High concurrency

async function fetchHtmlWithTimeout(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (error) {
    return null;
  }
}

function parseDateFromHtml(html: string): Date | null {
  const $ = cheerio.load(html);
  
  const selectors = [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'time[datetime]'
  ];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      const content = el.attr('content') || el.attr('datetime');
      if (content) {
        const d = new Date(content);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html();
      if (content) {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item.datePublished) {
            const d = new Date(item.datePublished);
            if (!isNaN(d.getTime())) return d;
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

async function processBatch(articles: any[]) {
  const promises = articles.map(async (article) => {
    let finalAction = 'failed';
    let finalDateStr = article.date;

    if (article._source_url) {
      const html = await fetchHtmlWithTimeout(article._source_url);
      if (html) {
        const parsedDate = parseDateFromHtml(html);
        if (parsedDate) {
          if (parsedDate >= TARGET_DATE) {
            finalDateStr = parsedDate.toISOString().split('T')[0];
            finalAction = 'kept';
          } else {
            finalAction = 'discarded';
          }
        }
      }
    }

    return { article, finalAction, finalDateStr };
  });

  return await Promise.all(promises);
}

async function main() {
  if (!fs.existsSync(HISTORICAL_FILE)) {
    console.error('Database file not found.');
    return;
  }

  const rawData = fs.readFileSync(HISTORICAL_FILE, 'utf-8');
  let articles = JSON.parse(rawData);
  console.log(`Loaded ${articles.length} articles.`);

  let kept = 0;
  let discarded = 0;
  let failed = 0;
  
  const cleanedArticles = [];

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    const results = await processBatch(batch);
    
    for (const res of results) {
      if (res.finalAction === 'kept') {
        res.article.date = res.finalDateStr;
        cleanedArticles.push(res.article);
        kept++;
      } else if (res.finalAction === 'discarded') {
        discarded++;
      } else {
        // If failed to extract, we keep it but log it as failed extraction.
        // It stays with its original scraped date.
        res.article.date = res.finalDateStr;
        cleanedArticles.push(res.article);
        failed++;
      }
    }

    console.log(`Processed ${Math.min(i + CONCURRENCY, articles.length)} / ${articles.length} | Kept: ${kept} | Discarded: ${discarded} | Failed Extr: ${failed}`);

    // Save progressively every 5,000 records to avoid huge data loss but not thrash disk
    if (i > 0 && i % 5000 === 0) {
      // Note: We only save what's processed so far PLUS the unprocessed ones so the DB isn't truncated if interrupted
      const safeDatabase = [...cleanedArticles, ...articles.slice(i + CONCURRENCY)];
      fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(safeDatabase, null, 2));
      console.log(`--- Checkpoint saved at ${i} ---`);
    }
  }

  // Sort and final save
  cleanedArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(cleanedArticles, null, 2));
  
  console.log(`\nDONE! Aggressive scraping finished.`);
  console.log(`Total processed: ${articles.length}`);
  console.log(`Total kept (>= Feb 2026): ${kept}`);
  console.log(`Total discarded (< Feb 2026): ${discarded}`);
  console.log(`Total failed extraction (kept with original date): ${failed}`);
}

main().catch(console.error);
