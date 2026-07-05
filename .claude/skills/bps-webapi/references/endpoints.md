# BPS Web API — endpoints, variables, response anatomy

Base: `https://webapi.bps.go.id/v1/api/list/...` — path-style selectors, the
API key is a **path segment** (`.../key/<BPS_API_KEY>`), not a query param.
Domain `0000` = national. Also see the repo's own probe notes in
`docs/bps-webapi-reference.md`.

## Endpoints this repo actually uses

### 1. Press releases (BRS) — `bps-html.ts`

```
GET /v1/api/list/model/pressrelease/domain/0000/page/<p>/year/<y>/key/<k>
```

Response `data` items (live-probed 2026-06-26): `brs_id`, `title`,
`abstract` (HTML — strip with cheerio, truncate 500), `rl_date` (release
date — the date to use), `updt_date`, `subj`, `subj_id`, `pdf` (direct
`download.php?f=...` URL — preferred `link`), `thumbnail`, `slide`, `size`.
`sch_date` is NOT present. Pagination info under `data[0].pages`.

### 2. Data series — `bps-national.ts`, `bps-provinsi.ts`, `bps-sdg-sakernas.ts`

```
GET /v1/api/list/model/data/domain/0000/var/<V>/th/<yearIds>/key/<k>
GET /v1/api/list/model/data/domain/0000/var/<V>/turvar/<T>/th/<yearId>/key/<k>
```

Year IDs are BPS-internal, not calendar years. Known mapping in
`bps-national.ts`: `YEAR_IDS = { '2024':'124', '2025':'125', '2026':'126' }`.
Multiple years joined with `;` (`th/124;125;126`).

**Response anatomy:** metadata arrays `var`, `turvar` (sub-variable),
`vervar` (region/category), `tahun` (years), `turtahun` (sub-year: months or
survey rounds) + a flat **`datacontent`** object whose keys are
concatenations of those IDs. The repo's scrapers build keys manually:

- Inflasi MtM (var 1): `999910${thId}${m}` (vervar 9999 = Indonesia,
  turtahun m = month id).
- IHK (var 2245): `15122450${thId}${m}` (vervar 151 = Indonesia in that
  table).
- Ekspor (196) / Impor (497): `99991960${thId}${m}` / `99994970${thId}${m}`;
  values are Million USD — scripts multiply by 1e6 to store raw USD.
- TPT by province (var 543): national `99995430125189`; province
  `${code}00` + `5430125189`; suffix `189` = turtahun **Februari** (August
  rounds use a different turtahun id — probe before assuming).
- SDG scraper (`readDataValue`) tries several key layouts in order:
  `${vervar}${varId}${turvarId}${yearId}0`,
  `${vervar}${varId}${yearId}${turvarId}0`, `${vervar}${varId}${yearId}0`,
  then a prefix/suffix scan. National row is found by label
  (`INDONESIA`/`NASIONAL`/`TOTAL`/`JUMLAH`/…) or code `9999`.

**The layout differs per table.** Always probe one real response and eyeball
`datacontent` keys before coding — key-construction bugs return `undefined`
silently, which looks like "BPS has no data".

### 3. Discovery — finding variable IDs and years

```
GET /v1/api/list/model/var/domain/0000/page/<p>/key/<k>      # list variables
GET /v1/api/list/model/th/domain/0000/var/<V>/page/<p>/key/<k>  # years for a var
GET /v1/api/list/model/turvar/domain/0000/var/<V>/key/<k>    # sub-variables
GET /v1/api/list/model/vervar/domain/0000/var/<V>/key/<k>    # regions/categories
```

The SDG scraper's year discovery (`model/th/...`) is the working example.

## Variable ID registry (as used in code — verify before reuse)

| Var | Meaning | Used by |
|---|---|---|
| 1 | Inflasi bulanan (MtM) | bps-national |
| 2245 | IHK, 150 kab/kota, base 2022=100 | bps-national |
| 196 / 497 | Nilai Ekspor / Impor (Million USD) | bps-national |
| 543 | TPT menurut Provinsi | bps-provinsi |
| 1998 (turvar 922) | SDG 431 | bps-sdg-sakernas |
| 2003 | SDG 552 | bps-sdg-sakernas |
| 2153 | SDG 831 | bps-sdg-sakernas |
| 1186 | SDG 861 | bps-sdg-sakernas |
| 2008 / 2009 | SDG 871A / 871 | bps-sdg-sakernas |
| 1217 | SDG 922 | bps-sdg-sakernas |

SDG codes 852/852A are intentionally **excluded** (metadata-only entries in
`sdg-sakernas.json`) because the available BPS tables are breakdowns, not a
long-run benchmark — the Sakernas benchmark panel on `/sdg` covers them.

## Error and status handling

- Success envelope: `{ status: 'OK', data: [pageInfo, items] }` for list
  models; non-OK `status` or missing `data` = treat as failure/stop.
- `fetchWithRetry` (from `scripts/config.ts`) **returns** the final non-OK
  Response after retries instead of throwing — check `res.ok` (or
  `data.status`) before `res.json()` on anything new you write, or you will
  produce `"<!DOCTYPE" is not valid JSON` errors like the ASEAN scraper did.
- Quota/rate-limit symptoms: HTTP 429 or an `status: 'Error'` body. The
  correct response is to stop the run and keep committed data, not to retry
  in a loop — the next scheduled run covers it (autonomy guardrail).

## Fallback ladders (keep them intact)

- `bps-html`: API → HTML scrape of `https://www.bps.go.id/id/pressrelease`
  (pages 1–30, multi-selector cheerio with anchor-scan fallback).
- `bps-national`: API → hardcoded `STATIC_SEED_DATA` written with
  `source: 'static_seed'` (UI shows the fallback banner).
- `bps-provinsi`: API → Google Sheets CSV
  (`SHEET_CSV_URL`, sheet id `18CgljAOiP8j8_i4qsPVmiYhuWNEYwFgRskPRRLEl5GI`)
  → this fallback **rethrows on failure** (the only one that hard-fails).
- `bps-sdg-sakernas`: no fallback — throws without a key (it feeds the
  BPS-exclusive `/sdg` page, where a non-BPS fallback would violate policy).
