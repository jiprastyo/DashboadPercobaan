/**
 * scripts/scrapers/bi-pmi.ts — Bank Indonesia PMI Scraper
 * Scrapes BI website for PMI (Purchasing Managers Index) survey data.
 */

import * as cheerio from 'cheerio';
import path from 'path';
import {
  BI_PMI,
  fetchWithRetry,
  log,
  timestamp,
  writeJSON,
  readJSON,
  ensureDir,
} from '../config';

interface PMIDataPoint {
  period: string;
  pmi_value: string;
  category: string;
  description: string;
  _source_url: string;
  _scraped_at: string;
}

async function scrapeBIPMI(): Promise<PMIDataPoint[]> {
  log('bi-pmi', 'Fetching BI PMI page');
  const dataPoints: PMIDataPoint[] = [];

  // Try the main PMI survey page
  try {
    const res = await fetchWithRetry(BI_PMI.baseUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    // BI pages often use tables for data
    $('table').each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];

      $table.find('thead th, tr:first-child th, tr:first-child td').each((_, th) => {
        headers.push($(th).text().trim());
      });

      $table.find('tbody tr, tr:not(:first-child)').each((_, row) => {
        const cells: string[] = [];
        $(row).find('td').each((_, td) => {
          cells.push($(td).text().trim());
        });

        if (cells.length >= 2) {
          dataPoints.push({
            period: cells[0] || '',
            pmi_value: cells[1] || '',
            category: headers.length > 1 ? headers[1] : 'PMI',
            description: cells.slice(2).join(' | '),
            _source_url: BI_PMI.baseUrl,
            _scraped_at: timestamp(),
          });
        }
      });
    });

    // Also extract data from text content / paragraphs
    const textBlocks: string[] = [];
    $('p, .content, .article-content').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        textBlocks.push(text);
      }
    });

    // Extract PMI values from text using regex
    const pmiRegex = /(?:pmi|purchasing\s*managers?\s*index)[^0-9]*(\d+[\.,]\d+)/gi;
    for (const block of textBlocks) {
      let match;
      while ((match = pmiRegex.exec(block)) !== null) {
        dataPoints.push({
          period: '',
          pmi_value: match[1].replace(',', '.'),
          category: 'PMI (dari teks)',
          description: block.slice(Math.max(0, match.index - 100), match.index + 100).trim(),
          _source_url: BI_PMI.baseUrl,
          _scraped_at: timestamp(),
        });
      }
    }

    // Also try to find links to PDF reports or detailed data
    const reportLinks: string[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().toLowerCase();
      if (
        (text.includes('pmi') || text.includes('survei') || text.includes('survey')) &&
        (href.includes('.pdf') || href.includes('download') || href.includes('laporan'))
      ) {
        const fullLink = href.startsWith('http') ? href : `https://www.bi.go.id${href}`;
        reportLinks.push(fullLink);
      }
    });

    if (reportLinks.length > 0) {
      log('bi-pmi', `Found ${reportLinks.length} report links`);
    }

    log('bi-pmi', `Extracted ${dataPoints.length} data points from main page`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('bi-pmi', `Error scraping main page: ${msg}`);
  }

  // Try alternate page for additional data
  try {
    const res = await fetchWithRetry(BI_PMI.alternateUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table').each((_, table) => {
      $(table).find('tbody tr').each((_, row) => {
        const cells: string[] = [];
        $(row).find('td').each((_, td) => {
          cells.push($(td).text().trim());
        });
        if (cells.length >= 2 && cells.some((c) => c.toLowerCase().includes('pmi'))) {
          dataPoints.push({
            period: cells[0] || '',
            pmi_value: cells[1] || '',
            category: 'PMI (alternate)',
            description: cells.join(' | '),
            _source_url: BI_PMI.alternateUrl,
            _scraped_at: timestamp(),
          });
        }
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('bi-pmi', `Error scraping alternate page: ${msg}`);
  }

  return dataPoints;
}

export async function runBIPMI(): Promise<{ total: number }> {
  log('bi-pmi', 'Starting BI PMI scraper');
  const dataPoints = await scrapeBIPMI();

  ensureDir(BI_PMI.dataDir);
  const outPath = path.join(BI_PMI.dataDir, 'series.json');

  // Merge with existing
  const existing = readJSON<PMIDataPoint[]>(outPath) || [];

  // Simple dedup by period + pmi_value
  const existingKeys = new Set(existing.map((e) => `${e.period}|${e.pmi_value}`));
  const newItems = dataPoints.filter((d) => !existingKeys.has(`${d.period}|${d.pmi_value}`));
  const merged = [...existing, ...newItems];

  writeJSON(outPath, merged);
  log('bi-pmi', `${newItems.length} new data points, ${merged.length} total`);

  return { total: merged.length };
}

// Run directly
if (require.main === module) {
  runBIPMI()
    .then((result) => {
      log('bi-pmi', `Done. ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      log('bi-pmi', `Fatal error: ${err}`);
      process.exit(1);
    });
}
