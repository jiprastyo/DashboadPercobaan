# BPS Web API Reference

This note summarizes the official BPS Web API documentation for use in this repository.

Primary source:

- Official documentation: <https://webapi.bps.go.id/documentation/>

## Base patterns

The official documentation uses path-style endpoints under:

- `https://webapi.bps.go.id/v1/api/list/...`

Examples in the docs show model selection as a path segment rather than a query string, for example:

- `.../model/data/...`
- `.../model/var/...`
- `.../model/th/...`
- `.../model/turvar/...`
- `.../model/vervar/...`
- `.../model/turth/...`
- `.../model/domain/...`

Requests require a BPS API key:

- `.../key/<BPS_API_KEY>/`

In this repo, keep the key in environment variables such as `BPS_API_KEY`. Do not hardcode it into source files or committed JSON.

## Models we are likely to use

The official docs describe these list models:

- `data`: fetches the actual statistical values
- `pressrelease`: lists BPS press releases / Berita Resmi Statistik records
- `var`: lists variables for a domain
- `th`: lists available period entries for a variable
- `turvar`: lists derived-variable members
- `vervar`: lists vertical-variable members
- `turth`: lists derived-period members
- `domain`: lists BPS domains

For dashboard work, the usual discovery flow should be:

1. Find the target `domain`.
2. List candidate variables with `model/var`.
3. Inspect available time points with `model/th`.
4. Inspect dimensions with `model/vervar`, `model/turvar`, or `model/turth` if the table uses them.
5. Fetch final values with `model/data`.

For BRS/PDF discovery, use `model/pressrelease` instead of `model/data`.
The existing scraper plan is to query national BPS press releases with:

- `https://webapi.bps.go.id/v1/api/list/model/pressrelease/domain/0000/page/<page>/year/<year>/key/<BPS_API_KEY>`

The response items should be matched against `title`, cleaned `abstract`, and `subj`, then saved with the direct Indonesian PDF URL from `pdf` when available. The tracked BRS buckets are:

- `ketenagakerjaan`: ketenagakerjaan, pengangguran, angkatan kerja, Sakernas, TPAK, TPT
- `kemiskinan`: kemiskinan, penduduk miskin, gini ratio, ketimpangan
- `pertumbuhan-ekonomi`: PDB, pertumbuhan ekonomi, produk domestik bruto, ekonomi Indonesia
- `ntp`: NTP, nilai tukar petani
- `wisman`: wisman, wisatawan mancanegara, kunjungan wisatawan
- `ekspor-impor`: ekspor, impor, neraca perdagangan, perdagangan luar negeri

For `pertumbuhan-ekonomi`, keep PDB and growth-release titles under the same canonical slug unless the UI explicitly needs separate buckets.

The BRS archive should support a dedicated dashboard menu that lists all saved BPS releases chronologically, newest first. The UI should expose sidebar filters for:

- year
- BRS type / indicator bucket

Because BPS can limit or throttle scraping, avoid unbounded historical sweeps. Prefer an incremental scrape plan:

- refresh the current year and previous year first
- stop paging when a page has no new relevant BRS records
- dedupe by direct PDF URL, release ID if present, or stable title/date pair
- checkpoint each year/page backfill so older years can be resumed
- use deliberate delays between pages and keep full historical backfills as staged jobs rather than the normal weekly scrape

Live endpoint probe on 2026-06-26:

- `model/pressrelease` returned `rl_date`, `brs_id`, `title`, `abstract`, `subj`, `subj_id`, `pdf`, `thumbnail`, `slide`, `size`, and `updt_date` fields in sampled national records.
- `sch_date` was not present in the sampled response, so the dashboard should treat the sidebar schedule as a usual release cadence, not as an official calendar pulled from this endpoint.

## Data endpoint shape

The official docs show `model/data` requests using path selectors like:

- `domain/<domain_id>`
- `var/<var_id>`
- `th/<period_selector>`
- optional `vervar/<id>`
- optional `turvar/<id>`
- optional `turth/<id>`
- `key/<api_key>`

The docs indicate that selectors can take:

- a single value, such as `th/2024`
- a semicolon-delimited list, such as `th/2023;2024;2025`
- a range, such as `th/2:6`

Do not assume every table uses only `domain`, `var`, and `th`. Many BPS tables also need one or more of:

- `vervar`
- `turvar`
- `turth`

## Response parsing notes

The official documentation does not present `model/data` as a simple flat row list.
Instead, the payload is split into metadata arrays and a `datacontent` object.

The docs show these structures as part of the response shape:

- `var`
- `turvar`
- `vervar`
- `tahun`
- `turtahun`
- `datacontent`

Implications for this repo:

- Parse metadata and values separately.
- Do not assume `datacontent` keys are self-explanatory without the accompanying metadata arrays.
- When building reusable scrapers, normalize the payload into explicit records before saving project JSON.

## Domain notes

The docs include a `domain` model for BPS regional domains. Use it when we need to discover official IDs instead of guessing them.

For labor dashboards, we have already used:

- `0000` for national-level access in some official examples and project scripts

Still, prefer discovery or confirmed prior usage before introducing new domain IDs into code.

## Repo-specific guidance

These are not direct documentation quotes; they are the working conventions for this repository:

- Prefer official BPS Web API over inferred or third-party sources when the indicator is available there.
- Discover table structure first with `var`, `th`, `vervar`, `turvar`, and `turth` before hardcoding selectors.
- Preserve exact observation timing from BPS labels when the series is not strictly annual.
- Normalize BPS responses into explicit records before using them in UI code.
- Keep API fetch logic separate from presentation logic.

## Known working repo pattern

For the TPT historical work in this repository, the existing verified pattern is:

- variable: `var/543`
- period discovery: `model/th`

Treat that as a known working case for this repo, not as a universal shortcut for every BPS dataset. New indicators should still be discovered from the official API structure first.

## Suggested implementation checklist

Before building a new BPS-backed scraper or page:

1. Confirm the target domain.
2. Discover the variable ID with `model/var`.
3. Fetch available periods with `model/th`.
4. Check whether the table also requires `vervar`, `turvar`, or `turth`.
5. Fetch a small sample from `model/data`.
6. Normalize the response into readable records.
7. Save source metadata alongside the transformed output.
