import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface ASEANHistoricalData {
  countries: Array<{
    countryCode: string;
    countryName: string;
    indicators: Record<
      string,
      {
        name: string;
        values: Array<{
          year: string;
          value: number | null;
        }>;
      }
    >;
  }>;
  _source_url: string;
  _scraped_at: string;
}

export function getASEANHistoricalData(): ASEANHistoricalData | null {
  try {
    const filePath = path.join(DATA_DIR, 'asean', 'fallback', '_by_country.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as ASEANHistoricalData;
  } catch (error) {
    console.error('Error reading ASEAN historical data:', error);
    return null;
  }
}

export interface ProvinsiTPTItem {
  province_code: string;
  province_name: string;
  tpt_feb_25: number | null;
  tpt_feb_26: number | null;
  _last_updated: string;
}

export interface BPSProvinsiFile {
  source: 'official_api' | 'fallback_spreadsheet';
  data: ProvinsiTPTItem[];
}

export function getBPSProvinsiData(): BPSProvinsiFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'provinsi', 'tpt.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return {
        source: 'fallback_spreadsheet',
        data: parsed
      };
    }
    return parsed as BPSProvinsiFile;
  } catch (error) {
    console.error('Error reading BPS Provinsi data:', error);
    return null;
  }
}

export interface BPSNationalItem {
  id: string;
  indicator: 'ihk' | 'ekspor' | 'impor';
  period: string;
  value: number;
  change_mom?: number;
  change_yoy?: number;
}

export interface BPSNationalFile {
  source: 'official_api' | 'static_seed';
  data: BPSNationalItem[];
}

export function getBPSNationalData(): BPSNationalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'national-indicators.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSNationalFile;
  } catch (error) {
    console.error('Error reading BPS National data:', error);
    return null;
  }
}

export interface BPSHistoricalFile {
  source: string;
  _source_url: string;
  data: Array<{
    year: string;
    tpt: number;
    tpak: number;
  }>;
}

export function getBPSHistoricalData(): BPSHistoricalFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'national-historical.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as BPSHistoricalFile;
  } catch (error) {
    console.error('Error reading BPS historical data:', error);
    return null;
  }
}

export interface KemenakerPHKArticle {
  title: string;
  date: string;
  summary: string;
  link: string;
  _source_url: string;
  _scraped_at: string;
}

export function getPHKArticles(): KemenakerPHKArticle[] {
  try {
    const filePath = path.join(DATA_DIR, 'kemenaker', 'phk', 'articles.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as KemenakerPHKArticle[];
  } catch (error) {
    console.error('Error reading Kemenaker PHK articles:', error);
    return [];
  }
}

let newsCache: any[] | null = null;

export function getNewsData(): any[] {
  if (newsCache) {
    return newsCache;
  }
  try {
    const filePath = path.join(DATA_DIR, 'news', 'historical-seed.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    newsCache = JSON.parse(rawData);
    // Sort by date descending
    newsCache!.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return newsCache!;
  } catch (error) {
    console.error('Error reading news data:', error);
    return [];
  }
}
