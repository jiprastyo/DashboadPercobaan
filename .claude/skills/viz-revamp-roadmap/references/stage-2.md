# Stage 2 — Density without clutter

Status: not-started (requires stage-1 done)

## Goal

The "more data presentation" mass of the revamp: four additions that raise
insight-per-pixel without adding visual noise, each built from existing
components and existing data. If any item starts demanding a new dependency
or a busy layout, it is being built wrong — stop and re-read
`project-guardrails` (d).

## Work items (each independently shippable; do them in order)

### 2.1 Provincial TPT small-multiples grid (makro-indonesia)

A responsive grid (2/4/6 cols) of 38 small cards: province name, latest
TPT value, and a `SparkLine` of its Sakernas history from
`data/bps/provinsi/tpt-historical.json` (join key
`${province_code}|${observation_date}` — the page already builds this
Map). Sort control: by latest TPT desc/asc or by code. Clicking a card
toggles that province into the existing timeline chart's selection
(`selectedCoverages`) — reuse, don't duplicate, that state. National (`00`)
pinned first with `--app-teal` accent. Card styling is `design-taste`-bound:
token borders, squared, no shadows, no hover-lift — 38 small cards is
exactly the surface where AI card-grid styling creeps in. Placement: inside the existing TPT
CollapsibleSection as a third view (`viewType: 'grid'`) — NOT a new page.

### 2.2 KBLI sector heat strip (berita)

Above the article list: 18 `CompactChip`-styled cells (one per KBLI
sector, `KBLI_SECTORS` icons + labels), each showing the article count for
the current filter selection, with background intensity scaled by count
(4–5 discrete opacity steps of one hue — NOT a continuous gradient, NOT
18 colors). Clicking a cell toggles that sector in `selectedSectors`
(existing state). Counts derive from the already-filtered array — zero new
data work. Mobile: horizontally scrollable row.

### 2.3 Honest PHK tracker (makro-indonesia, replaces the Stage-0-removed fake)

Data reality: `data/kemenaker/phk/articles.json` has `{title, date,
summary, link}` — no reliable worker counts. Honest design: a monthly
`BarChart` of **article counts** (Kemenaker releases + news archive rows
whose `keywords_matched` contains `phk`/`pemutusan hubungan kerja` — reuse
`generalPHK` logic from overview-data.ts), color `#EF4444`, plus the
existing detail list linking each release. Label it as what it is:
"Intensitas pemberitaan & rilis resmi PHK" — a signal proxy, stated in the
attribution box. Do NOT present counts as workers affected; do NOT extract
numbers from headlines with regex (fabrication-adjacent).

### 2.4 Overview sparklines (ikhtisar)

The overview's "Statistik Indonesia" `DataRow`s gain SparkLines: TPT
(yearly from `national-historical.json`), Inflasi MtM (last 12 from
`national-indicators.json`), PMI (only if Stage 0 wired real data and it
is non-empty). Either extend `DataRow` with an optional `spark` slot or
swap the section to compact `StatCard`s — pick ONE pattern for all rows.
OverviewDashboard is a **server component**: SparkLine is `'use client'`
and that boundary is fine (client child of server parent), but do not add
hooks/state to OverviewDashboard itself.

## What NOT to do

- No choropleth map. Evaluated and rejected: needs a geo/topojson dep +
  projection code (violates no-new-deps), and 38 provinces read fine as a
  sorted grid/bar. Revisit only with written owner approval.
- No new routes/pages; everything lands on existing surfaces.
- No new filter systems — reuse existing state and chip patterns.
- Nothing that pushes a page past "scan in 10 seconds" — if a section
  needs explanation text to be parseable, simplify it.

## Acceptance criteria

- [ ] All four items render real data with Indonesian labels, attribution,
      and empty states; zero `getSample*` usage.
- [ ] Small-multiples grid interops with the timeline selection; heat
      strip interops with `selectedSectors`; both are keyboard-focusable
      (`focus-visible:app-focus`).
- [ ] PHK tracker is explicitly labeled as reporting intensity, not
      workers affected.
- [ ] Light + dark legible; mobile: grid wraps, strip scrolls, sparklines
      hidden below `sm` where StatCard already does so.
- [ ] `add-visualization` DoD passes; Status line + README updated.
