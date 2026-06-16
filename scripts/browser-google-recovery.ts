import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';

const HISTORICAL_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');
const CHECKPOINT_EVERY = Number(process.env.CHECKPOINT_EVERY || '5');
const SAMPLE_LIMIT = Number(process.env.SAMPLE_LIMIT || '0');
const SAMPLE_OFFSET = Number(process.env.SAMPLE_OFFSET || '0');
const NAVIGATION_TIMEOUT_MS = Number(process.env.NAVIGATION_TIMEOUT_MS || '20000');
const PAGE_SETTLE_MS = Number(process.env.PAGE_SETTLE_MS || '2000');
const BROWSER_STARTUP_TIMEOUT_MS = Number(process.env.BROWSER_STARTUP_TIMEOUT_MS || '15000');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || '500');
const BROWSER_HEADLESS = process.env.BROWSER_HEADLESS !== '0';
const BROWSER_EXECUTABLE = process.env.BROWSER_EXECUTABLE || '';
const USER_AGENT =
  process.env.BROWSER_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const GENERIC_TITLE_PATTERNS = [
  /Media Nasional Berjejaring/iu,
  /Terbaru dan Terupdate/iu,
  /Paling Mengerti/iu,
  /\bHalaman \d+\b/iu,
  /^Kapitalisasi Pasar/iu,
  /^Data .+ Databoks/iu,
  /^Kr Jogja/iu,
  /^Sofi Wulandari\b/iu,
];

const MONTH_LOOKUP: Record<string, string> = {
  january: '01',
  jan: '01',
  januari: '01',
  februari: '02',
  february: '02',
  feb: '02',
  maret: '03',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  june: '06',
  jun: '06',
  juli: '07',
  july: '07',
  jul: '07',
  agustus: '08',
  august: '08',
  agu: '08',
  agt: '08',
  aug: '08',
  september: '09',
  sept: '09',
  sep: '09',
  oktober: '10',
  october: '10',
  okt: '10',
  oct: '10',
  november: '11',
  nov: '11',
  desember: '12',
  december: '12',
  des: '12',
  dec: '12',
};

const TIMEZONE_LOOKUP: Record<string, string> = {
  WIB: '+07:00',
  WITA: '+08:00',
  WIT: '+09:00',
  UTC: 'Z',
  GMT: '+00:00',
};

