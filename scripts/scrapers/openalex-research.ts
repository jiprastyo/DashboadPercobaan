import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { delay, fetchWithRetry, log } from '../config';

const DATA_DIR = path.join(process.cwd(), 'data', 'research');
const SCHOLAR_FILE = path.join(DATA_DIR, 'scholar.json');
const OPENALEX_BASE_URL = 'https://api.openalex.org/works';
const MIN_PUBLISH_YEAR = 2019;
const CURRENT_DATE = new Date().toISOString().slice(0, 10);
const CURRENT_YEAR = Number(CURRENT_DATE.slice(0, 4));
const FROM_YEAR = Number(process.env.OPENALEX_FROM_YEAR || CURRENT_YEAR);
const RESULTS_PER_QUERY_YEAR = 8;
const MAX_OPENALEX_FINDINGS = 120;

const OPENALEX_QUERIES = [
  'Sakernas Indonesia labor force survey',
  'Survei Angkatan Kerja Nasional Indonesia',
  'Indonesia labor market unemployment',
  'Indonesia youth unemployment NEET',
  'Indonesia informal employment gig economy',
  'Indonesia green jobs employment transition',
  'Indonesia minimum wage labor market',
  'Indonesia social protection employment BPJS',
  'Indonesia vocational education skills mismatch unemployment',
  'Indonesia female labor force participation',
  'Indonesia platform work labor',
  'Indonesian labor force survey employment',
  'ketenagakerjaan Indonesia pengangguran',
  'pengangguran usia muda Indonesia',
  'pekerja informal Indonesia',
  'ekonomi gig Indonesia pekerja',
  'upah minimum Indonesia tenaga kerja',
  'jaminan sosial ketenagakerjaan Indonesia',
  'lapangan kerja Indonesia transisi hijau',
];

const TOPIC_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'Sakernas', patterns: [/\bsakernas\b/i, /survei angkatan kerja nasional/i, /labor force survey/i] },
  { tag: 'Youth Unemployment', patterns: [/youth unemployment/i, /pengangguran pemuda/i, /pengangguran usia muda/i] },
  { tag: 'Gig Economy', patterns: [/\bgig economy\b/i, /platform work/i, /pekerja gig/i, /ojek online/i] },
  { tag: 'Green Jobs', patterns: [/\bgreen jobs?\b/i, /green econom/i, /transisi hijau/i, /just transition/i] },
  { tag: 'NEET', patterns: [/\bneet\b/i, /not in employment,? education,? or training/i] },
  { tag: 'Informal Sector', patterns: [/informal employment/i, /informal sector/i, /pekerja informal/i] },
  { tag: 'Skills Mismatch', patterns: [/skills mismatch/i, /skill mismatch/i, /\bsmk\b/i, /vocational/i] },
  { tag: 'Working Hours', patterns: [/working hours/i, /jam kerja/i, /overwork/i, /time use/i] },
  { tag: 'Social Protection', patterns: [/social protection/i, /jaminan sosial/i, /bpjs/i, /\bjkp\b/i] },
  { tag: 'Minimum Wage', patterns: [/minimum wage/i, /upah minimum/i, /\bump\b/i, /\bumk\b/i] },
  { tag: 'Labor Force Participation', patterns: [/labor force participation/i, /\btpak\b/i, /partisipasi angkatan kerja/i] },
  { tag: 'PHK', patterns: [/\bphk\b/i, /layoff/i, /job loss/i, /pemutusan hubungan kerja/i] },
];

interface ResearchFinding {
  id: string;
  title: string;
  source: string;
  dateRange: string;
  publishDate?: string;
  summary: string;
  tags: string[];
  link?: string;
  doi?: string;
}

interface OpenAlexWork {
  id: string;
  display_name?: string;
  title?: string;
  publication_year?: number;
  publication_date?: string;
  doi?: string | null;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      display_name?: string | null;
    } | null;
  } | null;
  best_oa_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      display_name?: string | null;
    } | null;
  } | null;
  locations?: Array<{
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      display_name?: string | null;
    } | null;
  }>;
  authorships?: Array<{
    institutions?: Array<{
      country_code?: string | null;
      display_name?: string | null;
    }>;
  }>;
}

interface CrossrefWorkMessage {
  title?: string[];
  URL?: string;
  publisher?: string;
  'container-title'?: string[];
}

