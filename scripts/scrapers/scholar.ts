import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { delay, fetchWithRetry, log } from '../config';

const DATA_DIR = path.join(process.cwd(), 'data', 'research');
const SCHOLAR_FILE = path.join(DATA_DIR, 'scholar.json');

const PRIMARY_KEYWORDS = [
  'Sakernas ketenagakerjaan',
  'Survei Angkatan Kerja Nasional ketenagakerjaan',
  'Labor Force Survey Indonesia Sakernas',
  'analisis data Sakernas',
  'site:stis.ac.id Sakernas',
  'site:stis.ac.id pengangguran',
  'site:stis.ac.id ketenagakerjaan',
  'Youth Unemployment Indonesia',
  'Gig Economy pekerja informal',
  'Green Jobs labor transition Indonesia',
  'Jaminan Sosial BPJS ketenagakerjaan',
  'NEET Indonesia',
  'NEET youth Indonesia labor market',
  'Not in Employment Education or Training Indonesia',
];

const SECONDARY_QUERY_TERM = 'Sakernas';
const MAX_RESULTS_PER_QUERY = 5;
const MAX_SECONDARY_DOMAINS = 8;
const MIN_PUBLISH_YEAR = 2019;
const SCHOLAR_BASE_URL = 'https://scholar.google.com/scholar';

const DENYLIST_HOSTS = new Set([
  'scholar.google.com',
  'scholar.google.co.id',
  'google.com',
  'google.co.id',
  'doi.org',
  'dx.doi.org',
  'wikipedia.org',
  'en.wikipedia.org',
  'id.wikipedia.org',
  'github.com',
  'youtube.com',
  'books.google.com',
  'drive.google.com',
]);

const PREFERRED_PUBLISHERS = [
  'researchgate.net',
  'academia.edu',
  'ssrn.com',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'tandfonline.com',
  'oup.com',
  'sagepub.com',
  'aip.org',
];

const TOPIC_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'Sakernas', patterns: [/\bsakernas\b/i, /survei angkatan kerja nasional/i, /labor force survey/i] },
  { tag: 'Youth Unemployment', patterns: [/youth unemployment/i, /pengangguran pemuda/i, /pengangguran terdidik/i] },
  { tag: 'Gig Economy', patterns: [/\bgig economy\b/i, /platform work/i, /pekerja gig/i, /freelancer/i] },
  { tag: 'Green Jobs', patterns: [/\bgreen jobs?\b/i, /transisi hijau/i, /just transition/i] },
  { tag: 'NEET', patterns: [/\bneet\b/i, /not in employment,? education,? or training/i] },
  { tag: 'Informal Sector', patterns: [/pekerja informal/i, /informal sector/i, /informal employment/i] },
  { tag: 'Skills Mismatch', patterns: [/skills mismatch/i, /mismatch/i, /\bsmk\b/i, /vocational/i] },
  { tag: 'Working Hours', patterns: [/jam kerja/i, /working hours/i, /overwork/i, /time use/i] },
  { tag: 'Social Protection', patterns: [/bpjs/i, /jaminan sosial/i, /social protection/i, /\bjkp\b/i] },
];

interface ScholarCandidate {
  title: string;
  scholarSource: string;
  link: string;
  snippet: string;
  discoveredBy: string;
}

