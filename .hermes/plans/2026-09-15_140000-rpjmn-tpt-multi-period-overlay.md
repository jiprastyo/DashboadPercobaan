# RPJMN multi-administration TPT target overlay — Implementation Plan

> **For Hermes:** execute task-by-task only after the owner's explicit "execute" cue (plan-batch mode). Local commits per task; push waits for owner visual pass + separate cue.

> **Status 2026-09-15: EXECUTED (Tasks 1-6), local commits ffd2ba9..docs, awaiting owner visual pass + push cue (Task 7).**

**Goal:** The TPT chart today overlays only the current RPJMN 2025–2029 target band across the whole chart. Extend it so each administration's RPJMN target band is drawn **only over its own period** (e.g. the 2020–2024 band floats over 2020–2024 only), so viewers can judge each government against its own promise.

**Architecture:** Keep the hand-curated `data/benchmarks/targets.json` as the single source (no scraper — it is in the frozen-file list by design). Add a period range to each national TPT target, and extend `LineChart`'s `referenceAreas` prop with optional `x1`/`x2` so Recharts' native `ReferenceArea` x-clipping draws each band over its own years. Presentation-layer only; never mixed into observed series (existing Stage-1 rule).

**Tech:** Next.js static export, recharts, tsx tests. No new deps.

---

## Current context (verified in repo 2026-09-15)

- `data/benchmarks/targets.json` — entries: `rpjmn-tpt-2029` (4.00–4.71, period "2029", cites Ringkasan RPJMN 2025–2029 PDF), `asean-median-tpt` (computed), `rpjpn-tpt-2045` (null sentinel, skipped by loader).
- Loader: `src/lib/data-loader-server.ts:202-215` `BenchmarkTarget` (has `period?`, `horizon?`, `sourceUrl`, `computed`), `getBenchmarkTargets()` skips placeholder rows (`isPlaceholderUrl`, missing band bounds).
- Consumer (Makro): `src/app/makro-indonesia/MakroIndonesiaClient.tsx:377-394` — finds ONE national tpt target, builds `tptReferenceAreas` = full-width y-band; passed to `<LineChart referenceAreas>` at :796. Chart x = epoch ms (`x: Date.parse(observation_date)`, :124/:223), `xType="number"`, timeline 1986→2026 (`data/bps/national-tpt-sakernas.json`, 61 obs, Feb/Aug dates).
- Consumer (SDG): `src/app/sdg/SDGSakernasClient.tsx:142-170` uses the same single-target pattern (`RPJMN_BAND_COLOR='#8d5a15'`).
- `src/components/charts/LineChart.tsx:29` `referenceAreas?: { y1; y2; label; color? }[]` rendered at :120-121 — no x-clipping yet.

**Data to source (one band per administration; TPT = tingkat pengangguran terbuka, national, % ):**

| RPJMN period | Legal doc (verify at peraturan.bpk.go.id / jdih.setneg.go.id) | TPT target (candidate — MUST verify in Lampiran table) |
|---|---|---|
| 2004–2009 | KSB 2004–2009 / Perpres 15/2006 (RPJM-I of RPJPN) | ~6.7 by 2009? UNVERIFIED — drop if not citable |
| 2005–2009 (RPJM-I, RPJPN 2005–2025) | UU 17/2007 Lampiran, Tabel Sasaran indikator makro | 5.0–5.5 by 2009 (verify) |
| 2010–2014 (RPJM-II) | UU 17/2007 (perpres RPJM-II if issued: verify) | 4.8–5.6 by 2014 (verify) |
| 2015–2019 | Perpres 2/2015 Lampiran I | 5.4–6.1 by 2019 (verify) |
| 2020–2024 | Perpres 18/2020 Lampiran | 3.6–4.3 by 2024 — corroborated by Ringkasan Eksekutif RPJMN 2020–2024 PDF found 2026-09-15 |
| 2025–2029 | already in file (`rpjmn-tpt-2029`) | 4.00–4.71 by 2029 |

Iron rule 1: a band enters `targets.json` ONLY with a verified official-document page (cite PDF URL + table/row + `_verified_at`). If a period's number cannot be verified, omit it and note why in `_notes` — fewer honest bands beats a complete-looking fabricated set. Prefer the *final-year* band target (matching today's 2029 entry style); if the Perpres gives a per-year trajectory, record only the final-year band and cite the table.

---

## Task 1: Source + verify target numbers (no code)

