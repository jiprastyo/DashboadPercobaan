/**
 * scripts/ops/ops-logger.ts — Operational Logger
 * Wraps scraper execution with timing, captures metrics,
 * and maintains _metadata.json for last-fetch timestamps.
 */

import path from 'path';
import fs from 'fs';
import {
  OPS,
  DATA_DIR,
  METADATA_PATH,
  log,
  timestamp,
  todayStr,
  writeJSON,
  readJSON,
  ensureDir,
} from '../config';

export interface OpsLogEntry {
  scraper: string;
  status: 'success' | 'error' | 'partial';
  started_at: string;
  finished_at: string;
  latency_ms: number;
  items_fetched: number;
  items_new: number;
  errors: string[];
  _source_url: string;
  _scraped_at: string;
}

interface MetadataFile {
  lastUpdated: string;
  scrapers: Record<
    string,
    {
      lastFetch: string;
      lastStatus: string;
      lastLatencyMs: number;
      lastItemsFetched: number;
    }
  >;
}

/**
 * Wrap a scraper function with operational logging.
 */
export async function withOpsLog<T extends { total?: number; newItems?: number; [key: string]: unknown }>(
  scraperName: string,
  scraperFn: () => Promise<T>,
): Promise<{ result: T | null; logEntry: OpsLogEntry }> {
  const startedAt = timestamp();
  const startTime = performance.now();

  let result: T | null = null;
  let status: OpsLogEntry['status'] = 'success';
  const errors: string[] = [];
  let itemsFetched = 0;
  let itemsNew = 0;

  try {
    log('ops-logger', `Starting: ${scraperName}`);
    result = await scraperFn();

    // Extract metrics from result
    if (result) {
      // Try common patterns for item counts
      itemsFetched =
        (result.total as number) ??
        (result.totalArticles as number) ??
        (result.totalDataPoints as number) ??
        (result.countries as number) ??
        (result.keywords as number) ??
        0;

      itemsNew =
        (result.newItems as number) ??
        (result.successCount as number) ??
        (result.totalBatches as number) ??
        0;
    }

    // Check if partial success (some errors in the result)
    if (result && (result as Record<string, unknown>).error) {
      status = 'partial';
      errors.push(String((result as Record<string, unknown>).error));
    }

    log('ops-logger', `Completed: ${scraperName} — ${status}`);
  } catch (err: unknown) {
    status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    log('ops-logger', `Failed: ${scraperName} — ${msg}`);
  }

  const finishedAt = timestamp();
  const latencyMs = Math.round(performance.now() - startTime);

  const logEntry: OpsLogEntry = {
    scraper: scraperName,
    status,
    started_at: startedAt,
    finished_at: finishedAt,
    latency_ms: latencyMs,
    items_fetched: itemsFetched,
    items_new: itemsNew,
    errors,
    _source_url: `ops:${scraperName}`,
    _scraped_at: finishedAt,
  };

  // Append to daily ops log
  try {
    const today = todayStr();
    ensureDir(OPS.dataDir);
    const opsLogPath = path.join(OPS.dataDir, `${today}.json`);

    const existing = readJSON<OpsLogEntry[]>(opsLogPath) || [];
    existing.push(logEntry);
    writeJSON(opsLogPath, existing);
  } catch (logErr: unknown) {
    const msg = logErr instanceof Error ? logErr.message : String(logErr);
    log('ops-logger', `Failed to write ops log: ${msg}`);
  }

  // Update _metadata.json
  try {
    updateMetadata(scraperName, logEntry);
  } catch (metaErr: unknown) {
    const msg = metaErr instanceof Error ? metaErr.message : String(metaErr);
    log('ops-logger', `Failed to update metadata: ${msg}`);
  }

  log(
    'ops-logger',
    `${scraperName}: ${status} in ${latencyMs}ms (fetched=${itemsFetched}, new=${itemsNew})`,
  );

  return { result, logEntry };
}

function updateMetadata(scraperName: string, logEntry: OpsLogEntry): void {
  ensureDir(DATA_DIR);

  let metadata: MetadataFile;
  if (fs.existsSync(METADATA_PATH)) {
    metadata = readJSON<MetadataFile>(METADATA_PATH) || {
      lastUpdated: '',
      scrapers: {},
    };
  } else {
    metadata = { lastUpdated: '', scrapers: {} };
  }

  metadata.lastUpdated = timestamp();
  metadata.scrapers[scraperName] = {
    lastFetch: logEntry.finished_at,
    lastStatus: logEntry.status,
    lastLatencyMs: logEntry.latency_ms,
    lastItemsFetched: logEntry.items_fetched,
  };

  writeJSON(METADATA_PATH, metadata);
}

/**
 * Get a summary of the latest ops data
 */
export function getOpsSummary(): {
  today: OpsLogEntry[];
  metadata: MetadataFile | null;
} {
  const today = todayStr();
  const opsLogPath = path.join(OPS.dataDir, `${today}.json`);
  const todayLogs = readJSON<OpsLogEntry[]>(opsLogPath) || [];
  const metadata = readJSON<MetadataFile>(METADATA_PATH) || null;
  return { today: todayLogs, metadata };
}

// Run standalone to view today's ops log
if (require.main === module) {
  const summary = getOpsSummary();
  console.log('\n=== Ops Summary ===');
  console.log(`Today's entries: ${summary.today.length}`);
  for (const entry of summary.today) {
    console.log(
      `  ${entry.scraper}: ${entry.status} (${entry.latency_ms}ms, ${entry.items_fetched} items)`,
    );
    if (entry.errors.length > 0) {
      console.log(`    Errors: ${entry.errors.join('; ')}`);
    }
  }
  if (summary.metadata) {
    console.log(`\nLast updated: ${summary.metadata.lastUpdated}`);
    for (const [name, info] of Object.entries(summary.metadata.scrapers)) {
      console.log(`  ${name}: ${info.lastStatus} at ${info.lastFetch}`);
    }
  }
}
