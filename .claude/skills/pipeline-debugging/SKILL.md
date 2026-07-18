---
name: pipeline-debugging
description: >-
  Diagnose and fix scraper/workflow failures in the DashboadPercobaan data
  pipeline. Use this whenever a scraper is red or "partial" on /operasional,
  a data file is stale or empty, a GitHub Actions scrape workflow failed, the
  AI summarizer is erroring or falling back, news articles are missing for a
  date range, or the user says anything like "data belum update", "scraper
  mati", "berita hilang", or "the dashboard shows old numbers" — even if they
  only mention the symptom on a page, not the pipeline.
---

# Pipeline debugging

You are debugging a static-export dashboard whose only "database" is JSON under
`data/`, committed by GitHub Actions workflows. There is no server: if a scraper
dies, the site silently keeps serving the last committed JSON forever. That is
why the #1 rule here is: **a silent scraper death is worse than a loud one.**
Every fix must keep the scraper wrapped in `withOpsLog(...)` from
`scripts/ops/ops-logger.ts`, and must never swallow an error that ops logging
would otherwise surface. If your fix makes a red row green by hiding the error
instead of fixing the fetch, you have made the system worse.

For the system map and glossary (TPT, BRS, Sakernas...), read
`../dashboard-onboarding/references/glossary.md` first if any domain term is
unfamiliar. Data QA gates (schemas, date sanity) are owned by the
`data-validation` skill; secrets/workflow infrastructure beyond what is inline
here is owned by `deploy-infra`.

## Triage order (always in this order)

Work from what the operator sees down to the code. Each layer tells you whether
the next one is even worth opening.

