# Stage P2 — The /program tracker page

Status: not-started
Prerequisites: P1 done; viz-revamp stage-0 AND stage-1 done (honest
surfaces + targets.json with the loader-skip rule).

## Goal

One new route `/program` ("Program & Kementerian") with two views on one
page: the **availability matrix** and **programme-vs-target cards**. This
is the only new route this feature area gets (simplicity budget).

## Design

Follow `add-visualization` end-to-end (server loads → client renders).

### Loader

`getProgrammeTrackerData()` in `data-loader-server.ts` per
`data-model.md`'s consumption contract: join registries + targets +
referenced series at build time; skip `verified:false` rows and sentinel
targets; `console.error` + omit on broken `series_ref`. Typed return; no
`any`.

### View 1 — Matriks ketersediaan data (availability matrix)

- Table (desktop) / stacked cards (mobile, `md:hidden` split like the
  overview ASEAN snapshot): rows = needs grouped by ministry
  (`short_name` + labor-lens tooltip), columns = need, provider
  (Sakernas/Susenas/BPS-lainnya as `Badge`), availability, latest value
  (when `available`, from the joined series) with period.
- Availability rendering: `available` = success badge + latest value;
  `partial` = warning badge + the `notes` text (why only a proxy);
  `not-collected` = neutral/danger badge + "Belum dikumpulkan BPS" — this
  is a *finding the page exists to surface*, style it as information, not
  as an error.
- Filters: ministry `CompactChip` row + provider chips, reusing the
  existing chip semantics (no new filter machinery).
- Attribution: the standard 3-box grid; sources are BPS Web API + the
  registries ("Registri kebutuhan data dikurasi manual — lihat sumber per
  baris").

### View 2 — Program vs target

- One card per programme (grid, 2–3 cols; `design-taste`-bound — token
  borders, squared, no shadows/hover-lift, this must not read as a SaaS
  pricing grid): programme name, owning ministry,
  linked indicator's latest value as a `StatCard` with vs-target delta chip
  (the stage-1 mechanism — reuse its inverted-direction logic for
  TPT-like indicators), SparkLine of the indicator series, and the target
  band value with its `source_name` + `_source_url` link.
- Programmes whose targets are still sentinel/null render WITHOUT a delta
  ("Target belum terverifikasi") — never with a guessed comparison.
- RPJMN section header groups Bappenas-owned targets first (they are the
  national frame the ministry programmes hang off).

### Navigation

Add one `NAV_ITEMS` entry (`/program`, label "Program", pick a lucide icon
string consistent with `MobileNav`'s iconMap). MobileNav's 4 main tabs are
full — Program goes in the overflow "Menu" list, not the bottom bar.

## What NOT to do

- No per-ministry pages/routes; no ministry logos (image policy); no
  Indonesian-government color theming (token palette only).
- No client-side data fetching; no new deps; no new chart types (StatCard +
  SparkLine + Badge + table cover it).
- Do not render anything from `verified:false` registry rows — not even
  grayed out (unverified names on an official-statistics site read as
  endorsement).
- Do not blend ministry-published realization numbers into BPS series on
  any chart (guardrail b) — v1 cards track BPS indicator vs target only.

## Acceptance criteria

- [ ] `/program` prerenders with real P1 data; both views work with
      filters; empty/sentinel states render honest Indonesian text.
- [ ] Matrix correctly shows all three availability states; every
      `available` row shows a live value + period traceable to its
      `series_ref`.
- [ ] No delta chip renders against an unverified target.
- [ ] Nav entry works on desktop and in MobileNav's menu overlay; both
      basePath builds pass; light+dark pass.
- [ ] `design-taste` pre-flight passed (no AI-tells; token-only styling).
- [ ] `add-visualization` DoD passes; onboarding architecture-map +
      data-catalog gain the route/loader rows; README updated; Status
      line updated.
