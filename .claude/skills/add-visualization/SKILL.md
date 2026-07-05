---
name: add-visualization
description: Use this whenever you add, change, move, or debug ANY visual element in the dashboard — a chart, a page, a stat card, a table, a filter, a section — even if the user only says "show this data", "add a graph", "make a page for X", or "why is this chart empty". It encodes the build-time data plumbing invariant, the chart component APIs, static-export and dual-basePath constraints, the sample-data trap, and the reuse-before-write component rule. Skipping it is how sessions ship charts that 404 on GitHub Pages or silently render fake data.
---

# Adding or changing visualizations

For Indonesian domain terms (TPT, TPAK, Sakernas, BRS, wisman, IHK, PHK…) read
`../dashboard-onboarding/references/glossary.md`. For whether a feature belongs in this
dashboard at all, apply `project-guardrails` first. If the chart needs a data source that
does not exist yet, do `add-data-source` first, then return here. Open-ended "improve the dashboard" work and large
redesigns follow `viz-revamp-roadmap`, not this skill — but a *specific* requested
chart/page that no roadmap stage specs is executed here directly (if a stage does
spec it, do it under that stage's criteria).

## The one invariant: data is read at build time, not at runtime

This app is `output: "export"` (next.config.ts). There is no server at runtime — no API
routes, no server actions, no ISR. Everything you see on a page was baked in during
`next build`.

- **All page data** is loaded by **`src/lib/data-loader-server.ts`** (926 lines, Node-only,
  `fs.readFileSync` from the repo's `data/` directory). These reads happen once, inside
  server components, during the build. Every loader returns `null` or `[]` on a missing or
  unparsable file and logs via `console.error` — pages must tolerate that.
- **The ONLY runtime fetch in the entire app** is `src/app/berita/BeritaClient.tsx`
  fetching `${NEXT_PUBLIC_BASE_PATH}/data/news/historical-seed.json` in a `useEffect`.
  That works only because `scripts/prepare-static-assets.ts` (wired as npm `predev` and
  `prebuild`) copies exactly that one file from `data/news/` into `public/data/news/`.
  Nothing else exists under `public/data/` — it is gitignored and generated.
- **`src/lib/data-loader.ts` is a trap.** It performs zero I/O and does not load real
  data. After Stage 0 it exports only two hard-coded generators kept as guarded
  missing-file fallbacks — `getSampleBPSData` (overview/makro-indonesia) and
  `getSampleNewsData` (overview) — each used behind a real-loader `null`/`[]` check and
  the showWarning/DataNotice transparency contract. Never import it thinking you are
  loading real data, and never wire either into a surface that renders it
  unconditionally.

WHY this shape: it keeps Vercel on the free static tier, makes every page work offline
from a git checkout, and means data provenance is a git diff, not a database query.

**Consequence for you:** a new visualization ALWAYS follows the pattern
**server component loads → client component renders**:

1. Add/reuse a loader in `src/lib/data-loader-server.ts` reading `data/<...>.json`.
2. Call it in the route's `page.tsx` (a server component — no `'use client'`).
3. Pass the result as props to the route's `*Client.tsx` (`'use client'`).
4. Render with the shared chart components in `src/components/charts/`.

Never `fetch()` data in a client component (except the existing berita archive fetch), and
never `import fs` in anything marked `'use client'` — both break the export or the build.

## Static export + dual basePath constraints (both must hold)

The site deploys to **two** targets and must work on both (see `deploy-infra`):

- **Vercel (live)**: `NEXT_PUBLIC_BASE_PATH` unset → empty basePath.
- **GitHub Pages (legacy)**: `NEXT_PUBLIC_BASE_PATH=/<repo-name>` set only in
  `.github/workflows/deploy.yml`.

Rules that follow:

- Never hardcode an absolute URL path to an asset. If you ever add a runtime fetch
  (rare — get it approved), prefix it exactly like BeritaClient does:
  `const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';` — this env var is
  inlined at build time, which is why it must be set during `next build`, not at runtime.
- `trailingSlash: true` → pages export as `route/index.html`; use `next/link` for internal
  navigation and never hand-build hrefs without trailing slashes.
- `images: { unoptimized: true }` is required by export; the app uses no `next/image` at
  all (icons are lucide SVGs, flags are emoji). Keep it that way unless there is a reason.
- Anything computed at build time is **frozen until the next deploy** (e.g. the
  operasional "Build:" timestamp, staleness badges). Do not build "live" indicators from
  server-side reads and expect them to update.

## Simplicity mandate

The owner treats visual simplicity as a feature — more data presentation must not mean
more clutter. Enforce:

- **One message per chart.** If a chart needs three toggles to be legible, it is two charts
  or one table.
- **Indonesian everywhere.** Labels, tooltips, empty states, aria-labels — all Indonesian,
  `Intl`/date-fns locale `id-ID`/`id`. (Known stray English: TrendChart's Y-axis label
  `'Interest'` — do not add more.)
- **Source attribution under every chart**: the data period and a link to `_source_url`.
  Follow the existing patterns: makro-indonesia's "Arti Indikator / Sumber Data / Periode
  Sumber Data" 3-box grid with "Verifikasi Sumber ↗", StatCard's `sourceUrl` prop,
  makro-asean's MetadataPanel. A chart without a verifiable source violates the project's
  source-hierarchy policy (`project-guardrails`).
- **Recharts only.** No new chart libraries without strong, written justification — every
  dependency is a maintenance liability on a solo-maintained repo, and the four shared
  components in `src/components/charts/` already cover line/bar/spark/trend cases.
- **Empty and failure states are plain Indonesian sentences** inside the standard bordered
  surface (e.g. "Data historis ASEAN tidak tersedia."), no illustrations.
- **Aesthetic drift is policed by the `design-taste` skill** — read it before
  styling anything new; its forbidden AI-tells list is a hard gate.

## The sample-data trap (read before touching these surfaces)

With committed data present, real files win *where a real loader is wired*. Stage 0
(`viz-revamp-roadmap` `references/stage-0.md`) purged every always-sample surface; the
history below is kept so nobody re-introduces the debt:

- **PMI chart & card** — RESOLVED. `getBIPMIData()` reads `data/bi/pmi/series.json`;
  the panel renders real data or the "Data PMI belum tersedia dari Bank Indonesia."
  empty state (the file is still `[]` until the bi-pmi scraper is fixed).
- **PHK timeline** on makro-indonesia and the overview `latestPHK` card — RESOLVED.
  Both now use real `getPHKArticles()` (Kemenaker). The fake `workers_affected` bar
  chart was dropped; the honest PHK tracker lands in Stage 2.
- **Overview ASEAN snapshot** — RESOLVED. Derived from the committed World Bank/ILO
  panel + `ASEAN_COUNTRIES`, labeled as modeled.
- **Overview source metadata** (`sourceEntries`) — RESOLVED. Mapped from real
  `data/_metadata.json` via `getDashboardMetadata()`.
- **Overview `summaries`** — RESOLVED. The computed-but-unrendered field was deleted.

Only two guarded missing-file fallbacks survive (`getSampleBPSData`,
`getSampleNewsData` — see the data-loader.ts note above).

**Rule: any work touching a data surface must wire real data (new loader in
`data-loader-server.ts` + real file) or an explicit Indonesian empty state. Never extend
the fake-data path** — fabricated numbers on a statistics dashboard destroy the project's
entire value proposition. When real data replaces a sample, keep the fallback-transparency
convention: sample/backup sources must announce themselves (`DataNotice` on overview, the
amber "Pemberitahuan sumber data cadangan" banner on makro-indonesia, driven by
`source === 'static_seed'` / `'fallback_spreadsheet'` flags).

## Check the unused inventory BEFORE writing a new component

These exist in `src/`, are intact and styled, but are imported by **nothing** (kept
because a later roadmap stage consumes each):

`CountryCard`, `SourceStatusCard`, `SectionPanel`, `src/lib/chart-export.ts`.

(Stage 0.5 DELETED the rest of the old unused set — `Sidebar`, `PlatformFontProvider`,
`Button`, `Select`, `FilterGroup`, `CompactArticleList`, `EditorialSidebarSection`,
`src/lib/tag-palette.ts`, and the unused `getGoogleTrendsData` loader; git remembers
them.)

Before creating any new card/panel/control, check this list and the full inventory in
`references/chart-inventory.md`. Reusing (or consciously deleting) beats duplicating —
the repo already has duplicated chart/table toggles and duplicated types; do not add more.

Note: **`EditorialPageShell` no longer accepts header props.** Stage 0.4 removed the
dead `eyebrow/title/description/summary` props (they were silently dropped) from the type
and every call site; the shell now only takes `sidebar, showSidebar, children, className,
contentClassName`. If a page needs a rendered header, that is a `viz-revamp-roadmap`
Stage 2+ layout decision (it changes every page at once), not a drive-by edit.

## Component quick reference

Full prop APIs, Recharts conventions, and per-page usage: `references/chart-inventory.md`.
Colors, dark mode, typography, layout rhythm: `references/design-system.md`.

- `src/components/charts/LineChart.tsx` — time/category series; CSS-var grid/axis/tooltip.
- `src/components/charts/BarChart.tsx` — comparisons; `highlightKey`, rotated ticks.
- `src/components/charts/SparkLine.tsx` — fixed-size inline trend.
- `src/components/charts/TrendChart.tsx` — Google Trends interest (0–100 domain).
- Dark mode: next-themes toggles `.dark` on `<html>`; charts adapt via `var(--chart-*)`
  tokens automatically. Series colors are literal hex passed by callers and do NOT swap
  with theme — pick colors that read on both backgrounds (see design-system.md).

## Worked example: add a wisman YoY chart to an existing page

Goal: chart `data/bps/wisman.json` YoY change on `/makro-indonesia`. (Kunjungan already
has a chart there — this shows the full chain you replicate for any new series.)

**1. Loader — `src/lib/data-loader-server.ts`** (reuse `getBPSWismanData()`, which already
exists; for a genuinely new file, copy its shape):

```ts
export function getBPSWismanData(): BPSWismanFile | null {
  try {
    const filePath = path.join(DATA_DIR, 'bps', 'wisman.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load BPS wisman data:', error);
    return null;
  }
}
```

**2. Server page — `src/app/makro-indonesia/page.tsx`**: call the loader next to the
existing ones and pass it down (this page already does):

```tsx
const wismanData = getBPSWismanData();
return <MakroIndonesiaClient /* …existing props… */ wismanData={wismanData?.data ?? []} />;
```

**3. Client — `src/app/makro-indonesia/MakroIndonesiaClient.tsx`**: shape rows with
`useMemo`, render the shared chart, keep Indonesian dataKeys (the `%` suffix in a series
name triggers percent formatting in the shared tooltip):

```tsx
const wismanYoyRows = useMemo(
  () => wismanData.map((d) => ({ period: d.period, 'YoY (%)': d.change_yoy })),
  [wismanData]
);
// inside the section, after the existing chart/table toggle pattern:
<LineChart
  data={wismanYoyRows}
  xKey="period"
  lines={[{ dataKey: 'YoY (%)', label: 'YoY (%)', color: '#8B5CF6' }]}
  height={360}
/>
```

**4. Attribution**: copy the section's existing "Arti Indikator / Sumber Data / Periode
Sumber Data" 3-box grid, linking the file's `_source_url`
(`https://www.bps.go.id/subject/16/pariwisata.html`) and stating the period range.

**5. Empty state**: wrap the chart in a `wismanData.length > 0` check with an Indonesian
sentence fallback — the loader can legitimately return `null`.

Note: `wisman.json` is `source: "historical_seed"` (synthetic-precision floats, no live
producer script). If your task is to make this series authoritative, that is an
`add-data-source` + `data-validation` job — do not silently present seed data as official.

## Definition of done

Run all of these from the repo root; a task is not done until all pass:

1. `npm run lint` — exits 0, no new warnings in files you touched.
2. `npm run build` — completes; `prebuild` logs the historical-seed copy; every route
   prerenders (any loader/type error fails here because all data reads happen in build).
3. `NEXT_PUBLIC_BASE_PATH=/DashboadPercobaan npm run build` — also completes. This is the
   GitHub Pages simulation; it catches hardcoded absolute asset paths.
4. Visual check: `npm run dev`, open the page in light AND dark mode; verify the chart,
   its Indonesian labels, its source link, and its empty state (temporarily rename the
   data file to confirm the page still renders with the fallback text, then restore it
   with `git checkout -- <file>` and confirm `git status data/` is clean before any
   commit — a committed test-mutation deploys to production).
5. If you touched any of the sample-data surfaces above: confirm the fake numbers are gone
   or explicitly labeled — grep your diff for `getSample` and justify every remaining call.
