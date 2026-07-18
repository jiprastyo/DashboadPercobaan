# Data model — programme/ministry tracker files

All files live under `data/program/` (new family). All are **hand-curated
registries** except `indicators-*.json` (scraped). Registry trust tier:
hand-seeded — edits cite official sources; `TODO-VERIFY` sentinel fields
must be resolved before an entry may render (loaders skip unverified
entries, same mechanism as stage-1's null-sentinel rule).

## data/program/ministries.json (hand-curated registry)

```json
{
  "_notes": "Registry of tracked institutions. verified:false entries are skipped by loaders.",
  "_updated_at": "<ISO>",
  "ministries": [
    {
      "id": "kemnaker",
      "name": "Kementerian Ketenagakerjaan",
      "short_name": "Kemnaker",
      "labor_lens": "PHK, penempatan, pelatihan, JKP, pengupahan",
      "website": "https://kemnaker.go.id",
      "release_source": { "type": "api", "url": "https://portal.kemnaker.go.id/api/v1/news", "scraper": "kemenaker" },
      "verified": true,
      "_source_url": "https://kemnaker.go.id",
      "_verified_at": "<ISO>"
    },
    {
      "id": "den",
      "name": "Dewan Ekonomi Nasional",
      "labor_lens": "…",
      "website": "TODO-VERIFY",
      "release_source": null,
      "verified": false,
      "_source_url": "TODO-VERIFY"
    }
  ]
}
```

## data/program/needs-matrix.json (hand-curated: the availability matrix)

One row per (ministry, indicator-need):

```json
{
  "needs": [
    {
      "id": "kemenpora-neet",
      "ministry_id": "kemenpora",
      "need_label": "Pemuda tidak bekerja, tidak sekolah, tidak pelatihan (NEET)",
      "provider": "sakernas",
      "availability": "available",
      "bps_var_id": 1186,
      "series_ref": "data/bps/sdg-sakernas.json#861",
      "notes": "SDG 8.6.1 via BPS Web API",
      "_source_url": "https://webapi.bps.go.id",
      "_verified_at": "<ISO>"
    },
    {
      "id": "ekraf-gig-workers",
      "ministry_id": "ekraf",
      "need_label": "Pekerja lepas/gig ekonomi kreatif",
      "provider": "sakernas",
      "availability": "not-collected",
      "bps_var_id": null,
      "series_ref": null,
      "notes": "Sakernas has no direct gig-worker series; nearest proxy is status pekerjaan informal",
      "_source_url": "https://webapi.bps.go.id",
      "_verified_at": "<ISO>"
    }
  ]
}
```

**Needs-row render rule:** a matrix row renders only when it carries a real
`_source_url` AND `_verified_at` — including `not-collected` rows, because
a "not collected" verdict is itself a probe finding (its source is the BPS
Web API you probed, its `_verified_at` the probe date). Rows still carrying
`TODO-VERIFY` anywhere are skipped by the loader, same as unverified
registry entries.

`availability` vocabulary (exact): `available` (a BPS series exists and is
acquired in this repo), `partial` (exists at BPS but not acquired, or only a
proxy exists — say which in `notes`), `not-collected` (no official series;
this is a *finding*, not a gap to fake). `provider`: `sakernas` | `susenas`
| `bps-other` (e.g. NTP, wisman — already-tracked BRS series). Every
`available` row's `series_ref` must point at a real repo file (+ optional
`#fragment` for the indicator id within it).

## data/program/programmes.json (hand-curated registry)

```json
{
  "programmes": [
    {
      "id": "jkp",
      "name": "Jaminan Kehilangan Pekerjaan (JKP)",
      "ministry_id": "kemnaker",
      "description_short": "…",
      "target_ids": ["jkp-coverage-2029"],
      "indicator_need_ids": ["kemnaker-tpt-prov"],
      "status": "active",
      "verified": true,
      "_source_url": "<official programme page>",
      "_verified_at": "<ISO>"
    }
  ]
}
```

`target_ids` reference entries in `data/benchmarks/targets.json` (the
stage-1 file), which gains two optional fields for this area:
`"ministry_id"` and `"programme_id"` — RPJMN entries carry
`ministry_id: "bappenas"`. Same null/TODO sentinel rules; the stage-1
loader-skip rule covers these entries automatically.

## data/program/indicators-susenas.json (SCRAPED — the only non-registry file)

Written by the P1 scraper (`scripts/scrapers/bps-susenas.ts`), shaped like
`data/bps/sdg-sakernas.json` (which is the proven template):

```json
{
  "source": "official_bps_webapi_only",
  "_source_url": "https://webapi.bps.go.id",
  "_generated_at": "<ISO>",
  "included_indicators": [
    { "id": "kemiskinan-p0", "title": "Persentase Penduduk Miskin (P0)",
      "varId": 0, "unit": "%", "years": [{"year": 2024, "value": 0}],
      "latestYear": 0, "latestValue": 0, "sourceNote": "…" }
  ],
  "excluded_requested_indicators": []
}
```

`varId`s are DISCOVERED per `bps-webapi` (probe `model/var` with subject
filters, then `model/th`) — the values shown here are placeholders-by-shape,
not real IDs. Sakernas needs beyond what is already acquired follow the
same route, either extending `bps-sdg-sakernas.ts`'s indicator map or a
sibling file `indicators-sakernas.json` — P1 decides based on what the
probes find.

## data/program/releases/<ministry_id>.json (SCRAPED — P3)

Written by `scripts/scrapers/ministry-releases.ts`, append-merge deduped by
`link`:

```json
[
  { "title": "…", "date": "YYYY-MM-DD", "summary": "≤500 chars",
    "link": "…", "ministry_id": "kemenperin", "keywords_matched": ["…"],
    "_source_url": "…", "_scraped_at": "<ISO>" }
]
```

(With P3, the registration count below becomes scraped ×2.)

## Consumption (P2)

`getProgrammeTrackerData()` in `data-loader-server.ts` joins: ministries ×
needs-matrix × programmes × targets × the referenced series files, skipping
`verified:false` registry rows and sentinel targets, and returns one typed
object for the `/program` page. A sibling `getMinistryReleases()` reads
`data/program/releases/*.json` (P3 surface). All joins at build time; broken `series_ref`
paths must fail loudly in the loader (console.error + omit row) so the
build surfaces registry rot.

## Register these schemas

When P1 lands, add every file above to
`data-validation/references/schemas.md` and to the onboarding data-catalog
(trust tiers: hand-seeded ×3, scraped ×1) — same commit as the files.