export interface ResearchFinding {
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

function extractDomain(urlStr: string): string | null {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAcademicDomain(domain: string): boolean {
  if (DENYLIST_HOSTS.has(domain)) {
    return false;
  }

  if (domain.endsWith('.ac.id') || domain.endsWith('.edu') || domain.endsWith('.org')) {
    return true;
  }

  return PREFERRED_PUBLISHERS.some((publisher) => domain === publisher || domain.endsWith(`.${publisher}`));
}

function isAllowedResultLink(urlStr: string): boolean {
  const domain = extractDomain(urlStr);
  if (!domain) {
    return false;
  }

  return isAcademicDomain(domain) && !/\/scholar\?/i.test(urlStr);
}

function getDomainTag(domain: string): string {
  const lowercase = domain.toLowerCase();

  if (lowercase.includes('stis.ac.id')) return 'STIS';
  if (lowercase.includes('ui.ac.id')) return 'UI';
  if (lowercase.includes('ugm.ac.id')) return 'UGM';
  if (lowercase.includes('itb.ac.id')) return 'ITB';
  if (lowercase.includes('unpad.ac.id')) return 'UNPAD';
  if (lowercase.includes('undip.ac.id')) return 'UNDIP';
  if (lowercase.includes('ub.ac.id')) return 'UB';
  if (lowercase.includes('unair.ac.id')) return 'UNAIR';
  if (lowercase.includes('uns.ac.id')) return 'UNS';
  if (lowercase.includes('researchgate.net')) return 'ResearchGate';
  if (lowercase.includes('academia.edu')) return 'Academia';
  if (lowercase.includes('ssrn.com')) return 'SSRN';
  if (lowercase.includes('semanticscholar.org')) return 'Semantic Scholar';

  const parts = lowercase.split('.');
  if (parts.length > 2 && (lowercase.endsWith('.ac.id') || lowercase.endsWith('.co.id'))) {
    return parts[parts.length - 3].toUpperCase();
  }

  if (parts.length > 1) {
    return parts[parts.length - 2].toUpperCase();
  }

  return parts[0].toUpperCase();
}

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

function buildQueryUrl(keyword: string): string {
  return `${SCHOLAR_BASE_URL}?q=${encodeURIComponent(keyword)}&hl=en&as_sdt=0,5`;
}

async function fetchScholarCandidates(keyword: string): Promise<ScholarCandidate[]> {
  const url = buildQueryUrl(keyword);
  const candidates: ScholarCandidate[] = [];

  try {
    log('scholar', `Fetching query: ${keyword}`);
    await delay(3000 + Math.random() * 2000);

    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      log('scholar', `Skipping query "${keyword}" because Scholar returned ${res.status}`);
      return candidates;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $('.gs_ri').each((index, element) => {
      if (index >= MAX_RESULTS_PER_QUERY) {
        return false;
      }

      const titleAnchor = $(element).find('.gs_rt a').first();
      const rawTitle = titleAnchor.text() || $(element).find('.gs_rt').text();
      const title = normalizeText(rawTitle.replace(/\[(PDF|HTML|BOOK|DOC)\]/gi, ''));
      const link = titleAnchor.attr('href') || '';
      const snippet = normalizeText($(element).find('.gs_rs').text() || '');
      const scholarSource = normalizeText($(element).find('.gs_a').text() || '');

      if (!title || title.length < 20 || !snippet || !link) {
        return;
      }

      if (!isAllowedResultLink(link)) {
        return;
      }

      candidates.push({
        title,
        scholarSource,
        link,
        snippet,
        discoveredBy: keyword,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('scholar', `Query failed for "${keyword}": ${message}`);
  }

  return candidates;
}

function extractYear(text: string): string | null {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

function parseDateCandidate(value: string): string | null {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const yearFirst = raw.match(/\b(\d{4})[\/.](\d{2})[\/.](\d{2})\b/);
  if (yearFirst) {
    return `${yearFirst[1]}-${yearFirst[2]}-${yearFirst[3]}`;
  }

  const dayFirst = raw.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);
  if (dayFirst) {
    return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().slice(0, 10);
    if (/\b\d{1,2}\b/.test(raw) || !iso.endsWith('-01-01')) {
      return iso;
    }
  }

  return null;
}

function extractDateFromJsonLd(html: string): string | null {
  const scriptMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const scriptBlock of scriptMatches) {
    const innerMatch = scriptBlock.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const inner = innerMatch ? innerMatch[1] : '';
    if (!inner.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(inner);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item || typeof item !== 'object') {
          continue;
        }

        if (Array.isArray(item)) {
          queue.push(...item);
          continue;
        }

        const candidate = item as Record<string, unknown>;
        const directDate =
          candidate.datePublished ??
          candidate.dateCreated ??
          candidate.dateModified ??
          candidate.uploadDate;

        if (typeof directDate === 'string') {
          const parsedDate = parseDateCandidate(directDate);
          if (parsedDate) {
            return parsedDate;
          }
        }

        for (const value of Object.values(candidate)) {
          if (value && typeof value === 'object') {
            queue.push(value);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractMetaContent($: ReturnType<typeof cheerio.load>, selectors: string[]): string | null {
  for (const selector of selectors) {
    const content = $(selector).attr('content') || $(selector).attr('datetime') || $(selector).text();
    const normalized = normalizeText(content || '');
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function fetchLandingMetadata(
  url: string,
): Promise<{ publishDate: string | null; doi: string | null; source: string | null }> {
  try {
    await delay(1200 + Math.random() * 800);

    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      return { publishDate: null, doi: null, source: null };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { publishDate: null, doi: null, source: null };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const publishContent = extractMetaContent($, [
      'meta[name="citation_publication_date"]',
      'meta[name="citation_online_date"]',
      'meta[name="citation_date"]',
      'meta[name="dc.date"]',
      'meta[name="dc.date.issued"]',
      'meta[name="DC.Date"]',
      'meta[name="DC.date"]',
      'meta[property="article:published_time"]',
      'meta[name="prism.publicationDate"]',
      'meta[name="bepress_citation_date"]',
      'meta[name="eprints.date"]',
      'time[datetime]',
    ]);

    const publishDate =
      (publishContent ? parseDateCandidate(publishContent) : null) ||
      extractDateFromJsonLd(html);

    const doiContent = extractMetaContent($, [
      'meta[name="citation_doi"]',
      'meta[name="dc.identifier"]',
      'meta[name="DC.Identifier"]',
      'meta[name="prism.doi"]',
      'meta[name="doi"]',
    ]);

    const doiMatch = doiContent ? doiContent.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i) : null;

    const source =
      extractMetaContent($, [
        'meta[name="citation_journal_title"]',
        'meta[name="citation_conference_title"]',
        'meta[name="citation_dissertation_institution"]',
        'meta[property="og:site_name"]',
        'meta[name="application-name"]',
      ]) || null;

    return {
      publishDate,
      doi: doiMatch ? doiMatch[0] : null,
      source: source ? normalizeText(source) : null,
    };
  } catch {
    return { publishDate: null, doi: null, source: null };
  }
}

function buildTags(title: string, summary: string, domain: string, keyword: string): string[] {
  const haystack = `${title} ${summary} ${keyword}`;
  const topicTags = TOPIC_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(haystack)))
    .map((rule) => rule.tag);

  const sourceTag = getDomainTag(domain);
  return Array.from(new Set(['Google Scholar', ...topicTags, sourceTag].filter(Boolean)));
}

function inferSource(candidate: ScholarCandidate, resolvedSource: string | null): string {
  if (resolvedSource) {
    return resolvedSource;
  }

  const domain = extractDomain(candidate.link);
  if (domain) {
    return domain;
  }

  if (candidate.scholarSource) {
    const parts = candidate.scholarSource
      .split(' - ')
      .map((part) => normalizeText(part))
      .filter(Boolean);

    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
  }

  return 'Academic Research';
}

function buildStableId(title: string, publishDate: string, link: string): string {
  return `scholar-${crypto
    .createHash('md5')
    .update(`${normalizeTitle(title)}|${publishDate}|${link}`)
    .digest('hex')
    .slice(0, 10)}`;
}

async function candidateToFinding(candidate: ScholarCandidate): Promise<ResearchFinding | null> {
  const domain = extractDomain(candidate.link);
  if (!domain) {
    return null;
  }

  const landing = await fetchLandingMetadata(candidate.link);
  if (!landing.publishDate) {
    log('scholar', `Rejected without real publish date: ${candidate.title}`);
    return null;
  }

  const year = extractYear(landing.publishDate);
  if (!year) {
    return null;
  }

  if (Number(year) < MIN_PUBLISH_YEAR) {
    log('scholar', `Rejected before ${MIN_PUBLISH_YEAR}: ${candidate.title}`);
    return null;
  }

  const title = normalizeText(candidate.title);
  const summary = normalizeText(candidate.snippet);
  const source = inferSource(candidate, landing.source);
  const tags = buildTags(title, summary, domain, candidate.discoveredBy);

  return {
    id: buildStableId(title, landing.publishDate, candidate.link),
    title,
    source,
    dateRange: year,
    publishDate: landing.publishDate,
    summary,
    tags,
    link: candidate.link,
    doi: landing.doi || undefined,
  };
}

function scoreFinding(finding: ResearchFinding): number {
  let score = 0;

  if (finding.doi) score += 3;
  if (finding.publishDate) score += 3;
  if (finding.link) score += 2;

  const domain = finding.link ? extractDomain(finding.link) : null;
  if (domain) {
    if (domain.endsWith('.ac.id') || domain.endsWith('.edu')) score += 3;
    if (domain.endsWith('.org')) score += 1;
    if (PREFERRED_PUBLISHERS.some((publisher) => domain === publisher || domain.endsWith(`.${publisher}`))) {
      score += 2;
    }
  }

  return score;
}

function dedupeFindings(findings: ResearchFinding[]): ResearchFinding[] {
  const byKey = new Map<string, ResearchFinding>();

  for (const finding of findings) {
    const dedupeKey = `${normalizeTitle(finding.title)}|${finding.dateRange}`;
    const existing = byKey.get(dedupeKey);

    if (!existing || scoreFinding(finding) > scoreFinding(existing)) {
      byKey.set(dedupeKey, finding);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const bTime = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return bTime - aTime;
  });
}

function readExistingFindings(): ResearchFinding[] {
  if (!fs.existsSync(SCHOLAR_FILE)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(SCHOLAR_FILE, 'utf-8')) as ResearchFinding[];
}

function mergeScholarRefresh(findings: ResearchFinding[]): ResearchFinding[] {
  const preservedFindings = readExistingFindings().filter(
    (finding) => !finding.tags?.includes('Google Scholar'),
  );

  return dedupeFindings([...preservedFindings, ...findings]);
}

async function main() {
  log('scholar', 'Starting academic research scrape');

  const queryCandidates: ScholarCandidate[] = [];
  for (const keyword of PRIMARY_KEYWORDS) {
    const batch = await fetchScholarCandidates(keyword);
    queryCandidates.push(...batch);
  }

  const discoveredDomains = Array.from(
    new Set(
      queryCandidates
        .map((candidate) => extractDomain(candidate.link))
        .filter((domain): domain is string => {
          if (!domain) {
            return false;
          }
          return isAcademicDomain(domain);
        }),
    ),
  ).slice(0, MAX_SECONDARY_DOMAINS);

  for (const domain of discoveredDomains) {
    const query = `site:${domain} ${SECONDARY_QUERY_TERM}`;
    const batch = await fetchScholarCandidates(query);
    queryCandidates.push(...batch);
  }

  const uniqueCandidates = Array.from(
    new Map(queryCandidates.map((candidate) => [`${normalizeTitle(candidate.title)}|${candidate.link}`, candidate])).values(),
  );

  log('scholar', `Collected ${uniqueCandidates.length} unique Scholar candidates`);

  const findings: ResearchFinding[] = [];
  for (const candidate of uniqueCandidates) {
    const finding = await candidateToFinding(candidate);
    if (finding) {
      findings.push(finding);
    }
  }

  const finalFindings = mergeScholarRefresh(findings);

  if (findings.length === 0) {
    log('scholar', 'No valid findings with real publish dates. Existing scholar.json left unchanged.');
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SCHOLAR_FILE, JSON.stringify(finalFindings, null, 2));
  log('scholar', `Merged ${findings.length} Scholar findings into ${finalFindings.length} total findings`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