const crossrefCache = new Map<string, CrossrefWorkMessage | null>();
const linkValidationCache = new Map<string, boolean>();

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\uFFFD/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function normalizeTitle(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId(title: string, publishDate: string, link: string): string {
  return `openalex-${crypto
    .createHash('md5')
    .update(`${normalizeTitle(title)}|${publishDate}|${link}`)
    .digest('hex')
    .slice(0, 10)}`;
}

function reconstructAbstract(index?: Record<string, number[]>): string {
  if (!index) {
    return '';
  }

  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words[position] = word;
    }
  }

  return normalizeText(words.filter(Boolean).join(' '));
}

function compactAbstract(abstract: string): string {
  if (!abstract) {
    return 'OpenAlex metadata entry for a 2019+ academic work related to Indonesia labor-market issues.';
  }

  const sentences = abstract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 2).join(' ').slice(0, 520);
}

function hasIndonesiaSignal(text: string): boolean {
  return /\bindonesia(n)?\b/i.test(text) || /\bsakernas\b/i.test(text) || /survei angkatan kerja nasional/i.test(text);
}

function hasLaborSignal(text: string): boolean {
  return [
    /labor|labour|employment|unemployment|workforce|worker|wage|job|neet/i,
    /ketenagakerjaan|tenaga kerja|pengangguran|pekerja|buruh|upah|lapangan kerja|angkatan kerja/i,
    /gig economy|informal|vocational|skills mismatch|green jobs|social protection/i,
  ].some((pattern) => pattern.test(text));
}

function buildTags(work: OpenAlexWork, haystack: string): string[] {
  const topicTags = TOPIC_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(haystack)))
    .map((rule) => rule.tag);

  const hasIndonesianInstitution = work.authorships?.some((authorship) =>
    authorship.institutions?.some((institution) => institution.country_code === 'ID'),
  );

  return Array.from(
    new Set([
      'OpenAlex',
      hasIndonesianInstitution ? 'National Paper' : 'International Paper',
      ...topicTags,
    ]),
  );
}

function getSource(work: OpenAlexWork): string {
  const source =
    work.best_oa_location?.source?.display_name ||
    work.primary_location?.source?.display_name ||
    work.locations?.find((location) => location.source?.display_name)?.source?.display_name;

  return normalizeText(source || 'OpenAlex indexed research');
}

function getLink(work: OpenAlexWork): string {
  const openAccessPdf =
    work.best_oa_location?.pdf_url ||
    work.primary_location?.pdf_url ||
    work.locations?.find((location) => location.pdf_url)?.pdf_url;

  if (openAccessPdf) {
    return openAccessPdf;
  }

  if (work.doi) {
    return work.doi.startsWith('http') ? work.doi : `https://doi.org/${work.doi}`;
  }

  return (
    work.best_oa_location?.landing_page_url ||
    work.primary_location?.landing_page_url ||
    work.locations?.find((location) => location.landing_page_url)?.landing_page_url ||
    work.id
  );
}

