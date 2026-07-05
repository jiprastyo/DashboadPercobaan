# Stage 0 — Debt clearance (trust before beauty)

Status: not-started

## Goal

No production surface renders fabricated/sample data; one canonical SDG
route; honest empty states everywhere. **Why first:** the revamp's entire
value is "official statistics, verifiable" — a single fake chart poisons
user trust in every real one. Building new visuals on top of these surfaces
would entrench the debt.

## Work items (each independently commit-able, in this order)

### 0.1 Wire real PMI or hide the panel

- Add `getBIPMIData()` loader to `src/lib/data-loader-server.ts` reading
  `data/bi/pmi/series.json` (template + exact code:
  `add-data-source/references/worked-example.md`).
- `src/app/makro-indonesia/page.tsx`: replace `getSamplePMIData()` with the
  real loader. In `MakroIndonesiaClient`, render the PMI section only when
  the series is non-empty; else the standard empty state ("Data PMI belum
  tersedia dari Bank Indonesia.").
- Same for the overview's PMI `DataRow` (`src/lib/overview-data.ts`):
  real value or an honest "belum tersedia" dash — never the sample number.
- Note: the bi-pmi scraper currently yields `[]` (both BI pages failing —
  see `pipeline-debugging/references/failure-modes.md` §5). Fixing the
  scraper is IN scope for this item if feasible in-session; otherwise the
  empty state ships and the scraper fix is filed in the Status line.

### 0.2 Purge remaining always-sample surfaces (`src/lib/overview-data.ts`)

- `phkData = getSamplePHKData()` → real `getPHKArticles()` for the
  `latestPHK` card; the makro-indonesia PHK timeline switches to real
  Kemenaker articles (no `workers_affected` field exists in real data —
  drop the fake-numbers bar chart; the real PHK tracker arrives in Stage 2
  with an honest design).
- `metadata = getSampleMetadata()` → real `getDashboardMetadata()` mapped
  into `sourceEntries` (shape differs — adapt the mapper, do not fake the
  old shape).
- `aseanSnapshot = getSampleASEANData()` → derive from
  `getASEANHistoricalData()` latest-year values + `ASEAN_COUNTRIES`
  constants (labeled "World Bank/ILO" per source hierarchy), or BPS values
  for Indonesia.
- `summaries = getSampleSummaries()` → it is computed but unrendered:
  delete the field and its type.
- Delete the now-unused `getSample*` generators from
  `src/lib/data-loader.ts` EXCEPT those still used as explicit
  missing-file fallbacks: `getSampleBPSData` (overview/makro-indonesia),
  `getSampleNewsData` (overview/operasional), and **operasional's
  `getSamplePHKData` fallback** (`src/app/operasional/page.tsx`) — or,
  preferred, replace the operasional PHK/news fallbacks with honest empty
  states too. Whatever remains keeps the existing `showWarning`/DataNotice
  transparency contract and gets a code comment justifying it.

### 0.3 Resolve `/sdg` vs `/sdg-sakernas`

- Keep `/sdg` (NAV_ITEMS already points there); move `SDGSakernasClient.tsx`
  to `src/app/sdg/`. Static export cannot server-redirect, so **replace**
  `src/app/sdg-sakernas/page.tsx` with a tiny `'use client'` redirect
  (`useEffect` + `router.replace('/sdg')`) — or delete the route entirely
  and accept the 404. Record which option you chose in this file's Status
  line.
- Drop the two never-used props (`tptTimelineData`, `provinceTptData`)
  from the client AND stop loading those files in the page (build-time
  waste).

### 0.4 EditorialPageShell header props

Smallest honest fix: delete the dead `eyebrow/title/description/summary`
props from the type and from every call site (grep `EditorialPageShell`),
so the API stops lying. (Rendering them instead is a layout change across
every page — out of scope; note it as a possible Stage 2+ enhancement.)

### 0.5 Prune or deprecate the unused inventory

For each of: `Sidebar`, `PlatformFontProvider`, `Button`, `Select`,
`FilterGroup`, `CompactArticleList`, `tag-palette.ts`,
`getGoogleTrendsData` (server loader), `EditorialSidebarSection`, sample
generators freed by 0.2 — either delete (preferred; git remembers) or keep
with a one-line `/** UNUSED — kept for Stage N: <reason> */` header.
KEEP (a later stage consumes each): `StatCard` + `SparkLine` (Stage 2
grids/sparklines), `SourceStatusCard` (Stage 4 operasional cards),
`SectionPanel` (Stage 2/4 attribution headers), `chart-export.ts`
(Stage 3.3 decision), `CountryCard` (candidate for the 0.2 ASEAN-snapshot
rebuild — if 0.2 doesn't use it, deprecate it instead).
Update `add-visualization/references/chart-inventory.md` to match.

### 0.6 (Optional, time permitting) AI-tell sweep of existing surfaces

Per `design-taste`, the codebase carries two documented pre-existing tells:
legacy `rounded-lg` remnants (makro-indonesia/sdg/CountryCard/asean panels)
and `Badge`/NewsCard fixed Tailwind palette classes that ignore dark mode.
Sweep what fits the session: replace legacy rounding with the squared
standard, move Badge colors onto tokens (visual parity in light mode,
finally correct in dark). Pure debt removal — no redesign, no new hues.
If skipped, note it in the Status line; it stays a standing candidate.

## What NOT to do

- No new features, charts, or layout changes — this stage only removes
  lies and dead weight.
- Do not touch scrapers/workflows beyond the optional bi-pmi fix (0.1).
- Do not delete `data/bi/pmi/series.json` or any data file.
- Do not "improve" DataNotice/fallback banners away — fallback transparency
  is a guardrail feature.

## Acceptance criteria

- [ ] `grep -rn "getSample" src/` returns only explicitly-justified
      missing-file fallbacks (each with a code comment saying so), and
      NONE that render unconditionally.
- [ ] PMI surfaces show real data or "belum tersedia" — never sample
      numbers.
- [ ] `/sdg` works; `/sdg-sakernas` resolved per 0.3 decision; nav
      unchanged.
- [ ] EditorialPageShell type matches its implementation.
- [ ] `add-visualization` Definition of done passes (lint, both-basePath
      builds, light+dark check).
- [ ] README Features section updated; this Status line updated; and the
      sample-surface lists updated in ALL their copy sites:
      `add-visualization/SKILL.md` (the owner copy),
      `dashboard-onboarding/SKILL.md`, `references/architecture-map.md`,
      `references/data-catalog.md`, and
      `add-visualization/references/chart-inventory.md`.
