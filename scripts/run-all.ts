/**
 * scripts/run-all.ts — Master Orchestrator
 * Accepts --tier flag: daily, weekly, monthly, all
 * Runs scrapers in the appropriate tier, wrapped with ops-logger.
 */

import { execSync } from 'child_process';
import path from 'path';
import { log, timestamp, TIERS } from './config';
import { withOpsLog } from './ops/ops-logger';

// ─── Scraper imports (lazy loaded) ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runScraper(name: string): Promise<Record<string, any>> {
  switch (name) {
    case 'setkab': {
      const { scrapeSetkab } = await import('./scrapers/setkab');
      return scrapeSetkab();
    }
    case 'news-aggregator': {
      const { scrapeNews } = await import('./scrapers/news-aggregator');
      return scrapeNews();
    }
    case 'gemini-summarize': {
      const { runGeminiSummarize } = await import('./summarizer/gemini-summarize');
      return runGeminiSummarize();
    }
    case 'bps-html': {
      const { scrapeBPS } = await import('./scrapers/bps-html');
      return scrapeBPS();
    }
    case 'kemenaker': {
      const { scrapeKemenaker } = await import('./scrapers/kemenaker');
      return scrapeKemenaker();
    }
    case 'google-trends-node': {
      const { scrapeGoogleTrendsNode } = await import('./scrapers/google-trends-node');
      return scrapeGoogleTrendsNode();
    }
    case 'google-trends-py': {
      // Run Python script via child_process
      return runPythonTrends();
    }
    case 'bi-pmi': {
      const { runBIPMI } = await import('./scrapers/bi-pmi');
      return runBIPMI();
    }
    case 'asean-nso': {
      const { scrapeASEANNSO } = await import('./scrapers/asean-nso');
      return scrapeASEANNSO();
    }
    case 'asean-fallback': {
      const { scrapeASEANFallback } = await import('./scrapers/asean-fallback');
      return scrapeASEANFallback();
    }
    default:
      throw new Error(`Unknown scraper: ${name}`);
  }
}

function runPythonTrends(): Promise<{ total: number; newItems: number }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scrapers', 'google-trends-py.py');
    try {
      log('run-all', `Running Python script: ${scriptPath}`);
      const output = execSync(`python "${scriptPath}"`, {
        encoding: 'utf-8',
        timeout: 120_000, // 2 minute timeout
        cwd: path.dirname(scriptPath),
      });
      console.log(output);
      resolve({ total: 1, newItems: 1 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('run-all', `Python script error: ${msg}`);
      reject(new Error(`Python trends script failed: ${msg}`));
    }
  });
}

// ─── Parse arguments ─────────────────────────────────────────────────────────
function parseTier(): string[] {
  const args = process.argv.slice(2);
  let tier = 'all';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tier' && args[i + 1]) {
      tier = args[i + 1].toLowerCase();
    }
  }

  switch (tier) {
    case 'daily':
      return TIERS.daily;
    case 'weekly':
      return TIERS.weekly;
    case 'monthly':
      return TIERS.monthly;
    case 'all':
      return [...TIERS.daily, ...TIERS.weekly, ...TIERS.monthly];
    default:
      log('run-all', `Unknown tier: ${tier}, running all`);
      return [...TIERS.daily, ...TIERS.weekly, ...TIERS.monthly];
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const scrapers = parseTier();
  const tier = process.argv.find((_, i, arr) => arr[i - 1] === '--tier') || 'all';

  log('run-all', `=== Starting orchestrator (tier: ${tier}) ===`);
  log('run-all', `Scrapers to run: ${scrapers.join(', ')}`);
  log('run-all', `Started at: ${timestamp()}`);

  const results: Array<{
    name: string;
    status: string;
    latencyMs: number;
    itemsFetched: number;
  }> = [];

  for (const scraperName of scrapers) {
    log('run-all', `\n--- Running: ${scraperName} ---`);

    const { logEntry } = await withOpsLog(scraperName, () => runScraper(scraperName));

    results.push({
      name: scraperName,
      status: logEntry.status,
      latencyMs: logEntry.latency_ms,
      itemsFetched: logEntry.items_fetched,
    });

    if (logEntry.errors.length > 0) {
      log('run-all', `  Errors: ${logEntry.errors.join('; ')}`);
    }
  }

  // Print summary
  log('run-all', '\n=== Orchestrator Summary ===');
  const tableRows = results.map((r) => ({
    Scraper: r.name,
    Status: r.status,
    'Latency (ms)': r.latencyMs,
    'Items Fetched': r.itemsFetched,
  }));
  console.table(tableRows);

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const partialCount = results.filter((r) => r.status === 'partial').length;

  log(
    'run-all',
    `Total: ${results.length} | Success: ${successCount} | Partial: ${partialCount} | Error: ${errorCount}`,
  );
  log('run-all', `Finished at: ${timestamp()}`);

  // Exit with error code if any scrapers failed completely
  if (errorCount === results.length) {
    process.exit(1);
  }
}

// Load .env.local
try {
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
} catch {
  // ignore
}

main().catch((err) => {
  log('run-all', `Fatal orchestrator error: ${err}`);
  process.exit(1);
});
