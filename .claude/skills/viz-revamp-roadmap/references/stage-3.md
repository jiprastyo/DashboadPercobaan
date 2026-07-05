# Stage 3 — Interactivity & export

Status: not-started (requires stage-2 done)

## Goal

Make the (now honest, benchmarked, denser) charts useful beyond the
screen: data export and consistent period control. CSV replaces the
removed PNG export as the reliable path — text export cannot have the
browser-rendering bugs that got PNG pulled.

## Work items

### 3.1 Per-chart CSV download

- New `src/lib/csv-export.ts`: `downloadCsv(filename: string, rows:
  Record<string, unknown>[])` — client-side Blob + temporary anchor
  (`URL.createObjectURL`), UTF-8 **with BOM** (`﻿` — Excel id-ID
  needs it), header row from union of keys, values quoted/escaped
  (quotes, commas, newlines), numbers with `.` decimal separator (CSV is
  data, not display — locale formatting stays in the UI).
- Small `'use client'` button component (lucide `Download` icon + "Unduh
  CSV", `.no-print`, `focus-visible:app-focus`) placed in the section
  header of each chart, wired to the SAME `useMemo` rows array the chart
  renders (what you see is what you export — including active filters).
- Filenames: `<indikator>-<page>-<YYYY-MM-DD>.csv`, ASCII, kebab-case.
- Rollout: makro-indonesia sections, makro-asean topics, SDG panel +
  indicator charts, tren. (Berita/BRS lists are out of scope — they are
  link lists, not series.)

### 3.2 Unified period-selector pattern

The year/period chip logic ("Semua tahun", "12 tahun terbaru", effective-
selection guards) is duplicated across MakroIndonesia/MakroASEAN/SDG.
Extract ONE shared client component (e.g.
`src/components/ui/PeriodChips.tsx`) wrapping the existing `CompactChip`
UI and the `useMemo`+`useEffect` restore pattern, then adopt it in those
three clients. Behavior must be pixel/semantics-identical — this is a
refactor with a UI-diff of zero; snapshot the pages before/after.

### 3.3 (Optional) restore PNG export

`src/lib/chart-export.ts` is intact with zero importers; its two anchor
ids (`tpt-chart-container`, `asean-chart-<topic.id>`) still exist. IF time
remains after 3.1/3.2: wire ONE button on the TPT chart, verify manually
in Chromium + Firefox, light + dark (the historical failure was
browser-side rendering — the bar is "works in both", not "compiles").
If it fails again, delete `chart-export.ts` and its anchor ids, and record
the decision here; README already calls the removal temporary — resolve
the "temporary" one way or the other.

## What NOT to do

- No export libraries (no file-saver, no papaparse — 30 lines of vanilla
  code suffice).
- No server-side export of any kind (static export has no server).
- No global state/context for periods — the shared component owns the
  pattern, pages own their state.
- CSV must not export different rows than the visible chart (no "export
  all" variant — that surprises users and bloats scope).

## Acceptance criteria

- [ ] Every listed chart has a working CSV button; files open correctly in
      Excel (BOM verified) and text editors; filtered charts export
      filtered rows.
- [ ] Period-chip behavior across the three pages is unchanged
      (before/after interaction check documented in the PR/commit body).
- [ ] 3.3 either shipped-and-verified in two browsers, or chart-export.ts
      deleted with the decision recorded here and in README.
- [ ] `add-visualization` DoD passes; Status line + README updated.
