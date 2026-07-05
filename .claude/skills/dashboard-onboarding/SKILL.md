---
name: dashboard-onboarding
description: >-
  Read-me-first system map for the DashboadPercobaan repo (Dashboard Berita
  Ketenagakerjaan, live at https://dashboardtakresmi.vercel.app). Use this at
  the START of every session on this repo, before any other skill and before
  editing any file — even for "small" tasks. Also use it whenever you are
  unsure which part of the system owns a behavior, what an Indonesian term
  (TPT, Sakernas, BRS, wisman…) means, which script produces a data file, or
  which page consumes it. Every other skill in this library assumes you have
  read this one.
---

# Dashboard onboarding

## What this project is

An **autonomous Indonesian labor-market statistics dashboard**. It aggregates
official statistics (BPS, Kemenaker, BI, ASEAN NSOs, World Bank), labor news
from 30 configured outlet feeds (24 RSS + 6 HTML; some outlets contribute
several feeds), Google Trends signals, and academic research —
then presents them simply, in Indonesian, with a verifiable source link on
every number. "Autonomous" is literal: GitHub Actions scrape and commit data
on schedules; no human touches the routine data flow.

## The 3-layer architecture (memorize this)

```
[1] GitHub Actions workflows (cron)          .github/workflows/*.yml
        └─ run scrapers under scripts/       scripts/run-all.ts, scripts/scrapers/*
              └─ commit JSON into data/      the entire "database" is git
[2] data/ — committed JSON files             one directory per source
[3] Next.js 16 static export (output:"export")
        └─ src/lib/data-loader-server.ts     fs.readFileSync at BUILD time
              └─ server page.tsx → *Client.tsx (Recharts)
```

- Layer 3 reads layer 2 **at build time only**. There is no server at runtime.
  The single exception: `/berita`'s client fetches
  `${NEXT_PUBLIC_BASE_PATH}/data/news/historical-seed.json`, the one file
  `scripts/prepare-static-assets.ts` copies into `public/data/` on
  `predev`/`prebuild`.
- Every scrape commit to `master` (except scholar's `[skip ci]` commits)
  triggers a rebuild/deploy, which is how new data reaches the site (Vercel
  auto-deploy; legacy GitHub Pages via `.github/workflows/deploy.yml`).
- **Why this shape:** zero-cost autonomous operation on a GitHub Pro account +
  Vercel free tier. No database to pay for or lose; data provenance is a git
  diff; the site works from any checkout. Preserve this property — designs
  that need a runtime backend fail the project's cost envelope
  (`project-guardrails`).

## References (read on demand)

- `references/architecture-map.md` — full matrix: workflow → scraper →
  data file → loader function → page. Read when tracing any behavior
  end-to-end.
- `references/glossary.md` — **the** shared glossary of Indonesian
  statistical terms, institutions, and data-field conventions. All other
  skills point here. Read when any domain term is unfamiliar; never guess
  what TPT or NTP means.
- `references/data-catalog.md` — per `data/` directory: producer, consumer,
  schema sketch, cadence, and trust tier (scraped vs hand-seeded). Read
  before touching anything under `data/`.

## Session protocol

Cheap sessions succeed here by routing, not by improvising:

1. Read this skill (you are doing it).
2. Apply `project-guardrails` to the request: mission test, source hierarchy,
   simplicity budget, cost envelope. If the request fails a guardrail, say so
   and propose the nearest compliant alternative.
3. Route to the matching skill:

   | Task smells like… | Skill |
   |---|---|
   | scraper red/stale, missing data, failed workflow, "data belum update" | `pipeline-debugging` |
   | anything calling `webapi.bps.go.id`, BPS variable IDs, BRS scraping | `bps-webapi` |
   | new statistic/feed/API to track | `add-data-source` |
   | editing/committing anything under `data/` | `data-validation` |
   | new/changed chart, page, card, filter, table | `add-visualization` |
   | workflows, secrets, Vercel/Pages, Actions minutes, build failures | `deploy-infra` |
   | summarizer prompt/provider/config; keyword, sector, or outlet list edits | `pipeline-debugging` (its failure-modes §3 owns the summarizer); outlet/keyword edits are config changes — see the "Not a new source" note in `add-data-source` |
   | "improve the dashboard", "more visualization", the revamp (open-ended) | `viz-revamp-roadmap` (stages in order); a **specific** requested chart goes via `add-visualization` unless a stage already specs it |
   | styling/UI polish, "make it look better/modern", any new visual element | `design-taste` (with `add-visualization` for mechanics) |
   | RPJMN, national programmes (Prakerja, JKP…), kementerian tracking, ministry data needs, Susenas | `programme-tracker` (stages P1–P3; owns the data model and `/program` page) |

   Tasks usually cross two skills (e.g. new source → `add-data-source` for the
   pipeline, then `add-visualization` for the surface). Do them in that order.
4. Plan before editing. State which files you will touch and why.
5. Before committing, run the **Definition of done** section of every skill
   you used. `npm run lint` and `npm run build` are the universal floor.

## Facts sessions get wrong without this skill

- `src/lib/data-loader.ts` loads **nothing** — it performs zero I/O. After the
  Stage 0 purge it exports only two guarded missing-file fallbacks
  (`getSampleBPSData`, `getSampleNewsData`). The real loader is
  `src/lib/data-loader-server.ts`.
- Five files under `data/bps/` have **no producing script** (hand-committed
  history): `national-historical.json`, `national-tpt-sakernas.json`,
  `provinsi/tpt-historical.json`, `historical-ihk-trade.json`, `wisman.json`.
  No scraper will regenerate them; never "fix" them by inventing values.
- Stage 0 of `viz-revamp-roadmap` cleared the old always-sample surfaces:
  PMI, the makro-indonesia/overview PHK surfaces, the overview ASEAN
  snapshot, and overview source metadata now render **real data or an honest
  Indonesian empty state** (done 2026-07-05). No production surface renders
  fabricated numbers; see `add-visualization`'s sample-data trap for the
  resolved history.
- `AGENTS.md` contains the Next.js 16 warning: this Next version has breaking
  changes vs your training data — read `node_modules/next/dist/docs/` before
  writing Next-specific code.
- UI language is Indonesian; code and comments are English; domain terms stay
  Indonesian (glossary).

## Definition of done

Onboarding is done when you can answer, without re-opening files: which layer
owns the bug/feature you were asked about, which skill you will follow, which
data files and pages are involved, and what verification commands you will run
at the end. If you cannot, read the relevant reference file above before
proceeding.
