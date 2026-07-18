---
name: add-data-source
description: >-
  End-to-end checklist for adding a new data source to the DashboadPercobaan
  pipeline — a new statistic, API, RSS feed, ministry publication, or index
  the dashboard should track autonomously. Use this whenever the task
  involves fetching data the repo does not fetch yet, "tracking X", "adding Y
  statistics", or wiring an existing-but-unconsumed file to the UI. Skipping
  steps here is how sources end up scraped-but-invisible (like bi-pmi) or
  visible-but-never-refreshed. Follow every step in order; each exists
  because a past source went wrong without it.
---

# Adding a data source

A source is "added" only when it flows the whole way: **fetched on a
schedule → committed with provenance → typed → loaded at build → rendered
with attribution → visible in ops**. The repo has cautionary counterexamples
for partial wiring: `data/bi/pmi/series.json` is scraped monthly but no
loader consumes it (the UI shows sample PMI data instead), and `setkab` has a
scraper and config but sits in no workflow, so it silently stopped updating.

## Gate first (5 minutes, saves a week)

Apply `project-guardrails` before any code:

- **Mission test**: does this source help monitor the Indonesian labor
  market?
- **Source hierarchy**: is it official (BPS/ministry/NSO)? If it is a modeled
  estimate, it must render labeled and opt-in — plan the UI accordingly.
- **Cost envelope**: free API/feed, bounded pagination, fits an existing
  cron tier.
- **Autonomy**: it must refresh without a human. If the source has no
  API/feed and needs manual curation, model it as a hand-seeded file with a
  documented update procedure instead (see `data-catalog.md`), and say so.

If the source is BPS, read `bps-webapi` now — variable discovery and quota
discipline live there.

**Not a new source (common false positives for this skill):** adding another
news outlet to the existing aggregator is a one-entry edit to
`scripts/config.ts:NEWS_OUTLETS` (+ a local `scrapeNews` run to verify, and
optionally `scripts/clean-db.ts` to re-tag — see
`pipeline-debugging/references/recovery-playbooks.md` §5), NOT a new
scraper/tier/workflow. Likewise keyword or KBLI-sector list changes are
config edits (`scripts/config.ts` scraper-side AND `src/lib/constants.ts`
app-side — the two copies are deliberate, update the one(s) your change
affects, then `clean-db.ts`). Use the full checklist below only when the
data comes from a genuinely new origin with its own fetch-and-store cycle.

## The checklist (in order)

1. **Registry — `scripts/config.ts`.** Add a config block (URL(s), keywords,
   `dataDir`) following the existing pattern (`BI_PMI`, `SETKAB`…). Constants
   used by app code live in `src/lib/constants.ts` — note the two files hold
   deliberately separate copies (scraper-side vs app-side); put scraper
   config in `scripts/config.ts`.

2. **Scraper — `scripts/scrapers/<name>.ts`.** Export one async entry
   function returning `{ total, newItems }`-style metrics (the ops logger
   maps `total`→`items_fetched`, `newItems`→`items_new`). Rules:
   - Use `fetchWithRetry` + `FETCH_HEADERS` + `RATE_LIMIT.defaultDelayMs`
     from config — and remember `fetchWithRetry` **returns** non-OK
     responses; check `res.ok` before `.json()`.
   - Every record gets `_source_url` and `_scraped_at`. No exceptions.
   - Append-merge with dedupe by a stable key (usually `link`), so re-runs
     are idempotent. Write with `writeJSON` (2-space indent).
   - Partial failure: return an `error` string in the result (→ ops
     `partial`) rather than throwing away the run; throw only when nothing
     was achievable.
   - No `main()` at module load (scholar.ts's mistake — importing it
     triggers a scrape). Guard with `require.main === module` if you add a
     CLI runner.

3. **Orchestration — `scripts/run-all.ts` + `TIERS`.** Add a `case` to the
   `runScraper` switch and put the name into the right tier in
   `scripts/config.ts:TIERS` (daily = news-ish, weekly = statistics that
   move weekly, monthly = slow official series). The tier's existing
   workflow cron then covers it — a new workflow yml is needed only for a
   different cadence (copy `scrape-bps-brs-daily.yml` as the template:
   permissions `contents: write`, Node 20, `npm install --no-package-lock`,
   scoped `git add`, `git diff --staged --quiet || git commit`).

4. **Data directory — `data/<source>/...`.** One directory per source;
   dated filenames zero-padded (`YYYY-MM-DD.json` / `YYYY-MM.json`) because
   consumers pick files lexically. Document the schema by example in the
   file itself (real first records, never invented ones).

5. **Types — `src/types/index.ts`** (or a typed interface exported from the
   loader, the newer pattern in `data-loader-server.ts`).

6. **Loader — `src/lib/data-loader-server.ts`.** Build-time `fs` read,
   `try/catch` returning `null`/`[]` with `console.error` — copy
   `getBPSWismanData()` as the minimal template. **Never** put loaders in
   `src/lib/data-loader.ts` (sample generators only) and never fetch at
   runtime (`add-visualization` owns that invariant).

7. **Surface — page/component.** Follow `add-visualization` end-to-end:
   server page passes props → client renders shared charts → Indonesian
   labels → source attribution box → empty state.

8. **Ops visibility.** Confirm a run writes an ops entry (comes free via
   `withOpsLog` when run through run-all) and appears in
   `data/_metadata.json`. Add the source to `getDataInventory()` in
   `data-loader-server.ts` with a sensible staleness window so /operasional
   watches it forever — and add the same window to `STALE_LIMIT_DAYS` in
   `src/app/operasional/OperasionalClient.tsx` (a second, client-side
   table; a scraper missing there silently gets the 14-day default. Stage 4
   of `viz-revamp-roadmap` will centralize this duplication).

9. **Docs.** Add the source to `README.md` (Official Data Sources) and, if
   it involves news/keywords, `SCRAPING_ARCHITECTURE.md`. Update
   `dashboard-onboarding/references/data-catalog.md` and
   `architecture-map.md` — the skill library must never lag the system.

## Worked example

`references/worked-example.md` walks the full checklist against the repo's
own `bi-pmi` source — including the two steps it skipped (loader +
inventory) and exactly what closing them looks like. Read it before your
first source; pattern-match against it during review.

## Definition of done

```bash
npx tsx scripts/scrapers/<name>.ts     # runs locally, idempotent on 2nd run
npx tsx scripts/run-all.ts --tier <t>  # scraper participates in its tier
npm run lint && npm run build          # loader + page compile and prerender
npm run test:news-quality              # if anything touched news paths
git diff --stat data/                  # only the new source's files changed
```

Plus, by inspection: every new record has `_source_url` + `_scraped_at`; a
second local run adds zero duplicates; the ops file gained an entry with
correct counts; the page renders real fetched data WITH attribution and an
Indonesian empty state; `getDataInventory()` lists the source; README and the
onboarding catalog/map were updated. If any box is unchecked, the source is
not added — it is half-added, which is worse.
