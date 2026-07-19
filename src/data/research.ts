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
  taCategory?: 'skripsi' | 'tesis' | 'disertasi' | 'paper_jurnal' | 'lainnya';
  link?: string;
  doi?: string;
}

function inferTaCategory(item: ResearchFinding): NonNullable<ResearchFinding['taCategory']> {
  const text = `${item.title} ${item.source} ${item.summary} ${item.link || ''} ${(item.tags || []).join(' ')}`.toLowerCase();

  if (/\b(disertasi|doctoral|phd|doktor)\b/i.test(text)) return 'disertasi';
  if (/\b(tesis|thesis|magister|master)\b/i.test(text)) return 'tesis';
  if (/\b(skripsi|undergraduate|sarjana|repository)\b/i.test(text)) return 'skripsi';
  if (/\b(jurnal|journal|paper|openalex|doi\.org|working paper)\b/i.test(text) || item.doi) return 'paper_jurnal';
  return 'lainnya';
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

  allResearch = allResearch.map((item) => ({
    ...item,
    taCategory: item.taCategory || inferTaCategory(item),
  }));
  
  // Sort by publishDate if available
  allResearch.sort((a, b) => {
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  return allResearch;
}
