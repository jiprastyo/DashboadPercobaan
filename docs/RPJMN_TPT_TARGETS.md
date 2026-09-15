# RPJMN TPT Target Bands — Sources, Verification Recipe, Maintenance

> Owner: whoever edits `data/benchmarks/targets.json` or the TPT benchmark
> overlay. Read this before touching those files. Iron rule 1 applies: a band
> enters the data ONLY with a verified quote from an official document.

Last verified: **2026-09-15** (all five bands, primary-text reads listed below).

## What the feature is

The TPT charts on `/makro-indonesia` (timeline) and `/sdg` (benchmark chart)
draw a shaded reference band per RPJMN administration, clipped to that
administration's own years — e.g. the 2015–2019 band only appears over
2015–2019. Bands are presentation-only (Recharts `ReferenceArea`); they are
never mixed into the observed BPS series.

## Current bands (values as published in the cited documents)

| id | window (period_start..end) | TPT target | Primary legal doc | Copy verified 2026-09-15 |
|---|---|---|---|---|
| rpjmn-tpt-2009 | 2004-01-01..2009-12-31 | 5.1% (single point) | Perpres 7/2005 | thinkbluedata.com PDF (UNDP mirror of official translation), full text p.18 |
| rpjmn-tpt-2014 | 2010-01-01..2014-12-31 | 5–6% | Perpres 5/2010 | jdih.tanjungpinangkota.go.id/data_file/466/20102107005.pdf (285 pp., narasi BAB Ekonomi) |
| rpjmn-tpt-2019 | 2015-01-01..2019-12-31 | 4–5% | Perpres 2/2015 Lampiran | ppid.kemnaker.go.id Renstra Kemnaker (restates the RPJMN sasaran); corroborated by Bappenas Ringkasan + RPJMN 2020-2024 review; body text at jdih.kemenkeu.go.id |
| rpjmn-tpt-2024 | 2020-01-01..2024-12-31 | 3.6–4.3% | Perpres 18/2020 Lampiran I (Narasi) | disnakkeswan.lampungprov.go.id Ringkasan Eksekutif PDF (parsed p.23) |
| rpjmn-tpt-2029 | 2025-01-01..2029-12-31 | 4.00–4.71% | RPJMN 2025-2029 (Perpres 17/2025) | perpustakaan.bappenas.go.id Ringkasan (verified 2026-07-05, tabel Sasaran row 22) |

Notes:
- 2004–2009 and 2010–2014 targets are from the administration's own RPJMN
  (SBY era); the Perpres wording for 2010-2014 is a range in the narasi
  ("tingkat pengangguran terbuka menjadi 5%-6%").
- Single-point bands (value_min == value_max) render as a dashed hairline;
  consumers special-case the label (no "5,10-5,10%").
- `rpjpn-tpt-2045` stays a null sentinel by design (no official numeric TPT
  2045 verified) — the loader provably skips nulls/placeholder URLs.
- Known dead hosts (do not waste time; re-probe before believing):
  bphn.go.id / djsn.go.id / jdih.kemenkeu fulltext / fiskal.kemenkeu /
  bappenas e-library all 403 or TLS-hang from residential IPs;
  archive.org CDX rate-limits (429). The mirrors above worked.

## Data flow (who reads what)

1. `data/benchmarks/targets.json` — hand-curated, no scraper, staleness
   window 400 days (`scripts/ops/freshness.ts` does NOT watch it; the file
   itself carries `_updated_at`).
2. Loader: `src/lib/data-loader-server.ts` → `getBenchmarkTargets()`.
   Guards: `isPlaceholderUrl()` skip + null-bound skip. Passthrough includes
   `periodStart`/`periodEnd` (new 2026-09-15).
3. Makro chart: `src/app/makro-indonesia/MakroIndonesiaClient.tsx`
   (`rpjmnTptTargets` filter → `tptReferenceAreas`, epoch-ms x1/x2 because
   that chart's x-axis is `type="number"` scale="time").
4. SDG chart: `src/app/sdg/SDGSakernasClient.tsx` (same filter, but x is a
   **category of 4-digit year strings**, so x1/x2 are `'2015'`-style strings).
5. Rendering: `src/components/charts/LineChart.tsx` `referenceAreas` prop —
   `x1?/x2?: number | string`. Omitted → full-width (old behavior preserved).
6. Footer notes cite the band list + source link on both pages.

## How to add the next band (e.g. a future RPJMN 2030-2034)

1. Find the official Perpres text (try, in order: `peraturan.bpfp.go.id` /
   any `jdih.*.go.id` city-province mirror / Bappenas `Ringkasan` PDF).
   `pypdf` one-liner to grep the target sentence:
   ```bash
   python3 - <<'EOF'
   import pypdf, re
   r = pypdf.PdfReader('perpres.pdf')
   t = ''.join(p.extract_text() or '' for p in r.pages)
   for m in re.finditer(r'pengangguran', t, re.I):
       print(t[max(0,m.start()-200):m.start()+200].replace('\n',' | '))
   EOF
   ```
2. Record in the entry: exact quoted sentence in `verified_note`, PDF URL in
   `_source_url`, date in `_verified_at`, window in `period_start/period_end`.
3. Place it AFTER `rpjmn-tpt-2029` (SDG delta chips use the LAST national
   band as "current horizon").
4. Run `npx tsx scripts/tests/benchmark-targets.test.ts` (checks windows are
   ordered, non-overlapping, ISO, http-sourced, 3–7% plausible, loader
   passthrough intact) then `npm run build` and eyeball both charts.

## Rebuilding from scratch (documented in repo-history order)

- Schema fields per entry: `id, indicator, label, scope, value_min,
  value_max, unit, period, horizon, period_start, period_end, computed?,
  compute?, source_name, verified_note, _source_url, _verified_at`.
- Computed entries (`asean-median-tpt`) ignore static values; the loader fills
  from `data/asean/fallback/_by_country.json`.
- If the loader's guards are ever loosened, this test fails first: it asserts
  placeholder URLs and null sentinels never resolve into chart targets.

## Git history pointers

- 2026-07-05: first RPJMN band (2029 only) shipped with Stage 1 benchmark
  layer (viz-revamp-roadmap).
- 2026-09-15: multi-administration bands + period clipping (this doc's
  feature); Perpres texts downloaded and parsed during that session; the
  temporary PDF copies lived in /tmp only (nothing vendored in-repo).
