export const NEWS_ARCHIVE_MIN_DATE = '2026-01-01T00:00:00.000Z';
export const NEWS_ARCHIVE_MIN_TIMESTAMP = Date.parse(NEWS_ARCHIVE_MIN_DATE);
export const NEWS_MAX_FUTURE_SKEW_MS = 36 * 60 * 60 * 1000;

const GOOGLE_NEWS_HOSTS = new Set(['news.google.com', 'news.google.co.id']);

export function isGoogleNewsUrl(value?: string) {
  if (!value) return false;

  try {
    return GOOGLE_NEWS_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isRealPublisherUrl(value?: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !isGoogleNewsUrl(value);
  } catch {
    return false;
  }
}

export function normalizePublisherUrl(value?: string) {
  if (!isRealPublisherUrl(value)) return '';

  const url = new URL(value!);
  url.hash = '';
  for (const key of Array.from(url.searchParams.keys())) {
    if (/^(utm_|fbclid$|gclid$|oc$)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }

  return url.toString().replace(/[/?]$/, '').toLowerCase();
}

export function normalizeNewsTitle(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z0-9#]+;/g, ' ')
    .replace(/\s+-\s+(?:[^-]{2,60})$/u, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function datePartsToIso(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return '';
  }
  return candidate.toISOString().slice(0, 10);
}

export function extractPublicationDayFromUrl(value?: string) {
  if (!isRealPublisherUrl(value)) return '';

  const pathname = new URL(value!).pathname;
  const fullYearMatch = pathname.match(/(?:^|\/)(20\d{2})[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])(?:\/|$)/);
  if (fullYearMatch) {
    return datePartsToIso(Number(fullYearMatch[1]), Number(fullYearMatch[2]), Number(fullYearMatch[3]));
  }

  const compactFullYearMatch = pathname.match(/(?:^|\/)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4,}(?:\D|$)/);
  if (compactFullYearMatch) {
    return datePartsToIso(
      Number(compactFullYearMatch[1]),
      Number(compactFullYearMatch[2]),
      Number(compactFullYearMatch[3]),
    );
  }

  const compactMatch = pathname.match(/(?:^|\/)(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{2,}(?:\D|$)/);
  if (compactMatch) {
    const shortYear = Number(compactMatch[1]);
    const year = shortYear >= 90 ? 1900 + shortYear : 2000 + shortYear;
    return datePartsToIso(year, Number(compactMatch[2]), Number(compactMatch[3]));
  }

  return '';
}

export function isPlausibleNewsPublicationDate(
  value?: string,
  publisherUrl?: string,
  nowTimestamp = Date.now(),
) {
  if (!value) return false;

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  if (timestamp < NEWS_ARCHIVE_MIN_TIMESTAMP) return false;
  if (timestamp > nowTimestamp + NEWS_MAX_FUTURE_SKEW_MS) return false;

  const urlDay = extractPublicationDayFromUrl(publisherUrl);
  if (urlDay && new Date(timestamp).toISOString().slice(0, 10) !== urlDay) {
    return false;
  }

  return true;
}
