import fs from 'fs';
import path from 'path';
import { getBPSBRSArchive } from '../src/lib/data-loader-server';

const root = process.cwd();
const source = path.join(root, 'data', 'news', 'historical-seed.json');
const target = path.join(root, 'public', 'data', 'news', 'historical-seed.json');

if (!fs.existsSync(source)) {
  throw new Error(`Missing news archive source: ${source}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);

const sizeMb = fs.statSync(target).size / 1024 / 1024;
console.log(`Prepared static news archive (${sizeMb.toFixed(1)} MB)`);

// --- RSS feed (owner-approved scope 2026-09-14): newest 20 news + 20 BPS
// BRS press releases, merged by date -> public/feed.xml. Zero new deps,
// build-time only (static export invariant). ---
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://dashboardtakresmi.vercel.app';
const NEWS_LIMIT = 20;
const BRS_LIMIT = 20;

type Row = {
  id?: string;
  title?: string;
  date?: string;
  excerpt?: string;
  source_name?: string;
  resolved_url?: string;
  _source_url?: string;
  link?: string;
  keywords_matched?: string[];
  _kind?: 'berita' | 'brs';
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\s+/g, ' ')
    .trim();
}

const rows = JSON.parse(fs.readFileSync(source, 'utf-8')) as Row[];
// Archive is kept newest-first by the merge script; re-sort defensively.
const newsItems = rows
  .slice()
  .sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)))
  .slice(0, NEWS_LIMIT);

// BPS BRS press releases: reuse the build-time loader the /brs page itself
// uses — same committed JSON, no new source (guardrail g).
const brsArchive = getBPSBRSArchive();
const brsItems = brsArchive.releases
  .slice()
  .sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)))
  .slice(0, BRS_LIMIT)
  .map((release) => ({
    id: release.id,
    title: release.title,
    date: release.date,
    excerpt: release.summary,
    source_name: 'BPS (Berita Resmi Statistik)',
    resolved_url: release.link,
    keywords_matched: [release.indicatorLabel],
  }));

const items: Row[] = [
  ...newsItems.map((row): Row => ({ ...row, _kind: 'berita' })),
  ...brsItems.map((row): Row => ({ ...row, _kind: 'brs' })),
].sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)));

const channelItems = items
  .map((row) => {
    const link = row.resolved_url || row._source_url || row.link || `${SITE_ORIGIN}/berita/`;
    const pubDate = new Date(String(row.date)).toUTCString();
    const categories = (row.keywords_matched || [])
      .slice(0, 6)
      .map((keyword) => `      <category>${xmlEscape(keyword)}</category>`)
      .join('\n');
    const kindTag = row._kind === 'brs' ? ' [BRS]' : '';
    return `    <item>
      <title>${xmlEscape(String(row.title || 'Tanpa judul') + kindTag)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(String(row.id || link))}</guid>
      <pubDate>${pubDate}</pubDate>
      <source>${xmlEscape(String(row.source_name || ''))}</source>
      <description>${xmlEscape(String(row.excerpt || ''))}</description>
${categories}
    </item>`;
  })
  .join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Monitoring Tak Resmi — Berita &amp; Rilis Resmi Ketenagakerjaan</title>
    <link>${SITE_ORIGIN}/berita/</link>
    <description>Berita ketenagakerjaan Indonesia dari 30 outlet nasional dan daerah, plus Berita Resmi Statistik (BPS).</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>720</ttl>
${channelItems}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(root, 'public', 'feed.xml'), feed);
console.log(`Prepared RSS feed (${items.length} items: ${newsItems.length} berita + ${brsItems.length} BRS)`);
