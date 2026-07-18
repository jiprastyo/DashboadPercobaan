# Recovery playbooks — exact commands and semantics

All scripts run with `npx tsx <path>` from the repo root; keys/env in
`.env.local` (auto-loaded by `scripts/config.ts`). Several mutate
`data/news/historical-seed.json` — take the pre-state (`git status` clean,
note `jq length` counts) before running anything, and finish every playbook
with the `data-validation` quality gates.

## 1. Backfill missing news for a date range — `recover-news-range.ts`

```bash
START_DATE=2026-06-24 BEFORE_DATE=2026-06-28 npx tsx scripts/recover-news-range.ts
```

- Phase 1 re-reads all RSS outlets keeping items with pubDate in
  `[START_DATE, BEFORE_DATE)` that pass keyword + quality gates. Phase 2
  queries Google News RSS (3 OR-query batches) and decodes
  `news.google.com/rss/articles/...` links to real publisher URLs.
- Env knobs: `GOOGLE_FAILURE_LIMIT` (default 3 — consecutive failed queries
  open a circuit breaker and abort phase 2), `GOOGLE_QUERY_DELAY_MS` (1200),
  `MAX_GOOGLE_ITEMS_PER_QUERY` (30), `GOOGLE_DECODE_CONCURRENCY` (5).
- Appends unique articles into the correct `data/news/<day>.json` files
  (key: normalized publisher URL, else normalized title).
- **Manifest:** `data/recovery/news-recovery-state.json` — rewritten at each
  checkpoint: `{started_at, finished_at?, start_date, before_date, status:
  running|success|partial|error, direct_items, google_items, accepted_items,
  google_circuit_open, errors[]}`. `partial` = circuit opened or errors
  recorded; results up to that point are still persisted.
- **After it:** run the merge (playbook §4) to pull recovered rows into the
  archive, then verify (§6).

## 2. Repair estimated/wrong article dates — `reclean-news-dates.ts`

```bash
npx tsx scripts/reclean-news-dates.ts
# retry rows previously marked fallback_estimate:
RETRY_CHECKED_FALLBACKS=1 npx tsx scripts/reclean-news-dates.ts
# smoke-test on a sample first:
SAMPLE_LIMIT=50 npx tsx scripts/reclean-news-dates.ts
```

- Targets archive rows with `is_estimated: true` whose `_source_url` is a
  Google News RSS link (the `synthetic-dates.ts` legacy population — that
  script once assigned uniformly random dates to bulk imports; this one
  repairs them).
- Resolution order: Google News title-search match (similarity ≥ 0.72) →
  `date_source: 'original_feed'`; else decode URL → fetch page → meta-tag /
  JSON-LD date → `date_source: 'article_metadata'`; else stamped
  `date_checked_at` + `date_source: 'fallback_estimate'` (stays estimated,
  badged amber in UI).
- Knobs: `BACKFILL_CONCURRENCY` (8), `REQUEST_TIMEOUT_MS` (12000),
  `RSS_TIMEOUT_MS` (8000), `CHECKPOINT_EVERY` (100 — interim writes of the
  archive, so a crash loses ≤100 rows of progress).

## 3. Deduplicate the archive — `dedupe-news-archive.ts`

```bash
npx tsx scripts/dedupe-news-archive.ts          # DRY RUN — report only
npx tsx scripts/dedupe-news-archive.ts --write  # apply
```

- Groups by exact `id`, canonical URL, and fuzzy same-day titles (≥5
  non-stopword tokens, Jaccard ≥ 0.92). Keeper = highest metadata score
  (verified date source, real URL, `is_estimated:false`, field richness);
  keeper absorbs `duplicate_ids/sources/count`.
- ALWAYS dry-run first and read `{before, after, removed, duplicateGroups}`;
  an unexpectedly large `removed` means an upstream bug (e.g. IDs
  regenerated), not "lots of dupes".

## 4. Re-curate / merge the archive — `merge-daily-news-archive.ts`

```bash
npx tsx scripts/merge-daily-news-archive.ts
```

- Merges every `data/news/YYYY-MM-DD.json` into `historical-seed.json` with
  full curation (real publisher URL, parseable + verified-source +
  plausible date, ≥1 labor keyword). **Side effect: rewrites daily files in
  place, deleting rows that fail curation** — the diff on daily files is
  expected, but review it.
- This is the same step the daily workflow runs; safe to re-run anytime
  (idempotent by stable `id` + richest-merge).

## 5. Re-tag keywords/sectors — `clean-db.ts`

```bash
npx tsx scripts/clean-db.ts
```

Re-derives `keywords_matched` (max 3) and `sector_tags` across the archive
from `src/lib/constants.ts` keyword sets; strips `" - Source"` title
suffixes; removes known-noise articles. Run after changing keyword/sector
lists so old rows match new taxonomy.

## 6. Verify recovery worked (every playbook ends here)

```bash
npm run test:news-quality
jq length data/news/historical-seed.json     # delta matches the manifest/report
git diff --stat data/                        # only expected files
git diff data/ | head -100                   # spot-check shape (see data-validation)
cat data/recovery/news-recovery-state.json   # status success/partial + counts (if §1 ran)
```

Then commit scoped: `git add data/news/ data/recovery/` with
`chore(data): backfill news <range>` (or matching convention), push, and
confirm the next scheduled daily run stays green — recovery that breaks the
*next* run (bad ids, dupes) is the classic failure.

## 7. Missed scheduled scrape — workflow re-run

Prefer `workflow_dispatch` (Actions tab → workflow → Run workflow) over
local runs: identical env, ops logging, and commit scoping. Notes:
scrape-daily's `force` input is decorative (referenced by no step);
scrape-monthly runs on dispatch regardless of its date guard; BRS-daily
requires the `BPS_API_KEY` secret and rebases before push.

## 8. Legacy hazards — do NOT run

- `scripts/scrapers/gemini-summarize.ts` — dead legacy summarizer; mutates
  news files in place with a different schema.
- `scripts/inject-morning-news.ts`, `scripts/inject-new-sources.ts` —
  append **hardcoded fake articles**; historical dev artifacts and a
  standing violation of `project-guardrails` (g) if ever run.
- `scripts/synthetic-dates.ts` — the random-date generator this whole
  repair apparatus exists to clean up after.
- `scripts/scrapers/historical*.ts` — one-time seeding-era backfills;
  superseded by `recover-news-range.ts`.
