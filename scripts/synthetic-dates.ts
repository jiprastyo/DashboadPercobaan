import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database file not found:', DB_FILE);
    return;
  }
  
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const data = JSON.parse(raw);
  
  const START_DATE = new Date('2026-02-01T00:00:00Z').getTime();
  const END_DATE = new Date('2026-06-07T23:59:59Z').getTime();
  const TIME_RANGE = END_DATE - START_DATE;
  
  let modifiedCount = 0;
  
  // Create an object to track how many items per source to help evenly distribute
  // Actually, Math.random() is uniformly distributed naturally, which is perfectly fine for 62k items.
  // Using pure random for simplicity and speed.
  
  for (const article of data) {
    // Target articles from the bulk import (ids starting with hist- or articles that have identical date to scrape time)
    // Most of the problematic ones have date === '2026-06-06' or start with 'hist-'
    if (article.id.startsWith('hist-') || article.date === '2026-06-06' || article.date === '2026-06-07') {
      
      const randomTime = START_DATE + (Math.random() * TIME_RANGE);
      const newDate = new Date(randomTime);
      
      article.date = newDate.toISOString();
      article.is_estimated = true; // Add flag for frontend
      modifiedCount++;
    }
  }
  
  // Sort by date descending
  data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Successfully synthetically distributed dates for ${modifiedCount} articles!`);
}

main();
