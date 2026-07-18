# Stage 1 — Benchmark layer ("keep an eye on its target")

Status: done (2026-07-05, commits 5f15256 + 3640cd9). Shipped: RPJMN 2025-2029 TPT band (4,00-4,71%, verified from Bappenas Ringkasan RPJMN 2025-2029) on the SDG benchmark panel + Makro Indonesia TPT timeline; computed ASEAN median dashed line ("Median ASEAN (dihitung)" = 2,23%) on the Makro ASEAN unemployment chart; vs-target delta chips on the SDG StatCards with inverted TPT direction; data/benchmarks/targets.json + getBenchmarkTargets() loader (skips null/TODO entries) + inventory + catalog. Omitted (integrity): RPJPN 2045 TPT (no verifiable primary figure - shipped as a null/TODO sentinel that the loader provably skips) and a numeric SDG 8.5 target (Target 8.5 is qualitative, no unemployment rate).

## Goal

Every headline indicator readable against its official targets: SDG 8
(global), ASEAN comparators (regional), RPJMN/government targets
(national). This is the owner's "target" requirement made concrete — and
it is cheap: Recharts already ships `ReferenceLine`/`ReferenceArea`; the
shared `LineChart` already accepts a `referenceLine` prop.

## Work items

### 1.1 `data/benchmarks/targets.json` (hand-curated, the only benchmark source)

New file, new family in the data catalog. Schema:

```json
{
  "_notes": "Hand-curated official targets. Every entry cites its official publication. No scraper produces this file.",
  "_source_url": "multiple - see entries",
  "_updated_at": "<ISO>",
  "targets": [
    {
      "id": "rpjmn-tpt-2029",
      "indicator": "tpt",
      "label": "Target RPJMN 2025-2029",
      "scope": "national",
      "value_min": null,
      "value_max": null,
      "unit": "%",
      "period": "2029",
      "source_name": "Bappenas - RPJMN 2025-2029",
      "_source_url": "TODO-VERIFY-OFFICIAL-URL"
    },
    { "id": "asean-median-tpt", "indicator": "tpt", "label": "Median ASEAN",
      "scope": "regional", "computed": true,
      "compute": "median of latest SL.UEM.TOTL.ZS across ASEAN from data/asean/fallback/_by_country.json",
      "source_name": "World Bank/ILO (computed)", "_source_url": "https://api.worldbank.org" }
  ]
}
```

Rules (`project-guardrails` c): values come from official publications you
verify at authoring time — RPJMN targets from Bappenas documents, RPJPN
2025–2045 long-horizon milestones (also Bappenas; use ids like
`rpjpn-tpt-2045` and label the horizon in `label` — a 2045 milestone must
never read as a near-term target), SDG 8 targets from the official SDG
framework, APBN assumptions if used. **Do
not guess values. Do not scrape them.** If you cannot verify a target,
omit it — an absent benchmark is fine; a wrong one is poison. Entries with
`"computed": true` are derived in the loader from repo data and labeled as
computed. The schema above deliberately ships `null` values and a
`TODO-VERIFY-OFFICIAL-URL` sentinel so it CANNOT render if copy-pasted:
**the loader must skip any entry with null values or a TODO/placeholder
URL** — placeholder entries can never reach a chart. Fill real values only
from the official document you verified.

### 1.2 Loader + types

`getBenchmarkTargets()` in `data-loader-server.ts` (standard try/catch
pattern); typed interface; entry in `getDataInventory()` (staleness
window: 400 days — it changes rarely); row in the onboarding data-catalog
(trust tier: hand-seeded).

### 1.3 Reference bands on charts

- Makro-indonesia TPT timeline + SDG benchmark panel: RPJMN TPT band
  (`ReferenceArea` y1=value_min y2=value_max, label "Target RPJMN") and/or
  `ReferenceLine`. Extend the shared `LineChart` with an optional
  `referenceAreas?: {y1,y2,label,color?}[]` prop (backward-compatible).
- Makro-asean unemployment chart: ASEAN median as a computed dashed
  `ReferenceLine` (label "Median ASEAN (dihitung)").
- Colors: muted, from the token palette (e.g. `var(--app-warning)`-ish hex
  at low opacity) — bands must read as context, not as another series.
- Every band's label must name its source; the chart's attribution box
  gains a "Target/patokan" line linking the target's `_source_url`.

### 1.4 Delta chips on StatCards

`StatCard` already takes `change?: {value,label,direction}`. Extend usage,
not the component: on the SDG benchmark panel and overview `DataRow`s show
YoY delta AND vs-target delta (e.g. "0,3 pp di atas target"). Direction
semantics: for TPT, down is good — reuse the existing inverted-direction
logic from `overview-data.ts` (`tptChange`), do not re-derive it wrong.

## What NOT to do

- No benchmark scraping, no third-party "target" APIs.
- No mixing: benchmarks are ReferenceLine/Area ONLY — never a data series
  in `lines`/`bars` arrays, never in tables as if observed.
- No new deps; no new chart types.
- Do not spread bands everywhere: TPT, TPAK/EPR (SDG panel), and the ASEAN
  comparison are the Stage 1 surface. Restraint is the design.

## Acceptance criteria

- [x] `data/benchmarks/targets.json` exists; every non-computed entry's
      `_source_url` opens to an official document containing the value
      (spot-checked and stated in the PR/commit body).
- [x] TPT chart shows the RPJMN band with source-named label; ASEAN chart
      shows the computed median line labeled "(dihitung)".
- [x] SDG panel StatCards show vs-target chips with correct inverted
      direction for TPT.
- [x] Charts remain legible: bands muted, one message per chart preserved
      (`project-guardrails` d).
- [x] Loader + inventory + catalog updated; the loader provably skips
      null-valued/TODO entries; `data-validation` gates run on the new
      file; `add-visualization` DoD passes.
- [x] The "five hand-seeded BPS files" phrasing is updated to count this
      sixth hand-curated file in ALL copy sites:
      `dashboard-onboarding/SKILL.md`, `references/data-catalog.md`,
      `bps-webapi/SKILL.md`, `data-validation/SKILL.md`.
- [x] Status line + README updated.
