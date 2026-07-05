# JSON schema catalog per data/ family

Field names below are load-bearing — consumers reference them literally.
"Consumer expects" lists the fields whose removal/rename breaks the UI (the
coupling contract). All examples are real shapes from the repo, trimmed.

## data/news/<YYYY-MM-DD>.json — daily news (array)

```json
{ "title": "…", "link": "https://www.kontan.co.id/…", "date": "2026-07-02",
  "published_at": "2026-07-02T03:15:00.000Z", "summary": "≤500 chars",
  "outlet": "kontan", "categories": [], "kbli_sectors": [{"code":"c","name":"Industri"}],
  "_source_url": "…", "_scraped_at": "…", "is_estimated": false,
  "date_source": "original_feed", "resolved_url": "…" }
```

## data/news/historical-seed.json — curated archive (array, ~1900 rows)

Superset of daily fields plus: `id` (`daily-<slug>`), `source` (id matching
`NEWS_SOURCES` in src/lib/constants.ts), `source_name`, `excerpt`,
`sector_tags` (KBLI letter ids, `['general']` default), `keywords_matched`,
`date_checked_at?`, `duplicate_count?`, `duplicate_ids?`.
**Consumer expects (BeritaClient + news-archive.ts):** `title`, `date`
(must start `YYYY-MM` for the month filter), `source`, `source_name`,
`excerpt`, `sector_tags[]`, `keywords_matched[]`,
`_source_url|link|resolved_url`, `is_estimated?`, `date_source?`.

## data/summaries/<date>.json — AI summaries (object)

`{ date, totalArticles, totalBatches, failedBatches, totalTokensUsed,
providerChain:[{provider,model}], batches:[{batchIndex, provider, model,
articles:[…], _token_usage:{promptTokens,completionTokens,totalTokens}}],
summaries:[…], _source_url, _scraped_at }` — summary item: `{ title, link,
outlet, ringkasan, dampak_tenaga_kerja, tingkat_dampak
(tinggi|sedang|rendah|tidak_diketahui), angka_penting[], sektor_terdampak[],
kata_kunci[], _source_url, _scraped_at, _ai_provider?, _ai_model? }`.

## data/bps/<slug>/<YYYY-MM>.json — BRS (array)

`{ title, date: "2026-06-02" (from rl_date), summary, link:
"https://webapi.bps.go.id/download.php?f=…", indicator: "<canonical slug>",
_source_url, _scraped_at }`.
**Consumer (`getBPSBRSArchive`)**: needs `title` + (`pdf`|`link`|`_source_url`)
+ (`rl_date`|`date`); drops incomplete rows silently; filename must match
`/^\d{4}-\d{2}\.json$/`.

## data/bps/national-indicators.json & historical-ihk-trade.json

`{ source: "official_api"|"static_seed"|"historical_seed", _source_url?,
data: [{ id: "ihk-2026-05", indicator: "ihk"|"ekspor"|"impor",
period: "Mei 2026", value: 111.4, change_mom?, change_yoy? }] }`
**Consumer:** `indicator`, `period`, `value`, `change_mom` (IHK chart),
`change_yoy` (cards). Trade chart divides `value` by 1e9 — values are raw
USD. `source` drives the fallback banner.

## data/bps/provinsi/tpt.json

`{ source: "official_api"|"fallback_spreadsheet", data: [{ province_code:
"00"|"11"…"98", province_name, tpt_feb_25, tpt_feb_26, _last_updated }] }`
**Consumer:** overview TPT card requires the `province_code === '00'` row
with `tpt_feb_26` and `tpt_feb_25`. Schema is period-specific — a new
Sakernas round means adding fields AND updating consumers together.

## data/bps/national-tpt-sakernas.json & provinsi/tpt-historical.json (hand-seeded)

`.data[]`: `{ id, [province_code, province_name,] year, period_code
("189"|"190"|"191"), period_label, observation_date: "YYYY-MM-DD",
observation_label, axis_label, tpt }`
**Consumer:** timeline requires `observation_date` (parsed to numeric x),
`observation_label`, `tpt`; provincial join key is
`${province_code}|${observation_date}`. 1995 absent by design.

## data/bps/national-historical.json (hand-seeded)

`{ source, _source_url, data: [{ year, tpt, tpak }] }` — feeds overview
chart, SDG EPR derivation (`tpak * (1 - tpt/100)`), and the Indonesia
override in makro-asean.

## data/bps/wisman.json (hand-seeded)

`{ source, _source_url, data: [{ period, indicator: "wisman", value,
change_yoy }] }`.

## data/bps/sdg-sakernas.json

`{ source: "official_bps_webapi_only", _source_url, _generated_at,
requested_codes[], included_indicators: [{ requestedCode, officialCode,
varId, title, shortTitle, unit, subject, sourceNote, metadataNote,
lastUpdate, years:[{year,value}], latestYear, latestValue, breakdownType:
"province"|"industry", breakdownLabel, latestBreakdown:[{code,label,value}] }],
excluded_requested_indicators: [{ requestedCode, officialCode,
status: "metadata_only", title, reason, source }] }`.

## data/kemenaker/phk/articles.json (array)

`{ title, date: "YYYY-MM-DD", summary, link, _source_url, _scraped_at }`.

## data/bi/pmi/series.json (array; currently [])

`{ period, pmi_value, category, description, _source_url, _scraped_at }`.

## data/asean/fallback/

- `_by_country.json`: `{ countries: [{ countryCode: "ID" (2-letter!),
  countryName, indicators: { "SL.UEM.TOTL.ZS": { name, values:
  [{year, value}] }, … } }], _source_url, _scraped_at }`
  **Consumer:** `countryName` must match `country_name_en` or
  `country_name_id` in `ASEAN_COUNTRIES`; Indonesia is `ID` (the client maps
  `IDN→ID`).
- `SL.*.json` per indicator; `_summary.json` run stats.

## data/asean/nso/<cc>.json (raw captures, no UI consumer)

`{ country, countryCode, nsoName, data[], metadata{}, _source_url,
_scraped_at, error? }` + `_summary.json`. Per-country `error` strings are
normal (see pipeline-debugging).

## data/trends/node/<YYYY-Www>.json

`{ week, fetchedAt, keywords[], geo: "ID", results: [{ keyword,
data: [{ keyword, time: "<unix-s>", formattedTime, value }],
averageInterest, regional_interest: { "<region>": value },
_source_url, _scraped_at }], _source_url, _scraped_at }`
**Consumer (/tren):** lexically-latest file; accepts `regional_interest` or
`regionalInterest`; `time` unix-seconds → ISO day.
(`data/trends/python/` is snake_case and currently unconsumed.)

## data/research/scholar.json + seed.json (arrays)

`{ id: "openalex-<hash>"|"scholar-<hash>", title, source, dateRange: "2026",
publishDate?: "2026-06-26", summary, tags[], link?, doi?, taCategory? }`
**Consumer:** `tags` MUST be an array (client `.flatMap`s without guard).

## data/ops/<date>.json (array) & data/_metadata.json

Ops entry: `{ scraper, status: "success"|"partial"|"error", started_at,
finished_at, latency_ms, items_fetched, items_new, errors[], _source_url:
"ops:<name>", _scraped_at }`. Metadata: `{ lastUpdated, scrapers:
{ <name>: { lastFetch, lastStatus, lastLatencyMs, lastItemsFetched } } }`.

## data/recovery/news-recovery-state.json

`{ started_at, finished_at?, start_date, before_date, status:
"running"|"success"|"partial"|"error", direct_items, google_items,
accepted_items, google_circuit_open, errors[] }`.
