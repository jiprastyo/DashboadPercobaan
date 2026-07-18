---
name: bps-webapi
description: >-
  How to use the official BPS Web API (webapi.bps.go.id) in this repo without
  burning the shared quota or GitHub Actions minutes. Use this whenever you
  touch any scripts/scrapers/bps-*.ts file, add or change a BPS indicator or
  variable ID, adjust BRS scraping, plan a historical backfill, debug empty
  BPS responses, or the user mentions BPS, BRS, Sakernas variables, "data BPS
  tidak muncul", or webapi keys — even if the task looks like a one-line
  change to a page cap or year range. Page caps and stop conditions here are
  quota protection, not bugs.
---

# BPS Web API

BPS is the top of this project's source hierarchy (`project-guardrails`), and
the API key is a shared, rate-limited resource. The scrapers encode a budget
discipline: **incremental first, capped always, backfills staged and
deliberate**. Most "fixes" that widen a page cap or year window are actually
regressions — they trade a permanent quota risk for a one-time convenience.

Full endpoint syntax, variable IDs, and response anatomy:
`references/endpoints.md`. Repo-local API notes: `docs/bps-webapi-reference.md`.
Domain terms (TPT, BRS, Sakernas…):
`../dashboard-onboarding/references/glossary.md`.

## The BPS scrapers (4 live + 1 planned)

| Script | What | Output |
|---|---|---|
| `scripts/scrapers/bps-html.ts` (`scrapeBPS`) | BRS press releases via `model/pressrelease`; falls back to HTML scraping of bps.go.id when no key / API failure | `data/bps/<slug>/<YYYY-MM>.json` |
| `scripts/scrapers/bps-national.ts` (`scrapeBPSNational`) | Inflasi (var 1), IHK (2245), Ekspor (196), Impor (497) via `model/data` | `data/bps/national-indicators.json` |
| `scripts/scrapers/bps-provinsi.ts` (`scrapeBPSProvinsi`) | TPT by province (var 543) | `data/bps/provinsi/tpt.json` |
| `scripts/scrapers/bps-sdg-sakernas.ts` (`scrapeBPSSDGSakernas`, manual run, throws without key) | SDG indicator variables (1998, 2003, 2153, 1186, 2008, 2009, 1217) | `data/bps/sdg-sakernas.json` |
| `scripts/scrapers/bps-susenas.ts` (PLANNED — `programme-tracker` stage P1, cloned from the SDG scraper) | Susenas indicators (poverty, gini, education participation; varIds discovered by probe, never guessed) | `data/program/indicators-susenas.json` |

Env: `BPS_API_KEY` (repository secret; present in `scrape-weekly.yml` and
`scrape-bps-brs-daily.yml`; locally via `.env.local`, which `scripts/config.ts`
auto-loads). Without a key, bps-html degrades to HTML scraping and
bps-national writes `source: 'static_seed'` fallback rows — the UI announces
these via warning banners; do not suppress that.

## Canonical indicator slugs (BRS buckets)

`scripts/config.ts:BPS.indicators` defines the 8 slugs that ARE the
`data/bps/` directory names: `ihk`, `ekspor-impor`, `wisman`, `transportasi`,
`ketenagakerjaan`, `pertumbuhan-ekonomi`, `kemiskinan`, `ntp`.