1. Fetch each candidate PDF/page above; record exact table row text for the TPT target.
2. Write findings into `data/benchmarks/targets.json` as new entries:
   `rpjmn-tpt-2009`, `rpjmn-tpt-2014`, `rpjmn-tpt-2019`, `rpjmn-tpt-2024` (+`rpjmn-tpt-2005-2009` variant id naming: use `rpjmn-{slug}-tpt-{endYear}`) with fields
   `"period_start": "2015-01-01", "period_end": "2019-12-31"` (new, ISO strings) alongside existing fields (`id, indicator:"tpt", label:"Target RPJMN 2015-2019", scope:"national", value_min, value_max, unit:"%", period:"2019", horizon:"2019", source_name, verified_note, _source_url, _verified_at`).
   Update the existing `rpjmn-tpt-2029` entry to add `"period_start":"2025-01-01","period_end":"2029-12-31"`.
3. Verify: `python3 -c "import json;[print(t['id'],t.get('period_start')) for t in json.load(open('data/benchmarks/targets.json'))['targets']]"` — every rpjmn-tpt row has both new fields.
4. Commit `data(benchmarks): verified historical RPJMN TPT target bands (Perpres ...)`.

## Task 2: Loader passthrough

**Files:** `src/lib/data-loader-server.ts` (interface ~:202, mapper in `getBenchmarkTargets`)

1. Add `periodStart?: string; periodEnd?: string;` to `BenchmarkTarget`; map from JSON `period_start/period_end`.
2. `npm run build` must still pass (build reads this).
3. Commit.

## Task 3: LineChart x-clipping

**Files:** `src/components/charts/LineChart.tsx:29,120-121`

1. Extend prop type: `referenceAreas?: { y1: number; y2: number; label: string; color?: string; x1?: number; x2?: number }[]` (epoch ms).
2. Pass through: `<ReferenceArea ... x={undefined} x1={area.x1} x2={area.x2} />` — Recharts clips horizontally when x1/x2 given on a numeric x-axis. When absent, behavior must be identical to today (full-width) — the SDG chart keeps working untouched.
3. Lint the file clean (pre-existing repo lint debt: `npx eslint src/components/charts/LineChart.tsx` shows zero NEW errors).
4. Commit.

## Task 4: Makro client multi-band overlay

**Files:** `src/app/makro-indonesia/MakroIndonesiaClient.tsx:377-394,796`

1. Replace single `rpjmnTptTarget` lookup with `benchmarkTargets.filter(t => t.indicator==='tpt' && t.scope==='national' && t.valueMin!=null)`.
2. Build `tptReferenceAreas` = one entry per target, `x1/x2 = Date.parse(period_start/period_end+'T00:00:00Z')`, label `${t.label}: min–max%` (existing `formatNumber`). Distinguish periods with the same color at different x — fine as bands never overlap in x.
3. Verify in the pre-rendered export: `grep -o "Target RPJMN 20[12][05]-20[149]" out/makro-indonesia/index.html` after `npm run build` → each label appears.
4. Commit.

## Task 5: SDG page (same pattern, same session)

**Files:** `src/app/sdg/SDGSakernasClient.tsx:142-170` — apply Task 4 steps 1–3 to its TPT chart (check its x-axis is also epoch-ms numeric; if it is year-number, convert period_start year instead).
Verify via grep on `out/sdg/index.html`. Commit.

## Task 6: Test + docs

1. Extend `scripts/tests/program-registries.test.ts`? No — instead add band assertions to the existing loader test surface: create/extend a check that `getBenchmarkTargets()` returns ≥4 national tpt bands with ordered non-overlapping `periodStart/End`. (Small tsx test like `ihk-chain.test.ts`; wire into `package.json` test chain.)
2. Docs: `docs/DATA_SOURCES.md` benchmarks row (add the per-period overlay note + citations pointer).
3. `npm run test && npm run lint && npm run build` green. Commit.

## Task 7: Owner visual pass, then push

Screenshot/compare both charts (bands positioned over correct year windows, legend/labels readable, tooltip unaffected). Then owner gives push cue; deploy auto-fires via the workflow_run/push loop built 2026-09-15.

---

## Risks / open questions

- **Recharts ReferenceArea with only x1/x2 on numeric axis** — if labels collide at low band heights, shorten label to period only and rely on tooltip/legend. Fallback: render band without label and add a small legend line under the chart.
- **Pre-2010 sources** (KSB 2004–2009): documents are patchy online; fine to ship 4 bands (2015→2029) and note the gap — the chart data starts 1986 so older windows will simply have no band.
- `rpjpn-tpt-2045` stays a skipped sentinel — long-horizon RPJPN target, not an RPJMN administration band.
- Two admins' bands may sit at overlapping y ranges (e.g. 2024 vs 2029) — x-clipping keeps them visually separate.
