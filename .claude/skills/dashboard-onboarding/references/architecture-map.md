# Architecture map — workflow → scraper → data → loader → page

Full traceability matrix. Verified against the repo; if code and this file
ever disagree, trust the code and fix this file in the same commit.

## 1. Workflows (`.github/workflows/`)

| Workflow | Cron (UTC) | Timeout | Runs | Commits |
|---|---|---|---|---|
| `scrape-daily.yml` (Daily Scrape) | `24 1 * * *`, `24 13 * * *` (08:24 & 20:24 WIB) | 30 min | `scripts/run-news-collection.ts` (12-min step) → `scripts/merge-daily-news-archive.ts` → commit → `scripts/summarizer/gemini-summarize.ts` (8-min step, `continue-on-error`) → commit | `chore(data): daily scrape <date>`, then `chore(data): enrich daily news <date>` |
| `scrape-weekly.yml` (Weekly Scrape) | `3 22 * * 0` (Mon 05:03 WIB) | 45 min | Python 3.11 setup + `pip install -r requirements.txt`; `npx tsx scripts/run-all.ts --tier weekly` | `chore(data): weekly scrape <date>` |
| `scrape-monthly.yml` (Monthly Scrape) | `3 18 28-31 * *` | 60 min | bash guard (only if tomorrow is the 1st, or dispatch) → `run-all.ts --tier monthly` | `chore(data): monthly scrape <date>` |
| `scrape-bps-brs-daily.yml` (Daily BPS BRS Refresh) | `17 5 * * *` (12:17 WIB) | 20 min | fails early if `BPS_API_KEY` empty; `npx tsx scripts/scrapers/bps-html.ts` with `BPS_BRS_MAX_PAGES_PER_YEAR: '8'`; `git pull --rebase` before push | `chore(data): refresh BPS BRS <date>` |
| `scrape-scholar.yml` | `0 0 */3 * *` | none | `scholar.ts` then `openalex-research.ts` | `Auto-update academic research data [skip ci]` — the ONLY `[skip ci]` |
| `deploy.yml` (Deploy — GitHub Pages, legacy) | on push to `master` | 15 min | `npm run build` with `NEXT_PUBLIC_BASE_PATH=/<repo-name>`; upload-pages-artifact + deploy-pages | — |

Vercel (the live site) deploys on every push to `master` outside of Actions —
no vercel.json in-repo. Every scrape commit except scholar's therefore
triggers both deploys.

## 2. Tier system (`scripts/config.ts:TIERS`, run by `scripts/run-all.ts --tier <t>`)

- `daily`: `news-aggregator`, `gemini-summarize` — but the daily *workflow*
  actually calls `run-news-collection.ts` and the summarizer directly, not
  `run-all --tier daily`.
- `weekly`: `bps-html`, `kemenaker`, `google-trends-node`, `google-trends-py`,
  `bps-national`, `bps-provinsi`.
- `monthly`: `bi-pmi`, `asean-nso`, `asean-fallback`.
- **Outside every tier/workflow** (manual `npx tsx` only): `setkab` (dormant),
  `bps-sdg-sakernas`, `historical*.ts` backfills, `recover-news-range`,
  `reclean-news-dates`, `dedupe-news-archive`, `clean-db`, and the legacy
  `scripts/scrapers/gemini-summarize.ts` (dead code — the live summarizer is
  `scripts/summarizer/gemini-summarize.ts`).

Every scraper invoked via run-all / run-news-collection is wrapped in
`withOpsLog()` (`scripts/ops/ops-logger.ts`) → appends to
`data/ops/<date>.json` and updates `data/_metadata.json`.

## 3. Source → scraper → data → loader → page matrix