function getCandidateLinks(work: OpenAlexWork): string[] {
  return Array.from(
    new Set(
      [
        work.best_oa_location?.pdf_url,
        work.primary_location?.pdf_url,
        ...(work.locations || []).map((location) => location.pdf_url),
        getLink(work),
        work.doi ? (work.doi.startsWith('http') ? work.doi : `https://doi.org/${work.doi}`) : null,
        work.best_oa_location?.landing_page_url,
        work.primary_location?.landing_page_url,
        ...(work.locations || []).map((location) => location.landing_page_url),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

function normalizeDoi(doi?: string | null): string | undefined {
  if (!doi) {
    return undefined;
  }

  const match = doi.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match ? match[0] : undefined;
}

async function fetchCrossrefMetadata(doi?: string): Promise<CrossrefWorkMessage | null> {
  if (!doi) {
    return null;
  }

  if (crossrefCache.has(doi)) {
    return crossrefCache.get(doi) || null;
  }

  try {
    const response = await fetchWithRetry(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'dashboard-ketenagakerjaan/1.0 (mailto:noreply@example.com)',
      },
    });

    if (!response.ok) {
      crossrefCache.set(doi, null);
      return null;
    }

    const payload = (await response.json()) as { message?: CrossrefWorkMessage };
    const message = payload.message || null;
    crossrefCache.set(doi, message);
    return message;
  } catch {
    crossrefCache.set(doi, null);
    return null;
  }
}

async function resolveSource(work: OpenAlexWork, doi?: string): Promise<string> {
  const openAlexSource = getSource(work);
  if (openAlexSource !== 'OpenAlex indexed research') {
    return openAlexSource;
  }

  const crossref = await fetchCrossrefMetadata(doi);
  const crossrefSource = normalizeText(crossref?.['container-title']?.[0] || crossref?.publisher || '');
  return crossrefSource || openAlexSource;
}

async function isWorkingResearchUrl(url: string): Promise<boolean> {
  if (linkValidationCache.has(url)) {
    return linkValidationCache.get(url) || false;
  }

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
        'User-Agent': 'dashboard-ketenagakerjaan/1.0 (mailto:noreply@example.com)',
      },
    });

    if (!response.ok) {
      linkValidationCache.set(url, false);
      return false;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/pdf')) {
      linkValidationCache.set(url, true);
      return true;
    }

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      linkValidationCache.set(url, false);
      return false;
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = normalizeText(titleMatch ? titleMatch[1] : '');
    const blockedTitlePatterns = [
      /404 not found/i,
      /maintenance/i,
      /502 bad gateway/i,
      /origin dns error/i,
      /web server is returning an unknown error/i,
      /not acceptable/i,
      /bot verification/i,
      /just a moment/i,
      /attention required/i,
    ];

    const working = !blockedTitlePatterns.some((pattern) => pattern.test(pageTitle));
    linkValidationCache.set(url, working);
    return working;
  } catch {
    linkValidationCache.set(url, false);
    return false;
  }
}

async function resolveWorkingLink(work: OpenAlexWork): Promise<string | null> {
  for (const candidate of getCandidateLinks(work)) {
    if (await isWorkingResearchUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function workToFinding(work: OpenAlexWork): Promise<ResearchFinding | null> {
  const title = normalizeText(work.display_name || work.title || '');
  const publishDate = work.publication_date;
  const year = work.publication_year;
  const doi = normalizeDoi(work.doi);

  if (!title || !publishDate || !year || year < MIN_PUBLISH_YEAR || publishDate > CURRENT_DATE) {
    return null;
  }

  const abstract = reconstructAbstract(work.abstract_inverted_index);
  const source = await resolveSource(work, doi);
  const haystack = `${title} ${abstract} ${source}`;

  if (!hasIndonesiaSignal(haystack) || !hasLaborSignal(haystack)) {
    return null;
  }

  const link = await resolveWorkingLink(work);
  if (!link) {
    return null;
  }

  return {
    id: stableId(title, publishDate, link),
    title,
    source,
    dateRange: String(year),
    publishDate,
    summary: compactAbstract(abstract),
    tags: buildTags(work, haystack),
    link,
    doi,
  };
}

function scoreFinding(finding: ResearchFinding): number {
  let score = 0;
  if (finding.doi) score += 5;
  if (finding.publishDate) score += 4;
  if (finding.tags.includes('National Paper')) score += 3;
  if (finding.tags.includes('Sakernas')) score += 3;
  score += finding.tags.filter((tag) => tag !== 'OpenAlex' && tag !== 'National Paper' && tag !== 'International Paper').length;
  if (finding.tags.includes('OpenAlex')) score += 1;
  return score;
}

function dedupeFindings(findings: ResearchFinding[]): ResearchFinding[] {
  const byKey = new Map<string, ResearchFinding>();

  for (const finding of findings) {
    const titleKey = `title:${normalizeTitle(finding.title)}|${finding.dateRange}`;
    const key = titleKey;
    const existing = byKey.get(key);

    if (!existing || scoreFinding(finding) > scoreFinding(existing)) {
      byKey.set(key, finding);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const bTime = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return bTime - aTime;
  });
}

function getYearWindows(): Array<{ year: number; from: string; to: string }> {
  const windows: Array<{ year: number; from: string; to: string }> = [];
  const startYear = Math.max(MIN_PUBLISH_YEAR, Math.min(FROM_YEAR, CURRENT_YEAR));

  for (let year = CURRENT_YEAR; year >= startYear; year -= 1) {
    windows.push({
      year,
      from: `${year}-01-01`,
      to: year === CURRENT_YEAR ? CURRENT_DATE : `${year}-12-31`,
    });
  }

  return windows;
}

async function fetchOpenAlexQuery(query: string, window: { year: number; from: string; to: string }): Promise<ResearchFinding[]> {
  const params = new URLSearchParams({
    search: query,
    filter: `from_publication_date:${window.from},to_publication_date:${window.to},type:article`,
    'per-page': String(RESULTS_PER_QUERY_YEAR),
    sort: 'publication_date:desc',
    mailto: 'noreply@example.com',
  });
  const url = `${OPENALEX_BASE_URL}?${params.toString()}`;

  log('openalex', `Fetching ${window.year}: ${query}`);
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'dashboard-ketenagakerjaan/1.0 (mailto:noreply@example.com)',
    },
  });

  if (!response.ok) {
    log('openalex', `Skipping ${window.year} query "${query}" because OpenAlex returned ${response.status}`);
    return [];
  }

  const payload = (await response.json()) as { results?: OpenAlexWork[] };
  const findings = await Promise.all((payload.results || []).map((work) => workToFinding(work)));
  return findings.filter((finding): finding is ResearchFinding => Boolean(finding));
}

