# Stage P3 — Ministry release monitoring

Status: not-started
Prerequisites: P1 (ministries.json registry). Independent of P2.

## Goal

Generalize the working Kemenaker pattern into a registry-driven scraper so
verified ministries' press releases flow autonomously into the dashboard —
extending "source health / autonomous fetching" to the whole ministry list
without one bespoke scraper per institution.

## Design

### P3.1 Scraper: `scripts/scrapers/ministry-releases.ts`

- Registry-driven: iterate `data/program/ministries.json` entries with
  `verified: true` AND a non-null `release_source` AND **no
  `release_source.scraper` field** — that field means "owned by a dedicated
  scraper"; `ministry-releases.ts` skips such entries (kemnaker carries
  `scraper: "kemenaker"`, so it is never double-scraped). Skip everything
  else too, logged (counts of skipped-unverified and skipped-dedicated in
  the result).
- `release_source.type` dispatch:
  - `"api"` — JSON endpoint, kemenaker-style (paged, capped ~10 pages/run
    for ministries handled here; `kemenaker.ts` itself is untouched and
    keeps its own existing behavior — it pages 1–30 on every run).
  - `"rss"` — reuse the rss-parser path from setkab/news-aggregator.
  - `"html"` — cheerio with per-ministry selectors stored in the registry
    entry (`release_source.selectors`, same shape as
    `NEWS_OUTLETS[].selectors`). Expect drift (failure-modes §5); a
    selector miss must surface as a per-ministry `error` string in the
    result → ops `partial`, never silent zero.
- Filter: `matchesKeywords(text, LABOR_KEYWORDS)` — the mission lens
  applied mechanically; a tourism ministry's beach-cleanup release does
  not enter a labor dashboard.
- Output: `data/program/releases/<ministry_id>.json`, append-merge deduped
  by `link`, records `{ title, date, summary ≤500, link, ministry_id,
  keywords_matched[], _source_url, _scraped_at }`. Kemnaker's existing
  `data/kemenaker/phk/articles.json` is NOT migrated in this stage —
  `kemenaker.ts` keeps running unchanged (it feeds live surfaces);
  consolidation is a separate future decision, note it in the Status line.
- Orchestration: tier **weekly** (`TIERS.weekly` + run-all switch case) —
  ministries publish steadily but not urgently; daily would spend minutes
  for near-zero delta. Full `add-data-source` checklist applies (ops,
  inventory, STALE_LIMIT_DAYS 10d, docs).

### P3.2 Surface

Keep v1 minimal: a "Rilis kementerian terbaru" section on `/program`
(P2's page) — grouped list, newest first, ministry `short_name` badge per
row, reusing `NewsCard`-style rows or `CompactArticleList` (unused
inventory — revive it here if it fits). No new route. If P2 is not yet
merged, the scraper still ships (data first, surface follows P2).

### P3.3 Per-ministry rollout discipline

Enable ministries one at a time: verify registry entry → add
`release_source` → run scraper locally → eyeball 10 records (real labor
relevance, real dates, working links) → commit that ministry → next.
A big-bang 10-ministry enablement guarantees silent selector failures.

## What NOT to do

- No scraping of unverified registry entries, ever.
- No general-news expansion: LABOR_KEYWORDS filtering is not optional
  (guardrail a — this is what keeps a 10-ministry feed from becoming a
  government news portal).
- No per-ministry bespoke scraper files; the registry IS the extension
  point. If a ministry's site truly cannot fit api/rss/html dispatch,
  record it as `release_source: null` + a note, and move on.
- No Gemini summarization of releases in v1 (quota; revisit after volume
  is known).

## Acceptance criteria

- [ ] Scraper runs locally: verified ministries fetched, unverified
      skipped-and-counted, per-ministry failures produce `partial` ops
      status with named ministries in the error string.
- [ ] Second run adds zero duplicates; records all carry `ministry_id` +
      provenance fields; dates pass `data-validation` date rules.
- [ ] Weekly tier + ops inventory + STALE_LIMIT_DAYS + docs registration
      complete (`add-data-source` DoD).
- [ ] At least Kemnaker-equivalent quality on 2+ newly-enabled ministries
      (spot-check 10 records each, documented in the commit body).
- [ ] `kemenaker.ts` untouched and still green.
- [ ] Status line updated (which ministries enabled, which deferred and
      why).
