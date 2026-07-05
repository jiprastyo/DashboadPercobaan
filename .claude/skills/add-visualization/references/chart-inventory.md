# Component inventory — charts, cards, layout, ui

Prop APIs verified against source. Reuse before writing anything new.

## charts/ (the four shared chart components)

### `src/components/charts/LineChart.tsx` (default export, 'use client')

```ts
{ data: Record<string, unknown>[], xKey: string,
  lines: { dataKey: string; label: string; color: string; strokeDasharray?: string }[],
  height?: number = 300,
  referenceLine?: { y: number; label: string; color?: string },
  showGrid?: boolean = true, showLegend?: boolean = true,
  yDomain?, xLabel?, yLabel?,
  valueFormatter?: (value, name) => string,
  xType?: 'category' | 'number' = 'category',   // 'number' → time scale
  xDomain?, xTickFormatter?, tooltipLabelFormatter? }
```

- Recharts: ResponsiveContainer (width 100%, minHeight=height),
  CartesianGrid `3 3` on `var(--chart-grid)`, XAxis (tickLine false, axisLine
  `var(--chart-grid)`, tick 12px `var(--chart-axis)`), YAxis (axisLine
  false), Tooltip (bg `var(--chart-tooltip-bg)`, border `var(--app-border)`,
  **borderRadius 0**), Legend 12px, optional dashed ReferenceLine, Line
  monotone strokeWidth 2 dot r3 `connectNulls`.
- Default tooltip: series name containing `%` → id-ID 2-dp + `%`; else
  id-ID number. **Renaming a dataKey away from `(%)` changes formatting.**
- Time-series usage (numeric x): see MakroIndonesiaClient's TPT timeline —
  `xType="number"`, x = `Date.parse(observation_date)`,
  `xDomain={['dataMin','dataMax']}`, custom `xTickFormatter` +
  `tooltipLabelFormatter`.

### `src/components/charts/BarChart.tsx` (default export)

```ts
{ data, xKey, bars: { dataKey; label; color }[], height? = 300,
  containerMinWidth?: number,          // wraps in min-width div → h-scroll
  layout?: 'vertical' | 'horizontal' = 'horizontal',
  showGrid? = true, showLegend? = false,
  highlightKey?: string, highlightColor? = '#0D9488',  // per-datum Cell
  barSize?, xTickAngle? = 0, xTickInterval?, xTickHeight?,
  xTickFontSize? = 12, valueFormatter? }
```

Bars radius `[4,4,0,0]`; rotated ticks (`xTickAngle={-90}`, `xTickInterval={0}`,
`xTickHeight={56}`) are the pattern for 38-province comparisons.

### `src/components/charts/SparkLine.tsx`

```ts
{ data: { value: number }[], color? = '#0D9488', width? = 80, height? = 32 }
```

Fixed-size (non-responsive), no axes shown, ±10% padded domain, no dots, no
animation, returns null on empty data. Used in StatCard.

### `src/components/charts/TrendChart.tsx`

```ts
{ data, xKey, series: { keyword: string; color: string }[], height? = 350 }
```

Y locked to `[0,100]` with left label `'Interest'` (the one stray English
string — do not copy the pattern). For Google-Trends-shaped data only.
(`/tren` reads its trends data directly; the unused server loader
`getGoogleTrendsData` was DELETED in Stage 0.5.)

## cards/

- **`StatCard`** `{ title, value: string, subtitle?, change?: { value; label;
  direction: 'up'|'down'|'neutral' }, sparkData?, sparkColor?, sourceUrl?,
  icon?, info?: { arti; sumber; periodik }, className? }` — KPI card with
  trend icon, hover info tooltip, "Verifikasi sumber data" external link,
  SparkLine (hidden < sm). Currently used only by SDGSakernasClient — the
  natural building block for Stage 1/2 of `viz-revamp-roadmap`.
- **`NewsCard`** `{ title, date, sourceName, sourceOnClick?, tags?: { id;
  label; onClick? }[], url, isEstimated?, dateSource?, className? }` —
  archive row with verified-date badge (green check) / estimated badge
  (amber `!`), date-fns id locale. Used by BeritaClient.
