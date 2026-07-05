# Data catalog — every `data/` directory

Trust tiers: **scraped** (a script produces it on schedule), **manual-run**
(a script exists but no workflow runs it), **hand-seeded** (no producing
script — committed by a human; edit only with an official source in hand),
**derived** (produced from other repo data). Full JSON field lists live in
`data-validation/references/schemas.md`.

| Path | Producer | Cadence | Consumer | Trust | Notes |
|---|---|---|---|---|---|
| `data/_metadata.json` | ops-logger `updateMetadata` | every wrapped run | `/operasional` | derived | `{lastUpdated, scrapers:{<name>:{lastFetch,lastStatus,lastLatencyMs,lastItemsFetched}}}` |
| `data/ops/<YYYY-MM-DD>.json` | ops-logger `withOpsLog` | every wrapped run (appends) | `/operasional` (`getOpsRuns()` reads ALL ops files, flattened newest-first, `setkab` dropped; the client caps only the "Yang perlu dicek" panel at 6 items) | derived | flat array of OpsLogEntry |
| `data/news/<YYYY-MM-DD>.json` | `news-aggregator.ts` (2× daily) | daily | summarizer input; merged into archive; pruned in place by merge curation | scraped | |
| `data/news/historical-seed.json` | `merge-daily-news-archive.ts` | daily | `/berita` (runtime fetch of the `public/` copy), `/`, `/operasional` | derived | ~1,900 articles; also mutated by manual dedupe/reclean/clean-db |
| `data/summaries/<date>.json` | `summarizer/gemini-summarize.ts` | daily | `/operasional` inventory | scraped | provider chain gemini→cohere→groq; `_ai_provider:'fallback'` = stub |
| `data/bps/<slug>/<YYYY-MM>.json` | `bps-html.ts` | daily (BRS workflow) + weekly tier run | `/brs` | scraped | 8 slugs: ihk, ekspor-impor, wisman, transportasi, ketenagakerjaan, pertumbuhan-ekonomi, kemiskinan, ntp (BRS page reads 6) |
| `data/bps/national-indicators.json` | `bps-national.ts` | weekly | `/makro-indonesia`, `/` | scraped | `source: official_api` or `static_seed` (hardcoded fallback rows — UI must warn) |
| `data/bps/provinsi/tpt.json` | `bps-provinsi.ts` | weekly | `/makro-indonesia`, `/` | scraped | schema is period-specific (`tpt_feb_25`, `tpt_feb_26`) |
| `data/bps/sdg-sakernas.json` | `bps-sdg-sakernas.ts` | manual-run | `/sdg` | manual-run | throws without `BPS_API_KEY` |
| `data/bps/national-historical.json` | — | never | `/`, `/makro-asean`, `/sdg` | **hand-seeded** | yearly `{year,tpt,tpak}` since 1986 |
| `data/bps/national-tpt-sakernas.json` | — | never | `/makro-indonesia` | **hand-seeded** | exact Sakernas observation dates 1986–2026; 1995 absent by design |
| `data/bps/provinsi/tpt-historical.json` | — | never | `/makro-indonesia` | **hand-seeded** | per-province Sakernas history (the unused `/sdg` load was dropped in Stage 0) |
| `data/bps/historical-ihk-trade.json` | — | never | `/makro-indonesia` | **hand-seeded** | `source:'historical_seed'`, synthetic-precision floats |
| `data/bps/wisman.json` | — | never | `/makro-indonesia` | **hand-seeded** | same caveat |
| `data/kemenaker/phk/articles.json` | `kemenaker.ts` | weekly | `/operasional`, `/` | scraped | PHK-filtered press releases |
| `data/setkab/articles/<YYYY-MM>.json` | `setkab.ts` | none (dormant) | none | manual-run | currently `[]` |
| `data/bi/pmi/series.json` | `bi-pmi.ts` | monthly | `getBIPMIData()` -> `/makro-indonesia`, `/` | scraped | currently `[]`; UI shows real series or an honest "belum tersedia" empty state (Stage 0 wired the loader; scraper still yields `[]`) |
| `data/asean/nso/<cc>.json`, `_summary.json` | `asean-nso.ts` | monthly | none | scraped | raw best-effort NSO captures; per-country `error` fields common -- routine `partial` on this scraper is expected steady-state, not an alarm (`EXPECTED_PARTIAL`, `pipeline-debugging/references/failure-modes.md` #8); staleness window is 400 days, same ~1yr-lag reasoning as the row below |
| `data/asean/fallback/SL.*.json`, `_by_country.json`, `_summary.json` | `asean-fallback.ts` | monthly | `/makro-asean`, `/` | scraped | World Bank modeled series 1991–2026, 11 countries incl. TLS. **Expected lag ~1 year**: comparator countries capping at the previous year is normal source latency, not staleness — Indonesia's BPS line extending further is by design. Staleness window raised to 400 days (post-audit B3+D3) to match this lag, same reasoning `getBenchmarkTargets()` already used |
| `data/trends/node/<YYYY-Www>.json` | `google-trends-node.ts` | weekly | `/tren` (lexically latest file) | scraped | full overwrite per week |
| `data/trends/python/<YYYY-Www>.json` | `google-trends-py.py` | weekly | none | scraped | snake_case variant; not consumed |
| `data/research/scholar.json` | `scholar.ts` + `openalex-research.ts` (shared) | every 3 days | `/riset-akademik`, `/` | scraped | merged, deduped by DOI/title+year |
| `data/research/seed.json` | — | never | `/riset-akademik` | **hand-seeded** | curated seed findings |
| `data/benchmarks/targets.json` | — | never | `/sdg`, `/makro-indonesia`, `/makro-asean` | **hand-seeded** (hand-curated) | official SDG/RPJMN/ASEAN targets; every entry cites its publication URL; loaded by `getBenchmarkTargets()` (staleness window 400 days), rendered as ReferenceLine/Area only, never a data series. Loader skips null-valued/TODO-placeholder entries. Computed entries (e.g. ASEAN median) derived from repo data and labeled `(dihitung)` |
| `data/recovery/news-recovery-state.json` | `recover-news-range.ts` | manual-run | operator only | derived | recovery manifest/checkpoint |
| `data/program/*` (PLANNED) | `bps-susenas.ts` + hand-curated registries + `ministry-releases.ts` | see `programme-tracker` stages P1–P3 | `/program` (planned) | mixed | ministries/needs/programmes registries (hand-seeded), Susenas indicators (scraped), ministry releases (scraped). Rows become real when P1/P3 land — update this table then |

## Rules that follow from this table

1. **Hand-seeded files are edit-only-with-official-source.** No scraper will
   ever overwrite or "refresh" them. If a task says "update the historical
   TPT series", the only acceptable input is a BPS publication URL you cite
   in the commit message.
2. **A file existing does not mean it is consumed.** `asean/nso`,
   `trends/python`, `setkab` are written but unread. (`bi/pmi` gained a
   loader in Stage 0, but the file is still `[]` until the scraper is fixed,
   so the UI shows an empty state.) Check the consumer column before assuming
   a UI effect.
3. **File naming is load-bearing.** Ops and trends consumers pick the
   lexically-last filename — keep zero-padded `YYYY-MM-DD` / `YYYY-Www`.
   BRS monthly files must match `/^\d{4}-\d{2}\.json$/`.
4. **`source` field is the provenance signal.** `official_api` vs
   `static_seed` / `historical_seed` / `fallback_spreadsheet` drives UI
   warning banners. Never relabel a seed as `official_api`.
