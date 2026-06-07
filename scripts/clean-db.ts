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
  let deletedCount = 0;
  
  const filteredData = [];

  for (const article of data) {
    const textToSearch = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase();

    // 0. Exclude completely unwanted topics
    if (textToSearch.includes('harga emas antam')) {
      deletedCount++;
      continue;
    }

    let needsUpdate = false;

    // 1. Clean source name
    if (article.source_name && (article.source_name.includes('OR') || article.source_name.includes('site:'))) {
      article.source_name = sourceMap.get(article.source) || article.source;
      needsUpdate = true;
    }

    // 2. Full deep scan using WORD BOUNDARIES
    const hasWord = (word: string, text: string) => {
      // Create a regex to match the exact word or phrase with boundaries
      // This prevents "gas" from matching "tugas" or "migas"
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text);
    };
    
    const laborMatches = allLaborKeywords.filter(k => hasWord(k, textToSearch));
    const sectorMatches = allSectorKeywords.filter(k => hasWord(k, textToSearch));
    
    let combined = [...new Set([...laborMatches, ...sectorMatches])];
    
    if (combined.length === 0) {
       if (article.keywords_matched && article.keywords_matched.length > 0) {
         article.keywords_matched = [];
         needsUpdate = true;
       }
    } else {
       const newTags = combined.slice(0, 3);
       if (JSON.stringify(article.keywords_matched) !== JSON.stringify(newTags)) {
         article.keywords_matched = newTags;
         needsUpdate = true;
       }
    }

    // Recheck and clean sector_tags
    const matchedSectors = Object.keys(SECTOR_KEYWORDS).filter((sectorId) => {
      const keywords = SECTOR_KEYWORDS[sectorId] || [];
      return keywords.some((kw) => hasWord(kw.toLowerCase(), textToSearch));
    });
    
    const newSectors = matchedSectors.length > 0 ? matchedSectors : ['general'];
    const sortedNewSectors = [...newSectors].sort();
    const sortedExistingSectors = [...(article.sector_tags || [])].sort();
    
    if (JSON.stringify(sortedExistingSectors) !== JSON.stringify(sortedNewSectors)) {
      article.sector_tags = sortedNewSectors;
      needsUpdate = true;
    }

    if (needsUpdate) updatedCount++;
    filteredData.push(article);
  }

  console.log(`Updated tags for ${updatedCount} articles. Deleted ${deletedCount} unwanted articles.`);
  fs.writeFileSync(DB_FILE, JSON.stringify(filteredData, null, 2));
  console.log('Database saved successfully!');
}

cleanDatabase();