const DATE_PREFIX_PATTERN =
  /^(senin|selasa|rabu|kamis|jumat|jum'at|jumâ€™at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+/iu;
const DATE_LABEL_PATTERN =
  /^(dipublikasikan|diterbitkan|diperbarui|published|publish date|publish|posted|tanggal|date)\s*:?\s+/iu;

type HistoricalArticle = {
  id: string;
  title: string;
  date: string;
  source: string;
  source_name: string;
  excerpt: string;
  sector_tags?: string[];
  keywords_matched?: string[];
  _source_url: string;
  _scraped_at: string;
  is_estimated?: boolean;
  resolved_url?: string;
  published_at?: string;
  date_source?: 'original_feed' | 'article_metadata' | 'fallback_estimate';
  date_checked_at?: string;
};

type RecoveryStats = {
  processed: number;
  verified: number;
  changed: number;
  resolvedOnly: number;
  skipped: number;
  errors: number;
};

type PageMetadata = {
  finalUrl: string;
  documentTitle: string;
  heading: string;
  ogTitle: string;
  textSnippet: string;
  candidates: string[];
  jsonLdScripts: string[];
};

type MatchDecision = {
  accepted: boolean;
  score: number;
  reason: string;
};

function log(message: string) {
  console.log(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadArticles(): HistoricalArticle[] {
  return JSON.parse(fs.readFileSync(HISTORICAL_FILE, 'utf8')) as HistoricalArticle[];
}

function saveArticles(rows: HistoricalArticle[]) {
  fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(rows, null, 2));
}

function normalizeComparableTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+-\s+[^-]+$/u, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingSourceFromTitle(value: string): string {
  return value.replace(/\s+-\s+[^-]+$/u, '').replace(/\s+/g, ' ').trim();
}

function titleSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeComparableTitle(left).split(' ').filter((token) => token.length > 2));
  const rightTokens = new Set(normalizeComparableTitle(right).split(' ').filter((token) => token.length > 2));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

function normalizeDateWhitespace(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function padDatePart(value: string | undefined, size = 2): string {
  return (value || '').padStart(size, '0');
}

function timezoneToOffset(value?: string): string {
  if (!value) {
    return 'Z';
  }

  return TIMEZONE_LOOKUP[value.toUpperCase()] || 'Z';
}

function buildIsoDate(
  year: string,
  month: string,
  day: string,
  hour = '00',
  minute = '00',
  second = '00',
  timezone?: string
): string | null {
  const isoCandidate = `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(hour)}:${padDatePart(minute)}:${padDatePart(second)}${timezoneToOffset(timezone)}`;
  const parsed = new Date(isoCandidate);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseStructuredDateCandidate(input: string): string | null {
  const candidate = normalizeDateWhitespace(input)
    .replace(DATE_PREFIX_PATTERN, '')
    .replace(DATE_LABEL_PATTERN, '')
    .replace(/\s+\|\s+/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!candidate) {
    return null;
  }

  const yearMonthDay = candidate.match(
    /(?<!\d)(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})(?:[T\s,|]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (yearMonthDay) {
    return buildIsoDate(
      yearMonthDay[1],
      yearMonthDay[2],
      yearMonthDay[3],
      yearMonthDay[4],
      yearMonthDay[5],
      yearMonthDay[6],
      yearMonthDay[7]
    );
  }

  const dayMonthYear = candidate.match(
    /(?<!\d)(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})(?:[^\dA-Za-z]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (dayMonthYear) {
    const month = MONTH_LOOKUP[dayMonthYear[2].toLowerCase().replace(/\./g, '')];
    if (month) {
      return buildIsoDate(
        dayMonthYear[3],
        month,
        dayMonthYear[1],
        dayMonthYear[4],
        dayMonthYear[5],
        dayMonthYear[6],
        dayMonthYear[7]
      );
    }
  }

  const monthDayYear = candidate.match(
    /([A-Za-zÀ-ÿ.]+)\s+(\d{1,2}),?\s+(\d{4})(?:[^\dA-Za-z]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (monthDayYear) {
    const month = MONTH_LOOKUP[monthDayYear[1].toLowerCase().replace(/\./g, '')];
    if (month) {
      return buildIsoDate(
        monthDayYear[3],
        month,
        monthDayYear[2],
        monthDayYear[4],
        monthDayYear[5],
        monthDayYear[6],
        monthDayYear[7]
      );
    }
  }

  const daySlashMonthSlashYear = candidate.match(
    /(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T\s,|]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT|UTC|GMT)?)?/iu
  );
  if (daySlashMonthSlashYear) {
    return buildIsoDate(
      daySlashMonthSlashYear[3],
      daySlashMonthSlashYear[2],
      daySlashMonthSlashYear[1],
      daySlashMonthSlashYear[4],
      daySlashMonthSlashYear[5],
      daySlashMonthSlashYear[6],
      daySlashMonthSlashYear[7]
    );
  }

  return null;
}

function normalizeDateString(value: string): string | null {
  const structured = parseStructuredDateCandidate(value);
  if (structured) {
    return structured;
  }

  const parsed = new Date(normalizeDateWhitespace(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractFromJsonLd(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    const preferredKeys = ['datePublished', 'uploadDate', 'dateCreated'];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      const record = current as Record<string, unknown>;

      for (const key of preferredKeys) {
        if (typeof record[key] === 'string') {
          return record[key] as string;
        }
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractPublishedDate(page: PageMetadata): string | null {
  for (const candidate of page.candidates) {
    const normalized = normalizeDateString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  for (const raw of page.jsonLdScripts) {
    const extracted = extractFromJsonLd(raw);
    if (!extracted) {
      continue;
    }

    const normalized = normalizeDateString(extracted);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function isGoogleNewsArticleUrl(value?: string): boolean {
  return Boolean(value && /https?:\/\/news\.google\.com\/rss\/articles\//iu.test(value));
}

function isLikelyHomepage(finalUrl: string): boolean {
  try {
    const parsed = new URL(finalUrl);
    return parsed.pathname === '/' && !parsed.search && !parsed.hash;
  } catch {
    return true;
  }
}

function chooseBrowserExecutable(): string {
  if (BROWSER_EXECUTABLE) {
    return BROWSER_EXECUTABLE;
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('No supported Chromium browser executable was found.');
}

function shouldTargetArticle(article: HistoricalArticle): boolean {
  if (!article.is_estimated) {
    return false;
  }

  if (!isGoogleNewsArticleUrl(article._source_url)) {
    return false;
  }

  if (article.resolved_url && !isGoogleNewsArticleUrl(article.resolved_url)) {
    return false;
  }

  return !GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(article.title || ''));
}

function buildTargetIndices(rows: HistoricalArticle[]) {
  const indices = rows
    .map((article, index) => ({ article, index }))
    .filter(({ article }) => shouldTargetArticle(article))
    .map(({ index }) => index);

  if (SAMPLE_OFFSET > 0) {
    return indices.slice(SAMPLE_OFFSET, SAMPLE_LIMIT > 0 ? SAMPLE_OFFSET + SAMPLE_LIMIT : undefined);
  }

  if (SAMPLE_LIMIT > 0) {
    return indices.slice(0, SAMPLE_LIMIT);
  }

  return indices;
}

function evaluatePageMatch(article: HistoricalArticle, page: PageMetadata): MatchDecision {
  if (
    /^sorry\.\.\.$/iu.test(page.documentTitle) ||
    /sending automated queries/iu.test(page.textSnippet)
  ) {
    return { accepted: false, score: 0, reason: 'google_sorry' };
  }

  const candidates = [page.documentTitle, page.heading, page.ogTitle].filter(Boolean);
  const sourceStrippedTitle = stripTrailingSourceFromTitle(article.title);
  const scores = candidates.map((candidate) => titleSimilarity(sourceStrippedTitle, candidate));
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  if (!page.finalUrl || isGoogleNewsArticleUrl(page.finalUrl)) {
    return { accepted: false, score: bestScore, reason: 'still_on_google' };
  }

  if (isLikelyHomepage(page.finalUrl)) {
    return { accepted: false, score: bestScore, reason: 'homepage_redirect' };
  }

  if (bestScore >= 0.45) {
    return { accepted: true, score: bestScore, reason: 'strong_title_match' };
  }

  if (bestScore >= 0.28) {
    return { accepted: true, score: bestScore, reason: 'usable_title_match' };
  }

  return { accepted: false, score: bestScore, reason: 'low_title_similarity' };
}

async function pickFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not determine a free local port.')));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Request to ${url} failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

type DebugTarget = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

class CdpClient {
  private ws: WebSocket | null = null;
  private nextId = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  constructor(private readonly websocketUrl: string) {}

  async connect() {
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.websocketUrl);
      this.ws = socket;

      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error('Could not connect to the browser debugging socket.')), { once: true });
      socket.addEventListener('close', () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error('Browser debugging socket closed.'));
        }
        this.pending.clear();
      });
      socket.addEventListener('message', (event) => {
        const payload = JSON.parse(String(event.data)) as {
          id?: number;
          result?: any;
          error?: { message?: string };
        };

        if (!payload.id) {
          return;
        }

        const pending = this.pending.get(payload.id);
        if (!pending) {
          return;
        }

        this.pending.delete(payload.id);

        if (payload.error) {
          pending.reject(new Error(payload.error.message || 'Unknown CDP error.'));
          return;
        }

        pending.resolve(payload.result);
      });
    });
  }

  async close() {
    if (!this.ws) {
      return;
    }

    const socket = this.ws;
    this.ws = null;

    await new Promise<void>((resolve) => {
      socket.addEventListener('close', () => resolve(), { once: true });
      socket.close();
    });
  }

  async send(method: string, params: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
      throw new Error('Browser debugging socket is not open.');
    }

    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });

    const result = await new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(payload);
    });

    return result;
  }

  async evaluate<T>(expression: string): Promise<T> {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result?.exceptionDetails) {
      throw new Error('Browser evaluation raised an exception.');
    }

    return result?.result?.value as T;
  }
}