- **`CountryCard`** — UNUSED. ASEAN country KPI card with inline sparkline
  and `data_tier` badge; candidate for revival instead of a new component.
- **`SourceStatusCard`** `{ source: SourceMetadata }` — UNUSED. Per-source
  health card; Stage 4 of the roadmap revives it on /operasional.

## dashboard/

- **`OverviewDashboard`** — server component behind `/`; no Recharts.
- **`DataNotice`** `{ bpsSource, tptSource }` — the amber fallback-data
  warning; the pattern to copy for any new fallback-transparency banner.
- **`SectionPanel`** `{ title, eyebrow?, sourceLabel?, sourceUrl?, action?,
  children, … }` — UNUSED canonical section header w/ source link; pages
  hand-roll equivalents. Prefer reviving it over another hand-roll.
- **`CompactArticleList`** — DELETED in Stage 0.5 (was unused).

## layout/

- **`EditorialPageShell`** — every page's wrapper. Type is now `sidebar,
  showSidebar, children, className, contentClassName` — the dead header props
  (`eyebrow/title/description/summary`) were removed in Stage 0.4 so the type
  matches the implementation; rendering page headers from the shell is a
  Stage 2+ layout decision, not a drive-by. Sidebar variant:
  `xl:grid-cols-[300px_minmax(0,1fr)]`, sticky `xl:top-28`. The unused
  `EditorialSidebarSection` export was DELETED in Stage 0.5.
- **`Header`** — sticky top chrome: id-ID date (set in useEffect —
  hydration-safe), wordmark "Monitoring Tak Resmi", next-themes toggle
  (`resolvedTheme`), desktop nav from `NAV_ITEMS`.
- **`MobileNav`** — fixed bottom bar (md:hidden) with 4 tabs + full-screen
  "Menu" overlay; root layout reserves `pb-14 md:pb-0`.
- **`Footer`** — returns null (deliberate). **`Sidebar`** and
  **`PlatformFontProvider`** were DELETED in Stage 0.5 (unused).

## ui/

- **`CompactChip`** `{ children, active?, onClick?, onRemove?, className?,
  title?, type? }` — THE filter chip (`.app-compact-chip` class,
  data-active/data-clickable). Everything filterable uses it.
- **`MultiSelectDropdown`** `{ options {id,label,color?}[], selected[],
  onChange, placeholder, className? }` — click-outside close, "N dipilih"
  summary, reset header.
- **`SearchBar`** `{ placeholder?, value?, onChange?, className?,
  ariaLabel? }`; **`Pagination`** `{ currentPage, totalPages, onPageChange }`
  (null when ≤1 page, ellipsis windowing); **`ActiveFilterChips`** `{ items
  {id,label,onRemove}[], onResetAll? }`; **`Badge`** `{ variant:
  default|success|warning|danger|info|outline, size }` — fixed Tailwind
  palette classes that do NOT swap in dark mode (known wart).
- DELETED in Stage 0.5 (unused): **`Button`**, **`Select`**, **`FilterGroup`**.

## Recurring page-level patterns (copy, don't reinvent)

- **Chart/table toggle:** two-button segmented control (`bg-[var(--app-border)]/30
  p-1`, active `text-[var(--app-teal)]`, TrendingUp/Table icons) —
  duplicated inline on makro-indonesia/asean/sdg. If you touch three of
  them, extracting a shared component is welcome; adding a fourth copy is
  not.
- **"Effective selection" chips:** `useMemo` + `useEffect` pairs that
  restore a full selection when filters would empty a chart, and refuse to
  remove the last selected item (`length > 1` guards).
- **Filters reset pagination:** every filter setter also `setPage(1)`.
- **3-box attribution grid:** "Arti Indikator / Sumber Data / Periode
  Sumber Data" with "Verifikasi Sumber ↗" after every makro-indonesia chart
  section.
- **CollapsibleSection** (local to MakroIndonesiaClient): useState +
  chevron; `defaultOpen` varies.

## Unused-inventory rule

Before writing any new component, check the UNUSED items above and prefer:
(1) revive, (2) extend an existing component, (3) write new — in that order.
When you revive one, remove it from these lists; when you deliberately
delete one, that is a Stage 0 (`viz-revamp-roadmap`) action recorded there.
