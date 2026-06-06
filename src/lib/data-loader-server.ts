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