class BrowserRecoverySession {
  private browserProcess: ChildProcess | null = null;
  private client: CdpClient | null = null;
  private profileDir = '';
  private port = 0;
  private executable = '';

  async start() {
    this.executable = chooseBrowserExecutable();
    this.port = await pickFreePort();
    this.profileDir = path.join(process.cwd(), 'scratch', `browser-google-recovery-profile-${Date.now()}`);
    fs.mkdirSync(this.profileDir, { recursive: true });

    const args = [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-popup-blocking',
      '--disable-notifications',
      '--disable-extensions',
      '--window-size=1280,900',
      'about:blank',
    ];

    if (BROWSER_HEADLESS) {
      args.unshift('--headless=new');
    }

    this.browserProcess = spawn(this.executable, args, {
      stdio: 'ignore',
      windowsHide: true,
    });

    const startedAt = Date.now();
    let targets: DebugTarget[] = [];

    while (Date.now() - startedAt < BROWSER_STARTUP_TIMEOUT_MS) {
      try {
        targets = await fetchJsonWithTimeout<DebugTarget[]>(
          `http://127.0.0.1:${this.port}/json/list`,
          3000
        );
      } catch {
        await sleep(300);
        continue;
      }

      const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (!pageTarget?.webSocketDebuggerUrl) {
        await sleep(300);
        continue;
      }

      this.client = new CdpClient(pageTarget.webSocketDebuggerUrl);
      await this.client.connect();
      await this.client.send('Page.enable');
      await this.client.send('Runtime.enable');
      await this.client.send('Network.enable');
      await this.client.send('Network.setUserAgentOverride', { userAgent: USER_AGENT });
      await this.client.send('Network.setBlockedURLs', {
        urls: ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.svg', '*.woff', '*.woff2', '*.ttf', '*.mp4', '*.webm'],
      });
      return;
    }

    throw new Error('Timed out while waiting for the browser debugging endpoint.');
  }

