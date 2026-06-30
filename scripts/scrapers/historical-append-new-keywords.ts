/**
 * scripts/scrapers/historical-append-new-keywords.ts
 * One-off backfill: hortikultura, palawija, hidroponik — from Jan 2026
 *
 * Strategy: Directly fetch each outlet's native RSS feed (NOT via Google News),
 * filter articles by the target keywords, and store only real publisher URLs.
 * Articles missing a real URL or missing date metadata are strictly skipped.
 */

import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';

const parser = new Parser({
  customFields: {
    item: ['pubDate', 'dc:date', 'description'],
  },
});

const DATA_DIR = path.join(process.cwd(), 'data', 'news');
const OUTPUT_FILE = path.join(DATA_DIR, 'historical-seed.json');
const MIN_DATE = new Date('2026-01-01T00:00:00.000Z');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Direct native RSS feeds (real URLs, no Google News proxy) ────────────────
const RSS_OUTLETS: { id: string; name: string; urls: string[] }[] = [
  { id: 'kontan',       name: 'Kontan',              urls: ['https://rss.kontan.co.id/news/makroekonomi', 'https://rss.kontan.co.id/news/nasional', 'https://rss.kontan.co.id/news/industri'] },
  { id: 'bisnis',       name: 'Bisnis.com',           urls: ['https://www.bisnis.com/rss'] },
  { id: 'katadata',     name: 'Katadata',             urls: ['https://katadata.co.id/rss'] },
  { id: 'cnbc',         name: 'CNBC Indonesia',       urls: ['https://www.cnbcindonesia.com/news/rss'] },
  { id: 'cnn',          name: 'CNN Indonesia',        urls: ['https://www.cnnindonesia.com/ekonomi/rss', 'https://www.cnnindonesia.com/nasional/rss'] },
  { id: 'serambi',      name: 'Serambi Indonesia',    urls: ['https://aceh.tribunnews.com/rss'] },
  { id: 'waspada',      name: 'Waspada',              urls: ['https://waspada.id/feed/'] },
  { id: 'haluan',       name: 'Haluan',               urls: ['https://www.harianhaluan.com/rss'] },
  { id: 'riaupos',      name: 'Riau Pos',             urls: ['https://riaupos.jawapos.com/rss'] },
  { id: 'sripoku',      name: 'Sriwijaya Post',       urls: ['https://palembang.tribunnews.com/rss'] },
  { id: 'wartakota',    name: 'Warta Kota',           urls: ['https://wartakota.tribunnews.com/rss'] },
  { id: 'pikiranrakyat',name: 'Pikiran Rakyat',       urls: ['https://www.pikiran-rakyat.com/rss'] },
  { id: 'suaramerdeka', name: 'Suara Merdeka',        urls: ['https://www.suaramerdeka.com/rss'] },
  { id: 'krjogja',      name: 'Kedaulatan Rakyat',    urls: ['https://www.krjogja.com/rss'] },
  { id: 'suryamalang',  name: 'Surya Malang',         urls: ['https://suryamalang.tribunnews.com/rss'] },
  { id: 'balipost',     name: 'Bali Post',            urls: ['https://www.balipost.com/feed'] },
  { id: 'pontianakpost',name: 'Pontianak Post',       urls: ['https://pontianakpost.jawapos.com/rss'] },
  { id: 'banjarmasinpost', name: 'Banjarmasin Post',  urls: ['https://banjarmasin.tribunnews.com/rss'] },
  { id: 'kaltimpost',   name: 'Kaltim Post',          urls: ['https://kaltimpost.jawapos.com/rss'] },
  { id: 'fajar',        name: 'Fajar',                urls: ['https://fajar.co.id/feed/'] },
  { id: 'kabarmakassar',name: 'Kabar Makassar',       urls: ['https://kabarmakassar.com/feed'] },
  { id: 'manadopost',   name: 'Manado Post',          urls: ['https://manadopost.jawapos.com/rss'] },
  { id: 'ambonekspres', name: 'Ambon Ekspres',        urls: ['https://ambonekspres.com/feed/'] },
  { id: 'cenderawasih', name: 'Cenderawasih Pos',     urls: ['https://www.ceposonline.com/feed/'] },
];

// Target keywords to match in title or description
const TARGET_KEYWORDS = ['hortikultura', 'palawija', 'hidroponik'];

function containsTargetKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return TARGET_KEYWORDS.some(kw => lower.includes(kw));
}

function isRealPublisherUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.hostname.includes('news.google.com') || u.hostname.includes('news.google.co.id')) return false;
    return true;
  } catch { return false; }
}

async function main() {
  console.log('===========================================================');
  console.log('Backfill: hortikultura, palawija, hidroponik (Jan 2026+)');
  console.log('Strategy: Direct native RSS feeds — real URLs guaranteed');
  console.log('===========================================================');

  let historicalArticles: any[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    historicalArticles = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Loaded ${historicalArticles.length} existing articles.`);
  }

  // Deduplicate by both _source_url and resolved_url
  const existingUrls = new Set<string>(
    historicalArticles.flatMap(a => [a._source_url, a.resolved_url].filter(Boolean))
  );

  let newArticlesCount = 0;
  let skippedNoUrl = 0;
  let skippedNoDate = 0;
  let skippedTooOld = 0;
  let skippedNoKeyword = 0;
  let skippedDuplicate = 0;

  for (const outlet of RSS_OUTLETS) {
    for (const rssUrl of outlet.urls) {
      console.log(`\n📡 ${outlet.name} — ${rssUrl}`);
      try {
        const feed = await parser.parseURL(rssUrl);
        let batchNew = 0;

        for (const item of feed.items || []) {
          // 1. Must have a real publisher URL
          const articleUrl = item.link || '';
          if (!isRealPublisherUrl(articleUrl)) { skippedNoUrl++; continue; }

          // 2. Must have a date
          const rawDate = item.isoDate || item.pubDate || (item as any)['dc:date'] || '';
          if (!rawDate) { skippedNoDate++; continue; }

          // 3. Date must be >= Jan 2026
          const pubDate = new Date(rawDate);
          if (isNaN(pubDate.getTime()) || pubDate < MIN_DATE) { skippedTooOld++; continue; }

          // 4. Must contain one of the target keywords in title or description
          const text = `${item.title || ''} ${item.contentSnippet || ''} ${item.description || ''}`;
          if (!containsTargetKeyword(text)) { skippedNoKeyword++; continue; }

          // 5. Deduplicate
          if (existingUrls.has(articleUrl)) { skippedDuplicate++; continue; }
          existingUrls.add(articleUrl);

          const dateStr = pubDate.toISOString().split('T')[0];

          historicalArticles.push({
            id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            title: (item.title || '').replace(/\s*-\s*[^-]{2,60}$/, '').trim(),
            date: dateStr,
            published_at: pubDate.toISOString(),
            date_source: 'original_feed',
            is_estimated: false,
            source: outlet.id,
            source_name: outlet.name,
            excerpt: (item.contentSnippet || item.description || '')
              .replace(/<[^>]*>?/gm, '')
              .substring(0, 200)
              .trim() + '...',
            sector_tags: ['a'], // Pertanian (KBLI A) — agricultural keywords
            keywords_matched: TARGET_KEYWORDS.filter(kw => text.toLowerCase().includes(kw)),
            _source_url: articleUrl,
            resolved_url: articleUrl,
            _scraped_at: new Date().toISOString(),
          });

          newArticlesCount++;
          batchNew++;
        }

        if (batchNew > 0) {
          console.log(`  ✅ ${batchNew} artikel baru ditemukan.`);
        } else {
          console.log(`  — Tidak ada artikel baru.`);
        }

        await delay(1000); // rate limiting between each RSS feed
      } catch (err: any) {
        console.log(`  ⚠️  Gagal: ${err.message}`);
      }
    }
  }

  console.log('\n===========================================================');
  console.log(`✅ Berhasil menambahkan : ${newArticlesCount} artikel baru`);
  console.log(`⏭  Dilewati (no URL)   : ${skippedNoUrl}`);
  console.log(`⏭  Dilewati (no date)  : ${skippedNoDate}`);
  console.log(`⏭  Dilewati (< Jan 26) : ${skippedTooOld}`);
  console.log(`⏭  Dilewati (no match) : ${skippedNoKeyword}`);
  console.log(`⏭  Dilewati (duplikat) : ${skippedDuplicate}`);
  console.log(`📦 Total database      : ${historicalArticles.length} artikel`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(historicalArticles, null, 2));
  console.log('Selesai. File tersimpan.');
}

main().catch(console.error);
