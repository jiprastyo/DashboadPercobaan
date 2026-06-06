import * as fs from 'fs';
import * as path from 'path';
import { NEWS_SOURCES, LABOR_KEYWORDS, SECTOR_KEYWORDS, PROVINCES } from '../src/lib/constants';

const DATA_DIR = path.join(process.cwd(), 'data', 'news');
const DB_FILE = path.join(DATA_DIR, 'historical-seed.json');

function cleanDatabase() {
  console.log('Loading database...');
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log(`Loaded ${data.length} articles.`);

  const sourceMap = new Map();
  NEWS_SOURCES.forEach(s => sourceMap.set(s.id, s.name));

  const allLaborKeywords = LABOR_KEYWORDS.map(k => k.toLowerCase());
  
  // Flatten sector keywords for quick checking
  const allSectorKeywords = Object.values(SECTOR_KEYWORDS).flat().map(k => k.toLowerCase());

  let updatedCount = 0;

  for (const article of data) {
    let needsUpdate = false;

    // 1. Clean source name
    if (article.source_name && (article.source_name.includes('OR') || article.source_name.includes('site:'))) {
      article.source_name = sourceMap.get(article.source) || article.source;
      needsUpdate = true;
    }

    // 2. Full deep scan for ALL keywords
    const textToSearch = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();
    
    // Scan labor keywords
    const laborMatches = allLaborKeywords.filter(k => textToSearch.includes(k));
    
    // Scan sector keywords to ensure we capture them too
    const sectorMatches = allSectorKeywords.filter(k => textToSearch.includes(k));
    
    // Combine them, ensuring we don't dump too many. Max 3 most relevant.
    let combined = [...new Set([...laborMatches, ...sectorMatches])];
    
    // If it's empty, try to at least keep the original ones if they exist and are valid
    if (combined.length === 0 && article.keywords_matched && article.keywords_matched.length > 0) {
       // do nothing or keep empty
    } else {
       // Store top 3 keywords to avoid cluttering the UI
       const newTags = combined.slice(0, 3);
       // Check if different
       if (JSON.stringify(article.keywords_matched) !== JSON.stringify(newTags)) {
         article.keywords_matched = newTags;
         needsUpdate = true;
       }
    }

    if (needsUpdate) updatedCount++;
  }

  console.log(`Updated ${updatedCount} articles with deep scanned tags.`);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  console.log('Database saved successfully!');
}

cleanDatabase();
