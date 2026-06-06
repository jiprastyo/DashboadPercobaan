import * as fs from 'fs';
import * as path from 'path';
import { NEWS_SOURCES, LABOR_KEYWORDS } from '../src/lib/constants';

const DATA_DIR = path.join(process.cwd(), 'data', 'news');
const DB_FILE = path.join(DATA_DIR, 'historical-seed.json');

function cleanDatabase() {
  console.log('Loading database...');
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log(`Loaded ${data.length} articles.`);

  // Create a map for quick source name lookup
  const sourceMap = new Map();
  NEWS_SOURCES.forEach(s => sourceMap.set(s.id, s.name));

  // Ensure all keywords are lowercase for comparison
  const allKeywords = LABOR_KEYWORDS.map(k => k.toLowerCase());

  let updatedCount = 0;

  for (const article of data) {
    let needsUpdate = false;

    // 1. Fix source_name if it contains the Google News query junk
    if (article.source_name && (article.source_name.includes('OR') || article.source_name.includes('site:'))) {
      const cleanName = sourceMap.get(article.source) || article.source;
      article.source_name = cleanName;
      needsUpdate = true;
    }

    // 2. Fix keywords_matched to only show actual matches
    // Currently some articles have 5-10 keywords in the array because of the batch query
    if (article.keywords_matched && article.keywords_matched.length > 2) {
      const textToSearch = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();
      
      const actualMatches = allKeywords.filter(keyword => textToSearch.includes(keyword));
      
      // If we found specific matches, replace the broad batch array
      if (actualMatches.length > 0) {
        article.keywords_matched = actualMatches;
        needsUpdate = true;
      } else {
        // If no direct match in excerpt/title (sometimes Google matches on full content)
        // just keep the first one or two to avoid clutter
        article.keywords_matched = article.keywords_matched.slice(0, 1);
        needsUpdate = true;
      }
    }

    if (needsUpdate) updatedCount++;
  }

  console.log(`Cleaned ${updatedCount} articles.`);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  console.log('Database saved successfully!');
}

cleanDatabase();
