import fs from 'fs';
import path from 'path';

export interface ResearchFinding {
  id: string;
  title: string;
  source: string;
  dateRange: string;
  publishDate?: string;
  summary: string;
  tags: string[];
  link?: string;
  doi?: string;
}

export async function getAcademicResearch(): Promise<ResearchFinding[]> {
  const dataDir = path.join(process.cwd(), 'data', 'research');
  const seedPath = path.join(dataDir, 'seed.json');
  const scholarPath = path.join(dataDir, 'scholar.json');

  let allResearch: ResearchFinding[] = [];

  if (fs.existsSync(seedPath)) {
    try {
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      allResearch = allResearch.concat(seedData);
    } catch (e) {
      console.error('Failed to read seed.json', e);
    }
  }

  if (fs.existsSync(scholarPath)) {
    try {
      const scholarData = JSON.parse(fs.readFileSync(scholarPath, 'utf-8'));
      allResearch = allResearch.concat(scholarData);
    } catch (e) {
      console.error('Failed to read scholar.json', e);
    }
  }
  
  // Sort by publishDate if available
  allResearch.sort((a, b) => {
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  return allResearch;
}
