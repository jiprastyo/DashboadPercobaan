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

const SURVEY_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

export interface TptSurveyRound {
  observationDate: string; // YYYY-MM-01 of the survey month
  observationLabel: string; // e.g. "Mei 2026"
}

/**
 * Extract the survey round from a BRS release summary, e.g.
 * "…Sakernas) pada Mei 2026 sebanyak 155,41 juta orang…" → 2026-05 / "Mei 2026".
 * Returns null when the text has no parsable "Sakernas pada <Month> <Year>".
 */
export function parseSurveyRound(title: string, summary: string): TptSurveyRound | null {
  const text = `${title ?? ''} ${summary ?? ''}`;
  const match = text.match(
    /sakernas[^.]{0,80}?pada\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i,
  );
  if (!match) {
    return null;
  }
  const month = SURVEY_MONTHS[match[1].toLowerCase()];
  const year = Number(match[2]);
  if (!month || !Number.isFinite(year)) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  return {
    observationDate: `${year}-${mm}-01`,
    observationLabel: `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${year}`,
  };
}

/**
 * BRS-derived national TPT points, one per survey round, newest release wins
 * per round (a later release can revise an earlier provisional figure).
 */
export function brsNationalTptPoints(
  releases: Array<TptRelease & { summary?: string }>,
): Array<LatestTpt & { observationLabel: string }> {
  const byRound = new Map<string, LatestTpt & { observationLabel: string }>();

  for (const release of releases) {
    const value = parseTptFromTitle(release.title ?? '');
    if (value === null || !release.date) {
      continue;
    }
    const round = parseSurveyRound(release.title ?? '', release.summary ?? '');
    if (!round) {
      continue;
    }
    const previous = byRound.get(round.observationDate);
    if (!previous || release.date > previous.date) {
      byRound.set(round.observationDate, {
        value,
        date: round.observationDate,
        observationLabel: round.observationLabel,
      });
    }
  }

  return Array.from(byRound.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