- **The `pertumbuhan-ekonomi` rule:** BPS titles PDB/growth releases many ways
  ("PDB", "pertumbuhan ekonomi", "produk domestik bruto", "ekonomi
  indonesia"). All of them map to the single canonical slug
  `pertumbuhan-ekonomi` so one bucket holds the whole series. When adding
  keywords, extend the slug's keyword list — never create a parallel slug.
- One article matching several indicator keyword lists is written into
  **each** matching bucket (deliberate one-to-many categorization; dedupe is
  per-`link` within a bucket).

## Required BRS record fields

Every BRS record must carry: `title`, `date` (from `rl_date`), `summary`
(cheerio-stripped abstract, ≤500 chars), `indicator` (canonical slug), `link`,
`_source_url`, `_scraped_at`. `link` prefers the **direct PDF**
(`https://webapi.bps.go.id/download.php?f=...` from the API's `pdf` field) so
users land on the official Indonesian PDF, not a detail page. Note the API
exposes `rl_date` but not `sch_date` (verified by probe — see the note
rendered on `/brs`).

## Budget discipline (why the caps exist — do not widen them)

- **Year window:** routine runs cover `max(2024, currentYear-1)` → current
  year. Older years are already committed in `data/bps/` — git IS the cache;
  re-fetching history costs quota and changes nothing.
- **Page caps:** `BPS_BRS_MAX_PAGES_PER_YEAR` (default 8; the daily workflow
  pins `'8'`; backfill mode defaults 30).
- **Early stop:** in routine mode, pagination stops after **2 consecutive
  pages with zero relevant records** — BRS listings are chronological, so
  stale pages predict more stale pages.
- **Dedupe:** by PDF URL / release `link` before writing, so re-runs are
  idempotent.
- **Backfills are staged one-offs:** set `BPS_BRS_BACKFILL_START_YEAR=<year>`
  (must be ≥2000; disables the early stop, raises the page cap) and run
  `npx tsx scripts/scrapers/bps-html.ts` manually or via one-off
  `workflow_dispatch` — **never widen `scrape-bps-brs-daily.yml` itself**.
  Backfill one year range at a time, commit, verify, proceed.

If a task asks for "all BPS history", the compliant shape is: staged backfill
runs + committed results, not a permanent widening of the daily job.

## Hand-seeded BPS files — no scraper will regenerate these

`data/bps/national-historical.json`, `national-tpt-sakernas.json`,
`provinsi/tpt-historical.json`, `historical-ihk-trade.json`, `wisman.json`
have **no producing script**. They are hand-committed history. (A sixth
hand-curated no-scraper file, `data/benchmarks/targets.json`, lives outside
`data/bps/` and holds official SDG/RPJMN/ASEAN targets — same edit-with-source
discipline.) Rules:

- Never expect a scraper run to refresh them; never point a scraper at them.
- Never fabricate or interpolate values into them (`project-guardrails` g).
  Edits require an official BPS publication URL cited in the commit.
- Sakernas series facts encoded in them are intentional: **1995 is absent**
  (no Sakernas that year — do not "fill the gap"), observations are annual
  1986–2004 then Feb/Aug-specific, and provinces appear only from their
  first official observation.

## Worked example: add a new `model/data` variable

Task: track TPAK by province (assume var discovery found var `544` — verify
with a real probe first, see endpoints.md §Discovery).

1. Probe once, manually, with your key:
   `curl "https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/544/th/126/key/$BPS_API_KEY"`.
   Inspect `vervar`/`tahun`/`turtahun` arrays and one `datacontent` key to
   confirm the key-concatenation layout before writing any code.
2. Extend `scripts/scrapers/bps-provinsi.ts` (same file — same cadence and
   page) building keys the way it already does for var 543; reuse its
   fallback and `_last_updated` conventions.
3. Write into the existing output file as new fields (schema change → run the
   `data-validation` gates; the consumer coupling table there tells you what
   the UI expects).
4. Do NOT add a new API call loop per province — var 543/544 responses return
   all provinces in one call. One variable = one request per year, not 38.

## Definition of done

- `npx tsx scripts/scrapers/<file>.ts` runs locally end-to-end with
  `BPS_API_KEY` set, and also degrades cleanly without it (fallback path
  exercised, `source` flag correct).
- Request math stated in the PR/commit: how many API calls does one scheduled
  run now make, and why is that ≤ before (or justified).
- Caps and stop conditions unchanged or tightened; any backfill is a
  documented one-off, not a workflow change.
- `git diff --stat data/bps/` shows only expected files; spot-check one new
  record's `link` opens a real BPS PDF.
- `npm run lint` passes; if a consumed schema changed, `npm run build`
  passes (build-time reads catch breakage) and `data-validation` gates ran.
