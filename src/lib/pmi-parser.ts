/**
 * src/lib/pmi-parser.ts
 * Parse Bank Indonesia's quarterly PMI-BI (Prompt Manufacturing Index) figures
 * from press-release text.
 *
 * Why: data/bi/pmi/series.json has been empty since 2026-06-07 because the old
 * scraper targeted BI's survey-report listing page, which renders no data
 * tables. The figures live in quarterly press releases, e.g.
 * https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2813926.aspx
 * ("tecermin dari PMI-BI sebesar 51,43%", Triwulan II 2026).
 *
 * "PMI" is ambiguous in Indonesian government text: it also means Pekerja
 * Migran Indonesia (migrant workers). The parser rejects migrant-worker text.
 */

export interface BrsRow {
  date?: string;
  title?: string;
  summary?: string;
  link?: string;
  _source_url?: string;
}

export interface PmiSeriesItem {
  period: string;
  pmi_value: number;
  category?: string;
  description?: string;
  sub_indices?: { output: number; new_orders: number; employment: number };
  _source_url: string;
  _scraped_at: string;
}

const MIGRANT = /pekerja\s+migran|migrant\s+worker/i;

export function parsePmiFromText(text: string): number | null {
  if (!text || MIGRANT.test(text) || !/pmi/i.test(text)) {
    return null;
  }
  // Gap may cross a year (e.g. "PMI-BI triwulan I 2026 sebesar 52,03%").
  const m = text.match(/pmi-bi[\s\S]{0,120}?(\d{1,3}[.,]\d{1,2})/i);
  if (!m) {
    return null;
  }
  const v = Number(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v <= 100 ? v : null;
}

const ROMAN_QUARTERS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

/**
 * Quarter identifier from release text: "Triwulan II 2026" → "2026-T2".
 * Returns null when the text carries no quarter; caller falls back to date.
 */
export function parseQuarterFromText(text: string): string | null {
  const m = text.match(/triwulan\s+([ivx]+)\s+(\d{4})/i);
  if (!m) {
    return null;
  }
  const q = ROMAN_QUARTERS[m[1].toLowerCase()];
  if (!q || q > 4) {
    return null;
  }
  return `${m[2]}-T${q}`;
}

export function buildPmiSeries(rows: BrsRow[], scrapedAt = new Date().toISOString()): PmiSeriesItem[] {
  const entries: Array<{ date: string; item: PmiSeriesItem }> = [];
  for (const row of rows) {
    const text = `${row.title ?? ''} ${row.summary ?? ''}`;
    const value = parsePmiFromText(text);
    if (value === null) {
      continue;
    }
    const quarter = parseQuarterFromText(text);
    const date = (row.date ?? '').slice(0, 10);
    entries.push({
      date,
      item: {
        period: quarter || date || 'Tidak diketahui',
        pmi_value: value,
        category: 'PMI-BI (Prompt Manufacturing Index)',
        description: (row.title ?? '').slice(0, 300),
        // Sub-indices are not in the press-release text; emit zeros so the
        // chart's d.sub_indices?.output access stays type-safe and renders 0.
        sub_indices: { output: 0, new_orders: 0, employment: 0 },
        _source_url: row.link || row._source_url || 'https://www.bi.go.id/id/publikasi/laporan/default.aspx',
        _scraped_at: scrapedAt,
      },
    });
  }
  // Newest quarter first; within a quarter, the latest release wins (revision).
  entries.sort((a, b) => b.item.period.localeCompare(a.item.period) || b.date.localeCompare(a.date));
  const seen = new Set<string>();
  return entries
    .filter((entry) => (seen.has(entry.item.period) ? false : (seen.add(entry.item.period), true)))
    .map((entry) => entry.item);
}
