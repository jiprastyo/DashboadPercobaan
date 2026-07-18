import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import { NEWS_SOURCES, KBLI_SECTORS, SECTOR_KEYWORDS, LABOR_KEYWORDS } from '../../src/lib/constants';

const parser = new Parser({
  customFields: {
    item: ['pubDate', 'description'],
  },
});

const DATA_DIR = path.join(process.cwd(), 'data', 'news');
const OUTPUT_FILE = path.join(DATA_DIR, 'historical-seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to pause execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('===========================================================');
  console.log('Memulai Historical News Scraper (Mulai Nov 2025)');
  console.log('Metode: Google News RSS Search');
  console.log('===========================================================');

  // We extract pure domains to query against
  const domains = NEWS_SOURCES.map((s) => {
    try {
      const url = new URL(s.url);
      return url.hostname.replace('www.', '').replace('rss.', '');
    } catch {
      return '';
    }
  }).filter(Boolean);

  console.log(`Mendeteksi ${domains.length} domain unik.`);

  // Using a broader set of core keywords based on user request to maximize coverage
  const coreLabor = '"PHK" OR "tenaga kerja" OR "pengangguran" OR "lowongan" OR "upah" OR "UMR" OR "lapangan kerja" OR "investasi" OR "pabrik" OR "usaha"';
  const afterDate = '2025-11-01';
  let totalArticles = 0;
  const historicalArticles: any[] = [];

  // For safety and speed in this run, we'll iterate through all domains
  // but we'll group the sectors to minimize requests.
  
  for (const domain of domains) {
    console.log(`\n🔍 Mencari arsip untuk domain: ${domain}...`);
    
    // Iterate over all 18 sectors
    for (const sector of KBLI_SECTORS) {
      const keywords = SECTOR_KEYWORDS[sector.id] || [];
      // Grab top 3 keywords to keep query length safe
      const topKeywords = keywords.slice(0, 3).map(k => `"${k}"`).join(' OR ');
      
      if (!topKeywords) continue;

      const query = `(${coreLabor}) AND (${topKeywords}) site:${domain} after:${afterDate}`;
      const encodedQuery = encodeURIComponent(query);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=id&gl=ID&ceid=ID:id`;

      try {
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
          console.log(`  -> [Sektor ${sector.id.toUpperCase()}] Ditemukan ${feed.items.length} artikel sejarah.`);
          
          for (const item of feed.items) {
            // Deduplicate
            if (!historicalArticles.find(a => a.url === item.link)) {
              historicalArticles.push({
                id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: item.title,
                date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : afterDate,
                source: NEWS_SOURCES.find(s => s.url.includes(domain))?.id || 'unknown',
                source_name: feed.title || domain,
                excerpt: (item.description || item.contentSnippet || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
                sector_tags: [sector.id], // Auto-tagged by the query!
                keywords_matched: keywords.slice(0, 3),
                _source_url: item.link,
                _scraped_at: new Date().toISOString()
              });
              totalArticles++;
            }
          }
        }
        
        // Wait 1.5 seconds between requests to respect rate limits
        await delay(1500);
      } catch (error: any) {
        console.error(`  -> [Sektor ${sector.id.toUpperCase()}] Gagal memuat RSS: ${error.message}`);
      }
    }
  }

  console.log('\n===========================================================');
  console.log(`Selesai! Berhasil mengumpulkan ${totalArticles} artikel sejarah dari Nov 2025.`);
  console.log(`Menyimpan ke: ${OUTPUT_FILE}`);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(historicalArticles, null, 2));
  console.log('File berhasil disimpan. Silahkan commit ke repositori Anda.');
}

main().catch(console.error);
