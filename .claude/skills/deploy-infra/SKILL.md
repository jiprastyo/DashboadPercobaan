---
name: deploy-infra
description: >-
  Deployment, CI workflows, secrets, and build pipeline for the
  DashboadPercobaan repo. Use this whenever you touch anything under
  .github/workflows/, add or rename a secret/env var, debug a failed build or
  deploy, change npm scripts or next.config.ts, reason about GitHub Actions
  minutes, or the user mentions Vercel, GitHub Pages, cron schedules, "site
  not updating", or "workflow failed". Also read it before adding ANY
  scheduled job — the Actions-minutes budget rules live here.
---

# Deploy & infrastructure

## The two deploy targets (both must always work)

- **Vercel — the live site**: https://dashboardtakresmi.vercel.app.
  Auto-deploys on every push to `master` via the Vercel GitHub integration —
  there is **no vercel.json in the repo** and no Actions workflow for it
  (`.vercel` is gitignored). Builds run `npm run build` (so `prebuild` →
  `prepare-static-assets.ts` runs); `NEXT_PUBLIC_BASE_PATH` is unset →
  **empty basePath**. Because the app is a pure static export, the free
  tier suffices: no serverless functions, no ISR, no middleware — keep it
  that way (`project-guardrails` f).
- **GitHub Pages — legacy**: `.github/workflows/deploy.yml` on push to
  `master`; builds with `NEXT_PUBLIC_BASE_PATH=/<repo-name>` (this is the
  ONLY place that env var is set), verifies `out/` exists, deploys via
  `upload-pages-artifact` + `deploy-pages`; concurrency group `'pages'`,
  `cancel-in-progress: false`.

**The dual-basePath rule:** every change must build and route correctly with
BOTH an empty basePath and `/DashboadPercobaan`. The only basePath-sensitive
runtime code is BeritaClient's archive fetch; keep it that way, and test both
builds (Definition of done). Never hardcode absolute asset paths.

Data flow into production: scrapers commit JSON → push to `master` → both
deploys rebuild → build-time `fs` reads bake the new data in. Site stale but
scrapers green? The failure is in deploy, not scraping (and vice versa —
`pipeline-debugging` owns scraper failures).

## Workflow catalog

Details, timeouts, and commit conventions: `references/workflows.md`.
Summary:

| Workflow | Cron (UTC) | Purpose |
|---|---|---|
| `deploy.yml` | push to master | GitHub Pages build+deploy (legacy) |
| `scrape-daily.yml` | `24 1` & `24 13` | news collection → archive merge → AI summaries |
| `scrape-bps-brs-daily.yml` | `17 5` | BPS BRS refresh (requires `BPS_API_KEY`) |
| `scrape-weekly.yml` | `3 22 * * 0` | BPS stats, Kemenaker, Google Trends (Node+Python) |
| `scrape-monthly.yml` | `3 18 28-31 * *` | BI PMI, ASEAN (guarded to run when tomorrow is the 1st) |
| `scrape-scholar.yml` | `0 0 */3 * *` | Scholar + OpenAlex; the only `[skip ci]` committer |

Known quirk to preserve knowingly: scrape workflows use
`npm install --no-package-lock` (NOT `npm ci`) — scraper runs can resolve
different dependency versions than the committed lockfile. Suspect this when
a scraper breaks with no code change. deploy.yml uses plain `npm install`.

## Secrets & env inventory

| Name | Used by | Notes |
|---|---|---|
| `BPS_API_KEY` | scrape-weekly, scrape-bps-brs-daily (fails early if empty) | see `bps-webapi` |
| `GEMINI_API_KEY` | scrape-daily, scrape-weekly, scrape-monthly, deploy | summarizer chain |
| `COHERE_API_KEY`, `GROQ_API_KEY` | scrape-daily | failover providers |
| `GEMINI_API_KEY_BACKUP` | passed by 3 workflows, **read by no code** | dead plumbing — the real multi-key mechanism is `GEMINI_API_KEYS` (comma-separated, read by the summarizer, currently set in NO workflow). When touching these workflows, flag this mismatch; to add Gemini capacity, set `GEMINI_API_KEYS`. |
| `BPS_BRS_MAX_PAGES_PER_YEAR` / `BPS_BRS_BACKFILL_START_YEAR` | env knobs, not secrets | quota discipline (`bps-webapi`) |

Locally: put keys in `.env.local` — `scripts/config.ts` and `run-all.ts`
parse it themselves (never overriding already-set vars). It is gitignored;
never commit keys, never echo them into logs.

## GitHub Actions budget (why jobs look "paranoid")

GitHub Pro minutes are finite and shared with everything else the owner
runs. The discipline: every job has a `timeout-minutes` (30/45/60/20/15) and
inner step timeouts for flaky phases (news collection 12 min, summarizer
8 min with `continue-on-error`); scrapers are incremental and checkpointed
so a re-run never redoes history. When adding or modifying a job:

- Always set `timeout-minutes` — a hung fetch must not burn 6 hours.
- No polling loops, no unbounded pagination, no retry-forever.
- Prefer joining an existing tier cron over a new schedule.
- Remember every non-`[skip ci]` data commit also triggers BOTH deploys —
  batching commits inside a workflow (as scrape-daily does: two commits,
  not ten) keeps deploy counts sane.

## Build pipeline

```
npm run dev|build
  └─ predev/prebuild: tsx scripts/prepare-static-assets.ts
       (copies data/news/historical-seed.json → public/data/news/; THROWS if missing)
  └─ next dev|build   (output:"export" → out/, trailingSlash, images unoptimized)
```

What breaks builds, in observed order of likelihood: (1) a data file whose
schema a build-time loader/page no longer tolerates — the export prerenders
every route, so bad data = failed build (this is a feature: it stops bad
deploys); (2) running `next build` directly without the npm script → no
`public/data/` → `/berita` 404s its archive; (3) type errors in
`*Client.tsx` (strict TS); (4) lockfile drift in scrape workflows (above).
Local dev loop: `npm run dev`; lint with `npm run lint`.

## Worked example: "the site hasn't updated since yesterday"

1. `git log --oneline -10` — are scrape commits landing? If none since
   yesterday → workflows: Actions tab (or `pipeline-debugging`).
2. Commits exist → check deploys. Vercel dashboard: is the latest commit
   built and promoted? Pages: did `deploy.yml` succeed?
3. deploy.yml failed at `npm run build` with a JSON/type error → a data
   commit broke a build-time read. Fix the data (`data-validation`), or the
   loader's tolerance, and push; both deploys self-heal on the next commit.
4. Vercel built but content is stale → confirm the page's loader actually
   reads the changed file (`dashboard-onboarding/references/architecture-map.md`
   — several files are written but unconsumed, e.g. `bi/pmi`).

## Definition of done

- `npm run build` passes locally, AND
  `NEXT_PUBLIC_BASE_PATH=/DashboadPercobaan npm run build` passes (Pages
  simulation).
- Workflow changes: `timeout-minutes` present; commit steps use scoped
  `git add` + `git diff --staged --quiet || git commit`; committer stays
  `github-actions[bot]`; concurrency groups preserved on deploy/BRS jobs;
  state the minutes impact ("adds ~N min/month because …").
- Secrets: no new secret without documenting it in the table above (edit
  this skill in the same PR); never print secret values.
- After merging a workflow change, verify the next scheduled run in the
  Actions tab actually succeeded — a broken cron fails silently for days
  otherwise.