1. **Ops data (`data/ops/` + the /operasional page).**
   Every scraper run wrapped by `withOpsLog` appends one entry to
   `data/ops/<YYYY-MM-DD>.json` (a flat JSON array; multiple runs per day
   append to the same file). Entry shape:

   ```json
   {
     "scraper": "news-aggregator",
     "status": "partial",
     "started_at": "2026-07-02T05:10:56.138Z",
     "finished_at": "2026-07-02T05:14:06.887Z",
     "latency_ms": 190749,
     "items_fetched": 11,
     "items_new": 11,
     "errors": ["19 source request(s) failed"],
     "_source_url": "ops:news-aggregator",
     "_scraped_at": "2026-07-02T05:14:06.887Z"
   }
   ```

   Status semantics (from `scripts/ops/ops-logger.ts`):
   - `success` — the scraper resolved and its result had no `error` property.
     **This does NOT prove data was fetched** — see silent-success traps below.
   - `partial` — the scraper resolved but its result object carried an `error`
     string (e.g. news-aggregator's `"N source request(s) failed"`).
   - `error` — the scraper threw. `run-all.ts` continues to the next scraper
     and exits non-zero only if *every* scraper errored, so a mostly-red tier
     run still commits whatever succeeded.

   `getOpsRuns()` in `src/lib/data-loader-server.ts` reads every
   `data/ops/*.json`, drops `setkab` entries, and sorts newest first; the
   /operasional page surfaces the latest run per scraper plus a freshness
   inventory (`getDataInventory()`). For run history, read the dated ops files
   directly.

2. **`data/_metadata.json`.** Written by the ops logger's `updateMetadata` on
   every wrapped run: `{ lastUpdated, scrapers: { <name>: { lastFetch,
   lastStatus, lastLatencyMs, lastItemsFetched } } }`. A scraper missing here,
   or with an ancient `lastFetch`, means its workflow has not been running at
   all — jump to step 3, not to the scraper code.

3. **GitHub Actions run logs.** Match the scraper to its workflow:

   | Workflow | cron (UTC) | runs |
   |---|---|---|
   | `scrape-daily.yml` | `24 1 * * *`, `24 13 * * *` | `scripts/run-news-collection.ts` → `scripts/merge-daily-news-archive.ts` → commit → `scripts/summarizer/gemini-summarize.ts` (step has `continue-on-error: true`) → commit |
   | `scrape-weekly.yml` | `3 22 * * 0` | `run-all.ts --tier weekly` (bps-html, kemenaker, google-trends-node, google-trends-py, bps-national, bps-provinsi) |
   | `scrape-monthly.yml` | `3 18 28-31 * *` | bash guard (runs only when tomorrow is the 1st, or on dispatch), then `run-all.ts --tier monthly` (bi-pmi, asean-nso, asean-fallback) |
   | `scrape-bps-brs-daily.yml` | `17 5 * * *` | `scripts/scrapers/bps-html.ts` with `BPS_BRS_MAX_PAGES_PER_YEAR: '8'`; fails early if the `BPS_API_KEY` secret is empty |
   | `scrape-scholar.yml` | `0 0 */3 * *` | `scholar.ts` then `openalex-research.ts`; the only workflow committing with `[skip ci]` |

   All scrape workflows run `npm install --no-package-lock`, so a scraper can
   execute against different dependency versions than the committed lockfile —
   suspect this when a scraper breaks with no code change and no site change.

4. **The scraper source** (`scripts/scrapers/*.ts`, `scripts/summarizer/`).
   Only now. Reproduce locally with `npx tsx scripts/scrapers/<name>.ts` (most
   scrapers have a `require.main === module` runner), keys in `.env.local` —
   both `scripts/config.ts` and `scripts/run-all.ts` load it automatically
   without overriding already-set env vars.

## The failure modes you will actually see

Read `references/failure-modes.md` for the full catalog with symptoms and
fixes. The short list, because these recur constantly:

- **`fetchWithRetry` returns non-OK Responses instead of throwing.** After the
  last retry, `scripts/config.ts:fetchWithRetry` *returns* the failed Response.
  Callers that immediately `res.json()` an HTML error page produce strings
  like `"<!DOCTYPE ..." is not valid JSON` — exactly what sits per-country in
  `data/asean/nso/_summary.json`. A JSON-parse error string inside a data file
  means the upstream site returned an error page, not that the file is corrupt.
- **news-aggregator `partial` with `"N source request(s) failed"`.** N counts
  failing outlet URLs (30 outlets total); items can still be fetched. A
  steady-state N of ~5–15 is normal (regional outlets flap). Investigate when
  N jumps sharply or `items_fetched` collapses toward 0.
- **AI summarizer quota chain.** The live summarizer is
  `scripts/summarizer/gemini-summarize.ts` (`runGeminiSummarize`) — **NOT**
  `scripts/scrapers/gemini-summarize.ts`, which is a legacy, unreferenced
  script that mutates news files in place. Failover: Gemini
  (`gemini-2.0-flash`; one provider per unique key from `GEMINI_API_KEY` plus
  the comma-separated `GEMINI_API_KEYS`) → Cohere (`COHERE_API_KEY`) → Groq
  (`GROQ_API_KEY`) → per-article fallback stubs with `_ai_provider:
  'fallback'`. **`GEMINI_API_KEY_BACKUP` is passed as env by three workflows
  but read nowhere in the code** — to add Gemini keys, extend
  `GEMINI_API_KEYS`; touching that backup secret does nothing.
- **Google Trends 429s.** Both trends scrapers get rate-limited; node-side
  per-keyword failures are swallowed (empty series, ops still `success`).
- **HTML drift.** Cheerio scrapers (bi-pmi, the 6 HTML news outlets, the BPS
  HTML fallback, asean-nso HTML countries) degrade silently when target markup
  changes.
- **BPS rate limits / quota.** Read the `bps-webapi` skill before touching any
  `bps-*.ts` scraper: page caps and stop conditions protect a shared API
  quota. Never widen them as a "fix".

## Recovering data

Diagnosis tells you *why*; the recovery scripts fill the holes. Read
`references/recovery-playbooks.md` before running any of them — several mutate
`data/news/historical-seed.json` in place. Quick index:

- Missing news for a date range → `scripts/recover-news-range.ts`
  (checkpoints to `data/recovery/news-recovery-state.json`).
- Wrong/estimated article dates → `scripts/reclean-news-dates.ts`.
- Duplicate archive rows → `scripts/dedupe-news-archive.ts` (dry-run by
  default; writes only with `--write`).
- Archive re-curation / pruning bad rows → `scripts/merge-daily-news-archive.ts`.
- Tag/keyword cleanup → `scripts/clean-db.ts`.
- Missed scheduled scrape → `workflow_dispatch` re-run of the workflow.

## Worked example: daily news dropped to near zero

Symptom: /operasional shows news-aggregator `partial`, `items_fetched: 11`,
error `"19 source request(s) failed"`; yesterday it fetched 60+.

1. `data/ops/2026-07-02.json` confirms the entry above. `latency_ms` ~190s is
   normal — there is a 2 s `RATE_LIMIT.defaultDelayMs` between 30+ outlet URLs.
2. `data/_metadata.json` → `news-aggregator.lastFetch` is today, so the
   workflow ran; this is a fetch-level problem, not a scheduling one.
3. Actions log for `scrape-daily.yml`: the collection step logs each outlet;
   19 regional RSS hosts timed out (they share a CDN) while 11 items came from
   healthy outlets. No code bug.
4. Fix: nothing to patch. Once the hosts recover, backfill the thin window
   with `START_DATE=2026-07-01 npx tsx scripts/recover-news-range.ts` (see the
   playbook), then verify with `npm run test:news-quality` and
   `git diff --stat data/news/`.

The anti-pattern would be wrapping the failing fetches in a bare
`try {} catch {}` that drops the `error` string from the result — ops would
show green while 19 outlets stay dead. The `partial` status *is* the feature.

## Definition of done

A pipeline fix is done when ALL of these hold:

```bash
npm run lint                         # no new lint errors
npm run test:news-quality            # must pass if you touched news code/data
npx tsx scripts/scrapers/<name>.ts   # the fixed scraper runs locally end-to-end
#   caveats: bps-* scrapers spend the shared BPS quota — ONE verification
#   run only; scholar.ts / openalex-research.ts execute main() at import
#   and mutate data/research/scholar.json — expect and review that diff
git diff --stat data/                # only expected data files changed, plausible sizes
git diff data/_metadata.json         # scraper's lastStatus/lastFetch updated as expected
```

- The scraper is still wrapped by `withOpsLog` (directly or via
  `run-all.ts`/`run-news-collection.ts`), and a forced failure still produces
  a `partial`/`error` ops entry — prove it, don't assume it.
- No page caps, retry counts, or delays were raised beyond documented limits
  (BPS budget discipline: `bps-webapi` skill).
- If you changed a data schema, run the `data-validation` skill's gates before
  committing. Commit data with the existing conventions
  (`chore(data): <what> <date>`); never rewrite history or force-push.