| Source | Scraper (entry fn) | Writes | Loader (`src/lib/data-loader-server.ts` unless noted) | Page |
|---|---|---|---|---|
| 24 RSS + 6 HTML news outlets | `news-aggregator.ts` (`scrapeNews`) | `data/news/<date>.json` | merge → `historical-seed.json` → runtime fetch in `BeritaClient` + `getNewsData()` | `/berita`, `/`, `/operasional` |
| News archive curation | `merge-daily-news-archive.ts` | `data/news/historical-seed.json` | `prepare-static-assets.ts` copies to `public/data/news/` | `/berita` (the one runtime fetch) |
| AI summaries | `summarizer/gemini-summarize.ts` (`runGeminiSummarize`) | `data/summaries/<date>.json` | inventory only (`getDataInventory`) | `/operasional` |
| BPS BRS press releases | `bps-html.ts` (`scrapeBPS`) | `data/bps/<slug>/<YYYY-MM>.json` (8 slugs) | `getBPSBRSArchive()` (6 of the 8 slugs) | `/brs` |
| BPS national indicators | `bps-national.ts` (`scrapeBPSNational`) | `data/bps/national-indicators.json` | `getBPSNationalData()` | `/makro-indonesia`, `/` |
| BPS provincial TPT | `bps-provinsi.ts` (`scrapeBPSProvinsi`) | `data/bps/provinsi/tpt.json` | `getBPSProvinsiData()` | `/makro-indonesia`, `/` (TPT card) |
| BPS SDG variables | `bps-sdg-sakernas.ts` (`scrapeBPSSDGSakernas`, manual) | `data/bps/sdg-sakernas.json` | `getBPSSDGSakernasData()` | `/sdg` (canonical; `/sdg-sakernas` now redirects here) |
| Hand-seeded BPS history (no script) | — | `national-historical.json`, `national-tpt-sakernas.json`, `provinsi/tpt-historical.json`, `historical-ihk-trade.json`, `wisman.json` | `getBPSHistoricalData`, `getBPSTptHistoricalData`, `getBPSProvinsiHistoricalData`, `getBPSHistoricalIhkTradeData`, `getBPSWismanData` | `/makro-indonesia`, `/makro-asean`, `/sdg`, `/` |
| Kemenaker PHK | `kemenaker.ts` (`scrapeKemenaker`) | `data/kemenaker/phk/articles.json` | `getPHKArticles()` | `/operasional`, `/` (count) |
| Setkab RSS (dormant) | `setkab.ts` (`scrapeSetkab`) | `data/setkab/articles/<YYYY-MM>.json` | none | none |
| BI PMI | `bi-pmi.ts` (`runBIPMI`) | `data/bi/pmi/series.json` (currently `[]`) | `getBIPMIData()` (Stage 0) | `/makro-indonesia`, `/` (real series or honest "belum tersedia" empty state) |
| ASEAN NSOs (9 countries) | `asean-nso.ts` (`scrapeASEANNSO`) | `data/asean/nso/<cc>.json` + `_summary.json` | none (best-effort raw captures) | none |
| World Bank ASEAN series | `asean-fallback.ts` (`scrapeASEANFallback`) | `data/asean/fallback/*.json` | `getASEANHistoricalData()` / `getASEANComparableData()` | `/makro-asean`, `/` |
| Google Trends (node) | `google-trends-node.ts` (`scrapeGoogleTrendsNode`) | `data/trends/node/<YYYY-Www>.json` | inline `getTrendArtifact()` in `src/app/tren/page.tsx` | `/tren` |
| Google Trends (python) | `google-trends-py.py` | `data/trends/python/<YYYY-Www>.json` | none (node file is consumed) | — |
| Google Scholar + OpenAlex | `scholar.ts`, `openalex-research.ts` (run `main()` at import!) | `data/research/scholar.json` (shared) | `src/data/research.ts:getAcademicResearch()` (+ `seed.json`) | `/riset-akademik`, `/` |
| Ops telemetry | `ops/ops-logger.ts` (`withOpsLog`) | `data/ops/<date>.json`, `data/_metadata.json` | `getOpsRuns()` (drops `setkab`), `getDashboardMetadata()`, `getDataInventory()` | `/operasional` |
| News recovery manifest | `recover-news-range.ts` (manual) | `data/recovery/news-recovery-state.json` | none (operator-facing) | — |

## 4. Route map

| Route | page.tsx type | Client component | Notes |
|---|---|---|---|
| `/` Ikhtisar | async server | `OverviewDashboard` (server!) | data via `src/lib/overview-data.ts:getOverviewDashboardData()` — real data + honest empty states after Stage 0; only `getSampleBPSData`/`getSampleNewsData` remain as guarded missing-file fallbacks |
| `/berita` Arsip Berita | thin server | `BeritaClient` | the only runtime fetch; filters via `src/lib/news-archive.ts` |
| `/brs` Press Releases | server | `BRSClient` | `getBPSBRSArchive()` |
| `/makro-indonesia` | server | `MakroIndonesiaClient` (~1119 lines) | TPT Sakernas timeline + comparison, IHK, trade, wisman, PMI (real via `getBIPMIData` or empty state), Kemenaker PHK release list (real; the fake-numbers timeline was removed in Stage 0) |
| `/makro-asean` | server | `MakroASEANClient` | BPS-default Indonesia + optional World Bank overlay (the reference pattern for mixing tiers) |
| `/sdg` | server | `SDGSakernasClient` (in `src/app/sdg/`) | canonical SDG page; loads `getBPSSDGSakernasData` + `getBPSHistoricalData` (the 2 unused props/loaders were dropped in Stage 0) |
| `/sdg-sakernas` | `'use client'` redirect | — | legacy route; `router.replace('/sdg')` (Stage 0) |
| `/tren` | server (inline fs reader) | `TrenClient` | reads lexically-latest `data/trends/node/*.json` |
| `/riset-akademik` | server | `RisetAkademikClient` | AND-semantics keyword filter |
| `/operasional` | server (heavy prep) | `OperasionalClient` | ops table, freshness inventory, news-source table; `getOpsRuns()` reads ALL ops files (client caps "Yang perlu dicek" at 6) |

Navigation: `src/lib/constants.ts:NAV_ITEMS` (includes external link to
https://jiprastyo.github.io/arsiptakresmi). Layout chrome: sticky `Header` +
bottom `MobileNav`; `Footer` returns null; `Sidebar.tsx` is unused.

## 5. Build pipeline

```
npm run dev / build
  └─ predev/prebuild: tsx scripts/prepare-static-assets.ts
       └─ copies data/news/historical-seed.json → public/data/news/ (throws if missing)
  └─ next dev / next build (output: "export" → out/)
```

`public/` is generated and gitignored — running `next build` without the npm
script breaks `/berita`. Deploy targets and secrets: see `deploy-infra`.
