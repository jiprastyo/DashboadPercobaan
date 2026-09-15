# Data Sources Map

Reference for diagnosing "why is X stale?" on this dashboard. Written 2026-09-12
after three rounds of investigation (two of them partly wrong — see rules below).

## Two diagnosis rules (learned the hard way)

1. **Audit `origin/master`, not your local checkout.** CI commits data daily; a
   months-old local clone shows everything as stale. The first 2026-09-12 audit
   misdiagnosed a 14-day outage that did not exist.
2. **Distrust `items_fetched: 0` until 2026-09-12.** The ops logger read
   `total`/`totalArticles`/`totalDataPoints`/`countries`/`keywords` but NOT
   `count` — so `bps-national`/`bps-provinsi` logged healthy 94-record runs as
   `fetched=0`. Fixed in `scripts/ops/ops-logger.ts` (`extractItemCounts`).
   A scraper returning `error` is now surfaced as status `partial` on
   `/operasional` — `success + count 0` is now a real failure signal.

## Source → file → scraper → tier

| Data | File(s) | Scraper | Schedule | Status (2026-09-12) |
|---|---|---|---|---|
| BPS national (IHK, ekspor, impor) | `data/bps/national-indicators.json` | `bps-national.ts` (official API) | weekly | OK (94 records) |
| BPS IHK/trade history 2016→now | `data/bps/historical-ihk-trade.json` | `bps-national.ts` (official API; since 2026-09-15, was frozen synthetic seed) | weekly | OK |
| BPS wisman series 2016→now | `data/bps/wisman.json` | `bps-national.ts` (official API var 1150; since 2026-09-15, was frozen synthetic seed) | weekly | OK |
| BPS provincial TPT | `data/bps/provinsi/tpt.json` | `bps-provinsi.ts` (official API) | weekly | OK |
| BPS press releases (8 indicators) | `data/bps/<indicator>/YYYY-MM.json` | `bps-html.ts` | daily (own workflow) | OK |
| National TPT timeline | `data/bps/national-tpt-sakernas.json` | seed + **BRS overlay** at read time (`getBPSTptHistoricalData`) | n/a | OK — press releases extend it (Nov 2025 4.74, Mei 2026 4.65) |
| SDG Sakernas | `data/bps/sdg-sakernas.json` | `bps-sdg-sakernas.ts` | weekly (added 2026-09-12; was orphaned) | OK in CI (needs `BPS_API_KEY`) |
| BI PMI-BI | `data/bi/pmi/series.json` | `bi-pmi.ts` (quarterly press releases) | monthly | OK since 2026-09-12 rewrite (was empty since 06-07) |
| Kemenaker PHK | `data/kemenaker/phk/articles.json` | `kemenaker.ts` (portal API) | weekly | OK — last PHK release Jun 6; source is quiet, not broken |
| Google Trends | `data/trends/*/YYYY-WNN.json` | `google-trends-node.ts` / `google-trends-py.py` | weekly | OK |
| News + summaries | `data/news/`, `data/summaries/` | `news-aggregator.ts`, `gemini-summarize.ts` | daily | OK |
| Scholar | `data/research/scholar.json` | `scholar.ts` | own workflow | OK |
| ASEAN macro (what the UI shows) | `data/asean/fallback/*` | `asean-fallback.ts` (World Bank API) | monthly | OK |
| ASEAN raw NSO pulls | `data/asean/nso/*` | `asean-nso.ts` | **UNSCHEDULED 2026-09-12** | dead: PSA/THA/VNM hosts do not resolve; no UI reads these files |
| Ops health | `data/ops/YYYY-MM-DD.json`, `data/_metadata.json` | `ops-logger.ts` | every run | OK after count fix |

## Frozen seed files (snapshots) — 2 now made live 2026-09-15

No scraper writes these; they are static unless someone regenerates them:
`data/bps/national-historical.json`, `data/bps/provinsi/tpt-historical.json`,
`data/bps/national-tpt-sakernas.json` (read-time BRS overlay compensates for TPT).

**Changed:** `data/bps/historical-ihk-trade.json` and `data/bps/wisman.json`
held SYNTHETIC (fabricated-decimals, "historical_seed") values frozen at
Des 2025 and were the cause of the Makro charts sticking at 2025. They are
now produced by `bps-national.ts` from the official BPS API
(var 2→2245 chained, 196, 497; wisman var 1150 vervar 36) on every weekly
run — full 2016→now backfill once (auto, while `source != official_api`),
then incremental 4-year top-up. `source` field marks which regime applies.

## PMI provenance note

- The PMI-BI chart is Bank Indonesia's **Prompt Manufacturing Index**, published
  **quarterly** via press release ("PMI-BI sebesar 51,43%", Triwulan II 2026).
  Expect ~4 new points per year — that is the source's real cadence.
- The **S&P Global monthly PMI** (the 51,x figures in financial news) is
  licensed; this project does not have it. Do not confuse the two.
- BPS's BRS archive carries **no PMI at all** (verified by grep, zero mentions)
  — an earlier plan to derive PMI from BRS was built on a false-positive probe.
- BI's old `Survei-PMI.aspx` page is a 404 shell; the press-release listing
  shows only the ~7 newest items with no reachable archive, so the scraper
  bootstraps the two known release IDs and picks up each new quarter from the
  listing. Historical quarters before 2026-T1 are not recoverable from BI.
- Sub-indices (output/new orders/employment) are zeros unless a release names
  them; flat sub-lines in the chart are expected, not a bug.

## Verified working alternates (keyless)

- World Bank API: `api.worldbank.org/v2/country/IDN/indicator/…` — unemployment
  2025 available, no key. Already used by `asean-fallback`.
- ILOSTAT API: `ilostat.ilo.org` endpoints — 2025 data, no key.

## Known-dead (probed 2026-09-12; do not retry without re-probing)

IMF (403), PSA Philippines + Thai NSO + Vietnam GSO (DNS), `tablebuilder.singstat.gov.sg`
(404), S&P Global PMI (licensed), `setkab.go.id` (deliberately retired in code).

## Local-run notes

- BI's WAF blocks most local requests (curl 302-walls, fetch timeouts); CI
  reaches it fine. Test parsers locally via unit tests, trust CI for fetches.
- `bps-sdg-sakernas` throws without `BPS_API_KEY` — intentional (no silent
  fallback). CI has the secret.
