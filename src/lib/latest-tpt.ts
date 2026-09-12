/**
 * src/lib/latest-tpt.ts
 * Surface the newest national TPT (unemployment-rate) figure from BPS press
 * releases captured by the daily BRS scraper.
 *
 * Why: the overview dashboard's TPT card reads the February provincial survey
 * (tpt_feb_26), but BPS publishes newer national figures in press releases
 * (e.g. "TPT sebesar 4,65 persen", 2026-08-05) that land in
 * data/bps/ketenagakerjaan/*.json every day. Until these helpers existed,
 * nobody connected the two, so the dashboard showed stale numbers.
 */

export interface TptRelease {
  date: string; // ISO date, e.g. "2026-08-05"
  title: string;
}

export interface LatestTpt {
  value: number;
  date: string;
}

export function parseTptFromTitle(title: string): number | null {
  // Match "TPT ... <number> persen" (case-insensitive, either decimal mark).
  const match = title.match(/tpt\b[^0-9]{0,60}?(\d+[.,]\d+)\s*persen/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function pickLatestTpt(releases: TptRelease[]): LatestTpt | null {
  let best: LatestTpt | null = null;

  for (const release of releases) {
    const value = parseTptFromTitle(release.title ?? '');
    if (value === null) {
      continue;
    }
    if (!best || release.date > best.date) {
      best = { value, date: release.date };
    }
  }

  return best;
}

/**
 * Same-vintage YoY anchor: the newest release 10-13 months before the
 * reference date. Returns null when the archive has no such release —
 * callers must then hide the YoY badge rather than blend vintages.
 */
export function pickYearAgoTpt(
  releases: TptRelease[],
  referenceDate: string,
): LatestTpt | null {
  const ref = parseYearMonth(referenceDate);
  if (!ref) {
    return null;
  }

  let best: LatestTpt | null = null;

  for (const release of releases) {
    const rel = parseYearMonth(release.date);
    if (!rel) {
      continue;
    }
    const monthsBefore = (ref.year - rel.year) * 12 + (ref.month - rel.month);
    if (monthsBefore < 10 || monthsBefore > 13) {
      continue;
    }
    const value = parseTptFromTitle(release.title ?? '');
    if (value === null) {
      continue;
    }
    if (!best || release.date > best.date) {
      best = { value, date: release.date };
    }
  }

  return best;
}

function parseYearMonth(date: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})/.exec(date ?? '');
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}