function readExistingFindings(): ResearchFinding[] {
  if (!fs.existsSync(SCHOLAR_FILE)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(SCHOLAR_FILE, 'utf-8')) as ResearchFinding[];
}

function selectBalancedOpenAlex(findings: ResearchFinding[]): ResearchFinding[] {
  const byYear = new Map<string, ResearchFinding[]>();

  for (const finding of dedupeFindings(findings)) {
    const group = byYear.get(finding.dateRange) || [];
    group.push(finding);
    byYear.set(finding.dateRange, group);
  }

  const selected: ResearchFinding[] = [];
  const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));
  const perYearCap = Math.ceil(MAX_OPENALEX_FINDINGS / Math.max(years.length, 1));

  for (const year of years) {
    const group = (byYear.get(year) || []).sort((a, b) => {
      const scoreDiff = scoreFinding(b) - scoreFinding(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.publishDate || '').getTime() - new Date(a.publishDate || '').getTime();
    });

    selected.push(...group.slice(0, perYearCap));
  }

  if (selected.length < MAX_OPENALEX_FINDINGS) {
    const selectedIds = new Set(selected.map((finding) => finding.id));
    const remainder = dedupeFindings(findings)
      .filter((finding) => !selectedIds.has(finding.id))
      .sort((a, b) => {
        const scoreDiff = scoreFinding(b) - scoreFinding(a);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.publishDate || '').getTime() - new Date(a.publishDate || '').getTime();
      });
    selected.push(...remainder.slice(0, MAX_OPENALEX_FINDINGS - selected.length));
  }

  return selected.slice(0, MAX_OPENALEX_FINDINGS);
}

function mergeExistingWithOpenAlex(existing: ResearchFinding[], fetched: ResearchFinding[]): ResearchFinding[] {
  const existingKeys = new Set(
    existing.map((finding) =>
      finding.doi ? `doi:${finding.doi.toLowerCase()}` : `title:${normalizeTitle(finding.title)}|${finding.dateRange}`,
    ),
  );

  const openAlexOnly = selectBalancedOpenAlex(fetched)
    .filter((finding) => {
      const key = finding.doi ? `doi:${finding.doi.toLowerCase()}` : `title:${normalizeTitle(finding.title)}|${finding.dateRange}`;
      return !existingKeys.has(key);
    })
    .slice(0, MAX_OPENALEX_FINDINGS);

  return dedupeFindings([...existing, ...openAlexOnly]);
}

async function main() {
  log(
    'openalex',
    `Starting OpenAlex enrichment for ${FROM_YEAR <= MIN_PUBLISH_YEAR ? '2019+ historical backfill' : `${FROM_YEAR}+ incremental`} Indonesia labor papers`,
  );

  const existing = readExistingFindings();
  const fetched: ResearchFinding[] = [];
  const windows = getYearWindows();

  for (const window of windows) {
    for (const query of OPENALEX_QUERIES) {
      const results = await fetchOpenAlexQuery(query, window);
      fetched.push(...results);
      await delay(250);
    }
  }

  const merged = mergeExistingWithOpenAlex(existing, fetched);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SCHOLAR_FILE, JSON.stringify(merged, null, 2));

  log(
    'openalex',
    `Merged ${existing.length} existing findings with ${fetched.length} OpenAlex matches; wrote ${merged.length} findings`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
