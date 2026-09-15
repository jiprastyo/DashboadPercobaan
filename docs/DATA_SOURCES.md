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
| ASEAN macro (what the UI shows) | `data/asean/fallback/_by_country.json` (+ per-indicator WB files) | `asean-tiered.ts` (NSO→WB→OWID→archive cascade; added 2026-09-16) after `asean-fallback.ts` refreshes raw WB tier files | monthly | OK — MY/SG/PH now carry official NSO values (DOSM/SingStat/PSA); other countries modeled ILO, marked hollow ○ in charts |
| ASEAN tier-4 safety snapshot | `data/asean/tiered/_archive.json` | `asean-tiered.ts` (own last-good copy, written only on clean network runs) | monthly | OK — read automatically when every network tier fails |
| ASEAN raw NSO pulls | `data/asean/nso/*` | `asean-nso.ts` | **UNSCHEDULED 2026-09-12** | superseded 2026-09-16: the "PSA/THA/VNM hosts do not resolve" finding was LOCAL-RUNNER ONLY — PSA OpenSTAT, SingStat TableBuilder, data.gov.sg and DOSM all verified live from CI-reachable networks; `asean-tiered.ts` now consumes the live ones. THA/VNM NSO portals remain unreachable (Cloudflare/WAF); no UI reads `data/asean/nso/*` |
| Ops health | `data/ops/YYYY-MM-DD.json`, `data/_metadata.json` | `ops-logger.ts` | every run | OK after count fix |
| RPJMN TPT target bands (chart overlay) | `data/benchmarks/targets.json` | none — hand-curated, verified against official Perpres texts (recipe: `docs/RPJMN_TPT_TARGETS.md`) | n/a (edit rarely) | OK — 5 administration bands 2004→2029, each clipped to its own years since 2026-09-15; guarded by `scripts/tests/benchmark-targets.test.ts` |

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
IHK history is chained across three official base tables (CI-probed
2026-09-15): var 2 (2012=100, 2016–2019) -> var 1709 (2018=100 IHK 90 Kota
Umum, 2020–2023) -> var 2245 (2022=100, 2024–now). The tables share no
overlap months, so each boundary is bridged with the official Jan MtM
inflation rate (var 1, available 2016->now); verified level+rate continuity
by scripts/tests/ihk-chain.test.ts. The old synthetic 2016–2023 IHK seed
rows were dropped (iron rule 1), not scaled over.

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
  2025 available, no key. Already used by `asean-fallback` (tier 2 of
  `asean-tiered`). PITFALL: the v2 API accepts a ';' list for country OR
  indicator, not both at once (HTTP 200 + error body 120) — probe per indicator.
- ILOSTAT API: `ilostat.ilo.org` endpoints — 2025 data, no key. BUT: from a
  residential/office IP the whole domain sits behind a Cloudflare "Just a
  moment..." challenge (403); it may work from CI egress. `asean-tiered` does
  NOT depend on it — tier 3 uses Our World In Data instead.
- Our World In Data grapher CSVs (keyless, no challenge):
  `https://ourworldindata.org/grapher/{unemployment-rate,
  labor-force-participation-rate,employment-to-population-ratio}.csv` — carries
  ILO modeled estimates to 2025 for every ASEAN country (Code column = ISO3).
  Same numbers as World Bank tier 2, so it is a true MIRROR, not extra signal.
- ASEAN NSO endpoints verified LIVE 2026-09-16 (tier 1 of `asean-tiered`):
  - DOSM Malaysia: `api.data.gov.my/data-catalogue?id=lfs_month` — monthly
    u_rate/p_rate/ep_ratio, current to Jun 2026. (`api-open.data.gov.my` does
    NOT resolve — do not use.)
  - SingStat TableBuilder: `tablebuilder.singstat.gov.sg/api/table/tabledata/
    {id}` — needs `User-Agent` + `Accept: application/json` headers (else 302 to
    page-not-found). Old `/api/v1/...` paths are dead. M182341 = unemployment
    rate quarterly (to 2026 2Q). NO keyless official LFPR/EPR table found →
    those stay modeled for SG (and are labelled so).
    data.gov.sg datastore (`d_b816a930bca0eb19fdf20fcbfcdd4c39`) is the backup
    for the same table.
  - PSA Philippines OpenSTAT PXWeb: `openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1B/
    LFS/0021B3FKEI2.px` — GET `?format=json` for metadata; data needs POST
    `{"query":[],"response":{"format":"json"}}` (non-empty query → 404; GET with
    query params silently ignores the filter). CAUTION: "Employment Rate" in
    that table = share of LABOR FORCE (~96%), NOT the employment-to-population
    ratio — EPR is DERIVED as LFPR×(1−UE) and tagged `derived`.

## ASEAN tiered provenance model (2026-09-16)

`asean-tiered.ts` merges per (country, indicator, year): tier 1 official NSO →
tier 2 World Bank modeled → tier 3 OWID modeled mirror → tier 4 repo archive
(`data/asean/tiered/_archive.json`, else the last committed UI file). Every
value in `data/asean/fallback/_by_country.json` carries `kind`
(official/modeled/archive; `derived` for computed ratios) + `source`, plus a
file-level `provenance` registry. The UI (MakroASEANClient) renders non-official
points as hollow ○ dots with an explanatory caption, and the overview page's
`data_tier` label is computed from the panel's own provenance, not the static
constants. Tier-4 use is exercised by `scripts/tests/asean-tiered.test.ts` +
the archive path; `asean-fallback` also refuses to overwrite a good
`_by_country.json` with empty data. Indonesia's UI series remain BPS-first via
the read-time overlay in `getASEANComparableData` (unchanged).

## Known-dead (probed 2026-09-12; corrected 2026-09-16; do not retry without re-probing)

IMF (403), Thai NSO `statbbi.nso.go.th` + `nso.go.th` (Cloudflare WAF 418 from
local egress), Vietnam GSO (DNS fails locally), ilostat.ilo.org direct (CF
challenge), `api-open.data.gov.my` (no DNS), old SingStat `/api/v1/` (302),
S&P Global PMI (licensed), `setkab.go.id` (deliberately retired in code).
CORRECTION: the 2026-09-12 "PSA Philippines + Thai NSO + Vietnam GSO (DNS)"
line was wrong for PSA — `openstat.psa.gov.ph` resolves and serves fresh 2026
data (the old scraper's URL path was simply dead; the working one is under
DB/1B/LFS). The DNS failures were LOCAL-EGRESS only; CI runners reach more.

## Local-run notes

- BI's WAF blocks most local requests (curl 302-walls, fetch timeouts); CI
  reaches it fine. Test parsers locally via unit tests, trust CI for fetches.
- `bps-sdg-sakernas` throws without `BPS_API_KEY` — intentional (no silent
  fallback). CI has the secret.
