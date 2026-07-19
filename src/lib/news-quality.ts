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

// ─── Foreign-context filter ──────────────────────────────────────────────────
// The archive tracks the DOMESTIC labor market. Foreign stories often carry
// labor keywords (PHK, karyawan, kerja) yet say nothing about Indonesia —
// e.g. "16 Ribu Karyawan Amazon Kena PHK" or a UK prime-minister profile.
// Rule: exclude only when a foreign marker is present AND no domestic marker
// is present. When unsure, KEEP — a false keep is noise, a false drop loses
// real coverage. Migrant-worker stories (PMI/TKI abroad) always count as
// domestic.

const DOMESTIC_CONTEXT_MARKERS = [
  // Negara & pemerintahan
  'indonesia', 'ri', 'nusantara', 'rupiah', 'prabowo', 'gibran', 'istana',
  'kemnaker', 'kemenaker', 'kementerian', 'kemenperin', 'kemenkeu', 'kemendag',
  'kemenhub', 'kemendikbud', 'kemhan', 'kemenlu', 'kemendagri', 'kemensos',
  'kemenkes', 'kemenag', 'kemenkop', 'menko', 'menkeu', 'menaker', 'menperin',
  'purbaya', 'bahlil', 'bps', 'bpjs', 'ojk', 'dpr', 'mpr', 'pemda',
  'pemprov', 'pemkab', 'pemkot', 'polri', 'tni', 'ikn',
  // Ekonomi & ketenagakerjaan domestik
  'kadin', 'apindo', 'bumn', 'bumd', 'umkm', 'ump', 'umk', 'umr', 'bsu',
  'jkp', 'kur', 'prakerja', 'bulog', 'pertamina', 'danantara', 'ihsg', 'bei',
  'sakernas', 'tapera', 'taspen', 'bpdp',
  'serikat pekerja', 'serikat buruh', 'kspi', 'kspsi', 'said iqbal',
  // Pekerja migran Indonesia di luar negeri = tetap domestik
  'pekerja migran', 'pmi', 'tki', 'tkw', 'wni', 'kbri', 'kjri',
  // Geografi (provinsi & singkatannya, pulau, kota besar, kawasan industri)
  'jakarta', 'jabodetabek', 'jawa', 'sumatera', 'sumatra', 'kalimantan',
  'sulawesi', 'papua', 'maluku', 'bali', 'nusa tenggara', 'ntt', 'ntb',
  'aceh', 'banten', 'yogyakarta', 'jogja', 'riau', 'jambi', 'bengkulu',
  'lampung', 'gorontalo', 'jabar', 'jateng', 'jatim', 'diy', 'dki',
  'sumut', 'sumbar', 'sumsel', 'babel', 'kepri', 'kalbar', 'kalsel',
  'kalteng', 'kaltim', 'kaltara', 'sulut', 'sulsel', 'sulbar', 'sulteng',
  'sultra', 'surabaya', 'bandung', 'medan', 'semarang',
  'makassar', 'palembang', 'batam', 'denpasar', 'pekanbaru', 'pontianak',
  'banjarmasin', 'balikpapan', 'samarinda', 'manado', 'ambon', 'jayapura',
  'karawang', 'bekasi', 'cikarang', 'tangerang', 'gresik', 'sidoarjo',
  'morowali', 'kendal', 'batang', 'subang', 'purwakarta', 'cirebon',
  'bogor', 'depok', 'solo', 'surakarta', 'malang', 'cilegon', 'serang',
  'padang', 'mataram', 'kupang', 'palu', 'kendari', 'ternate',
];

const FOREIGN_CONTEXT_MARKERS = [
  // Negara & kawasan
  'amerika serikat', 'amerika', 'inggris', 'britania', 'skotlandia', 'china',
  'tiongkok', 'jepang', 'korea selatan', 'korea utara', 'india', 'jerman',
  'prancis', 'perancis', 'italia', 'spanyol', 'belanda', 'swiss', 'swedia',
  'rusia', 'ukraina', 'eropa', 'uni eropa', 'arab saudi', 'uni emirat arab',
  'qatar', 'turki', 'iran', 'irak', 'israel', 'gaza', 'palestina', 'mesir',
  'afrika selatan', 'nigeria', 'australia', 'selandia baru', 'singapura',
  'malaysia', 'thailand', 'vietnam', 'filipina', 'kamboja', 'myanmar',
  'brasil', 'argentina', 'meksiko', 'kanada', 'washington', 'beijing',
  'tokyo', 'seoul', 'london', 'new york',
  // Korporasi & institusi asing yang sering membawa kata kunci ketenagakerjaan
  'amazon', 'google', 'meta', 'microsoft', 'apple', 'tesla', 'nvidia',
  'openai', 'samsung', 'volkswagen', 'toyota', 'boeing', 'airbus', 'alibaba',
  'tencent', 'byd', 'foxconn', 'intel', 'netflix', 'disney', 'starbucks',
  'mcdonald', 'walmart', 'trump', 'gedung putih', 'white house',
  'wall street', 'the fed', 'federal reserve',
];

function buildMarkerRegex(markers: string[]) {
  const escaped = markers.map((marker) =>
    marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
  );
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${escaped.join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu');
}

const DOMESTIC_CONTEXT_REGEX = buildMarkerRegex(DOMESTIC_CONTEXT_MARKERS);
const FOREIGN_CONTEXT_REGEX = buildMarkerRegex(FOREIGN_CONTEXT_MARKERS);
// "Rp15.700" has no word boundary before the digit, so match it explicitly.
const RUPIAH_AMOUNT_REGEX = /\brp\s*\d/i;

export function hasDomesticContext(text?: string) {
  if (!text) return false;
  return DOMESTIC_CONTEXT_REGEX.test(text) || RUPIAH_AMOUNT_REGEX.test(text);
}

export function isForeignOnlyNews(text?: string) {
  if (!text) return false;
  return FOREIGN_CONTEXT_REGEX.test(text) && !hasDomesticContext(text);
}
