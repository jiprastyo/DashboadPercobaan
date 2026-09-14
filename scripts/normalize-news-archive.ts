/**
 * One-off (2026-09-14): rebuild historical-seed.json with collision-free
 * stable ids and without UI-dead fields. Dry-run by default; --write applies.
 * Run: npx tsx scripts/normalize-news-archive.ts          (report only)
 *      npx tsx scripts/normalize-news-archive.ts --write   (rewrite)
 */
import fs from 'fs';
import path from 'path';
import {
  normalizePublisherUrl,
  normalizeNewsTitle,
  slugifyId,
  shortHash,
  stableNewsId,
} from '../src/lib/news-quality';

const archivePath = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const shouldWrite = process.argv.includes('--write');
const DEAD_KEYS = ['summary', 'outlet', 'categories', 'kbli_sectors'];

const raw = JSON.parse(fs.readFileSync(archivePath, 'utf-8')) as Array<Record<string, unknown>>;
const before = Buffer.byteLength(JSON.stringify(raw));

const out = raw.map((row) => {
  const slim: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!DEAD_KEYS.includes(key)) slim[key] = value;
  }
  const url =
    normalizePublisherUrl(String(slim.resolved_url || '')) ||
    normalizePublisherUrl(String(slim._source_url || '')) ||
    normalizePublisherUrl(String(slim.link || ''));
  const day = String(slim.date || '').slice(0, 10);
  if (url && day) {
    slim.id = stableNewsId(url, day);
  } else {
    // No real publisher URL: fall back to title slug + hash (still unique).
    const titleSlug = slugifyId(normalizeNewsTitle(String(slim.title || ''))).slice(0, 72);
    slim.id = `daily-${titleSlug}-${day || 'undated'}-${shortHash(String(slim.title || '') + day)}`;
  }
  return slim;
});

const ids = out.map((r) => String(r.id));
if (new Set(ids).size !== ids.length) {
  throw new Error('rewrite still collides — aborting');
}
if (out.length !== raw.length) {
  throw new Error('record count changed — aborting');
}

const after = Buffer.byteLength(JSON.stringify(out, null, 2));
console.log(`rows: ${out.length} (unchanged)`);
console.log(`size: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB (pretty)`);
if (shouldWrite) {
  fs.writeFileSync(archivePath, `${JSON.stringify(out, null, 2)}\n`);
  console.log('written');
} else {
  console.log('dry-run only (pass --write to apply)');
}
