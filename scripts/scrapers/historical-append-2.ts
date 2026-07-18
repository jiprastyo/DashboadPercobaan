import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import { NEWS_SOURCES } from '../../src/lib/constants';

const parser = new Parser({
  customFields: {
    item: ['pubDate', 'description'],
  },
});

const DATA_DIR = path.join(process.cwd(), 'data', 'news');
const OUTPUT_FILE = path.join(DATA_DIR, 'historical-seed.json');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('===========================================================');
  console.log('Memulai Historical News Scraper (APPEND MODE 2)');
  console.log('Target: New specific keywords requested by user (batch 2)');
  console.log('===========================================================');

  let historicalArticles: any[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    historicalArticles = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Loaded ${historicalArticles.length} existing articles.`);
  }

  const existingUrls = new Set(historicalArticles.map(a => a._source_url));
  let newArticlesCount = 0;

  const domains = NEWS_SOURCES.map((s) => {
    try {
      const url = new URL(s.url);
      return url.hostname.replace('www.', '').replace('rss.', '');
    } catch {
      return '';
    }
  }).filter(Boolean);

  const targetKeywords = [
    '"industri rumahan" OR "maklun" OR "industri rumah tangga" OR "outsourcing" OR "ekonomi baru"',
    '"freelancer" OR "freelancing" OR "remote worker" OR "remote working"',
    '"pekerja kontrak" OR "subkontrak" OR "PKWT" OR "PKWTT" OR "jaminan kerja"'
  ];

  const afterDate = '2025-11-01';

  for (const domain of domains) {
    console.log(`\n🔍 APPENDING domain: ${domain}...`);
    
    for (const batch of targetKeywords) {
      const query = `(${batch}) site:${domain} after:${afterDate}`;
      const encodedQuery = encodeURIComponent(query);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=id&gl=ID&ceid=ID:id`;

      try {
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
          let batchNew = 0;
          for (const item of feed.items) {
            if (item.link && !existingUrls.has(item.link)) {
              existingUrls.add(item.link);
              historicalArticles.push({
                id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: item.title,
                date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : afterDate,
                source: NEWS_SOURCES.find(s => s.url.includes(domain))?.id || 'unknown',
                source_name: feed.title || domain,
                excerpt: (item.description || item.contentSnippet || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
                sector_tags: ['general'], 
                keywords_matched: batch.split(' OR ').map(k => k.replace(/"/g, '')),
                _source_url: item.link,
                _scraped_at: new Date().toISOString()
              });
              newArticlesCount++;
              batchNew++;
            }
          }
          if (batchNew > 0) {
             console.log(`  -> [Batch] Ditemukan ${batchNew} artikel BARU.`);
          }
        }
        await delay(1500);
      } catch (error: any) {
        // console.error(`  -> Gagal memuat RSS: ${error.message}`);
      }
    }
  }

  console.log('\n===========================================================');
  console.log(`Selesai! Berhasil menambahkan ${newArticlesCount} artikel baru.`);
  console.log(`Total database sekarang: ${historicalArticles.length} artikel.`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(historicalArticles, null, 2));
  console.log('Selesai. Silahkan push ke Github.');
}

main().catch(console.error);