  async stop() {
    if (this.client) {
      await this.client.close().catch(() => {});
      this.client = null;
    }

    if (this.browserProcess && !this.browserProcess.killed) {
      this.browserProcess.kill();
    }
    this.browserProcess = null;

    if (this.profileDir) {
      fs.rmSync(this.profileDir, { recursive: true, force: true });
      this.profileDir = '';
    }
  }

  describe() {
    return `${path.basename(this.executable)} | port=${this.port} | headless=${BROWSER_HEADLESS ? 'yes' : 'no'}`;
  }

  async navigateAndExtract(sourceUrl: string): Promise<PageMetadata> {
    if (!this.client) {
      throw new Error('Browser session is not ready.');
    }

    await this.client.send('Page.navigate', { url: sourceUrl });
    await this.waitForSettledPage();

    return await this.client.evaluate<PageMetadata>(`(() => {
      const unique = new Set();
      const candidates = [];
      const selectors = [
        'meta[property="article:published_time"]',
        'meta[property="og:article:published_time"]',
        'meta[property="og:published_time"]',
        'meta[property="article:published"]',
        'meta[name="article:published_time"]',
        'meta[name="article.published"]',
        'meta[name="publishdate"]',
        'meta[name="publish-date"]',
        'meta[name="pubdate"]',
        'meta[name="datePublished"]',
        'meta[name="parsely-pub-date"]',
        'meta[name="cXenseParse:publishtime"]',
        'meta[name="sailthru.date"]',
        'meta[name="dc.date"]',
        'meta[property="dc:date"]',
        'meta[property="bt:pubDate"]',
        'meta[name="date"]',
        'meta[itemprop="datePublished"]',
        '[itemprop="datePublished"]',
        'time[datetime]',
        'article time',
        'main time',
        '.article-date',
        '.post-date',
        '.entry-date',
        '.published',
        '.updated'
      ];

      const pushCandidate = (value) => {
        const text = typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '';
        if (!text || text.length > 200 || unique.has(text)) {
          return;
        }
        unique.add(text);
        candidates.push(text);
      };

      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector)).slice(0, 3);
        for (const node of nodes) {
          pushCandidate(node.getAttribute('content'));
          pushCandidate(node.getAttribute('datetime'));
          pushCandidate(node.textContent);
        }
      }

      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .slice(0, 20)
        .map((node) => node.textContent || '')
        .filter(Boolean);

      const firstHeading = document.querySelector('h1')?.textContent || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

      return {
        finalUrl: location.href,
        documentTitle: document.title || '',
        heading: firstHeading.replace(/\\s+/g, ' ').trim(),
        ogTitle: ogTitle.replace(/\\s+/g, ' ').trim(),
        textSnippet: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 600),
        candidates,
        jsonLdScripts
      };
    })()`);
  }

  private async waitForSettledPage() {
    if (!this.client) {
      throw new Error('Browser session is not ready.');
    }

    let lastUrl = '';
    let lastChangedAt = Date.now();
    const startedAt = Date.now();

    while (Date.now() - startedAt < NAVIGATION_TIMEOUT_MS) {
      let snapshot: { href: string; readyState: string } | null = null;

      try {
        snapshot = await this.client.evaluate<{ href: string; readyState: string }>(`(() => ({
          href: location.href,
          readyState: document.readyState
        }))()`);
      } catch {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (snapshot.href !== lastUrl) {
        lastUrl = snapshot.href;
        lastChangedAt = Date.now();
      }

      if (snapshot.readyState === 'complete' && Date.now() - lastChangedAt >= PAGE_SETTLE_MS) {
        return;
      }

      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function printSavedCounts(rows: HistoricalArticle[], label: string) {
  const estimated = rows.filter((row) => row.is_estimated).length;
  const verified = rows.filter((row) => row.date_source && row.date_source !== 'fallback_estimate').length;
  const resolved = rows.filter((row) => row.resolved_url).length;
  log(`${label}: estimated=${estimated} | verified=${verified} | resolved=${resolved}`);
}

async function main() {
  const rows = loadArticles();
  const targetIndices = buildTargetIndices(rows);

  log(`Estimated dates remaining before backfill: ${rows.filter((row) => row.is_estimated).length}`);
  log(`Target rows for browser recovery: ${targetIndices.length}`);

  if (targetIndices.length === 0) {
    log('No browser-recovery targets matched the current filters.');
    return;
  }

  const session = new BrowserRecoverySession();
  const stats: RecoveryStats = {
    processed: 0,
    verified: 0,
    changed: 0,
    resolvedOnly: 0,
    skipped: 0,
    errors: 0,
  };

  let dirtySinceLastSave = false;
  let googleSorryHits = 0;

  try {
    await session.start();
    log(`Browser session: ${session.describe()}`);

    for (const rowIndex of targetIndices) {
      const article = rows[rowIndex];
      const checkedAt = new Date().toISOString();

      try {
        const page = await session.navigateAndExtract(article._source_url);
        const decision = evaluatePageMatch(article, page);

        if (!decision.accepted) {
          stats.skipped += 1;
          if (decision.reason === 'google_sorry') {
            googleSorryHits += 1;
          }
          log(
            `Skipped ${article.id} | score=${decision.score.toFixed(2)} | reason=${decision.reason} | url=${page.finalUrl || 'n/a'}`
          );
        } else {
          googleSorryHits = 0;
          let changed = false;
          let verified = false;
          const publishedAt = extractPublishedDate(page);

          if (page.finalUrl && page.finalUrl !== article.resolved_url) {
            rows[rowIndex].resolved_url = page.finalUrl;
            changed = true;
          }

          if (publishedAt) {
            rows[rowIndex].date = publishedAt;
            rows[rowIndex].published_at = publishedAt;
            rows[rowIndex].is_estimated = false;
            rows[rowIndex].date_source = 'article_metadata';
            verified = true;
            changed = true;
          }

          if (changed) {
            rows[rowIndex].date_checked_at = checkedAt;
            stats.changed += 1;
            dirtySinceLastSave = true;
          }

          if (verified) {
            stats.verified += 1;
          } else if (changed) {
            stats.resolvedOnly += 1;
          }

          if (changed) {
            log(
              `${verified ? 'Verified' : 'Resolved'} ${article.id} | score=${decision.score.toFixed(2)} | url=${page.finalUrl}`
            );
          } else {
            stats.skipped += 1;
            log(
              `No usable update for ${article.id} | score=${decision.score.toFixed(2)} | url=${page.finalUrl || 'n/a'}`
            );
          }
        }
      } catch (error) {
        stats.errors += 1;
        log(
          `Error ${article.id} | ${(error as Error).message.replace(/\s+/g, ' ').trim()}`
        );
      }

      stats.processed += 1;
      log(`Processed ${stats.processed}/${targetIndices.length} | verified=${stats.verified} | changed=${stats.changed}`);

      if (googleSorryHits >= 3 && stats.changed === 0) {
        log('Google anti-bot page detected repeatedly. Stopping early to avoid wasting requests from this local browser/profile.');
        break;
      }

      if (dirtySinceLastSave && stats.processed % CHECKPOINT_EVERY === 0) {
        saveArticles(rows);
        dirtySinceLastSave = false;
        log(`Checkpoint saved at ${stats.processed}`);
      }
    }
  } finally {
    if (dirtySinceLastSave) {
      saveArticles(rows);
      log(`Checkpoint saved at ${stats.processed}`);
    }

    await session.stop().catch(() => {});
  }

  printSavedCounts(rows, 'Saved totals after browser recovery');
  log(`Browser recovery summary: processed=${stats.processed} | verified=${stats.verified} | changed=${stats.changed} | resolved_only=${stats.resolvedOnly} | skipped=${stats.skipped} | errors=${stats.errors}`);
  log(`Estimated dates remaining after backfill: ${rows.filter((row) => row.is_estimated).length}`);
}

main().catch((error) => {
  console.error((error as Error).stack || (error as Error).message);
  process.exitCode = 1;
});
