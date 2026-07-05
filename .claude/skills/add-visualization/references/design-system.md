# Design system — tokens, dark mode, typography, layout rhythm

Source of truth: `src/app/globals.css` (Tailwind 4 CSS-first config — there
is NO tailwind.config.js; theme extensions go in `@theme` blocks).

## Color tokens (CSS variables)

Light (`:root`) / dark (`.dark`) pairs — components reference the vars, so
theme switching is automatic:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--app-bg` / `--app-bg-soft` | `#f8f9fa` / `#f1f3f5` | `#111315` / — | page background / inset areas |
| `--app-surface` / `--app-surface-raised` | `#ffffff` / `#fbfbfc` | `#15181b` / — | cards / raised headers |
| `--app-border` / `--app-border-strong` | `#c8ccd1` / `#a2a9b1` | dark grays | borders |
| `--app-text` / `--app-muted` / `--app-subtle` | `#202122` / `#54595d` / `#72777d` | `#eaecf0` / … | text hierarchy |
| `--app-accent` / `--app-accent-ink` | `#6b4f2a` / `#4c3620` | `#b49b6b` / … | accent (brownish) |
| `--app-link` | `#3366cc` | `#88aef5` | links |
| `--app-teal` | `#507b6a` | `#7aa693` | primary data color |
| `--app-danger` / `--app-success` / `--app-warning` | `#a33d2d` / `#2f6b4f` / `#8d5a15` | — | status |
| `--chart-grid` / `--chart-axis` / `--chart-tooltip-bg` | rgba grays / `#ffffff` | dark equivalents (`#1d2126` tooltip) | chart chrome |

The palette is deliberately muted/Wikipedia-ish (aligned with the sister
site via `scripts/get-colors.ts`). Respect it: new UI chrome uses tokens,
never raw hex.

**Chart series colors are the exception:** callers pass literal hex that
does NOT swap with theme. Established series hues: teal `#0D9488` (primary),
amber `#F59E0B` (secondary/dashed), red `#EF4444` (negative/PHK/TPT),
blue `#3B82F6`, violet `#8B5CF6` (wisman), plus /tren's muted set
(`#507b6a`, `#8d5a15`, `#a33d2d`, `#3366cc`, …) and makro-asean's 11-color
`LINE_COLORS`. Pick from these; check contrast on `#f8f9fa` AND `#111315`
before introducing a new hue.

## Dark mode mechanics

`layout.tsx`: `<html lang="id" suppressHydrationWarning>` →
`ThemeProvider attribute="class" defaultTheme="system" enableSystem`
(next-themes toggles `.dark` on `<html>`; Header toggle uses
`resolvedTheme`). Everything on tokens adapts free. Known non-adapting
warts (do not replicate): Badge's fixed emerald/amber/red Tailwind classes,
NewsCard tooltip palette classes.

## Typography & language

- Geist via `next/font/google`, CSS var `--app-font-sans`; body 14px/1.5.
- Eyebrows/section labels: `text-[10px..11px] font-bold uppercase
  tracking-[0.06em..0.1em] text-[var(--app-subtle)]`.
- KPI values: `text-2xl font-extrabold`.
- All user-facing strings Indonesian; numbers/dates via `Intl` locale
  `id-ID` / date-fns locale `id` (helpers in `src/lib/utils.ts`:
  `formatNumber`, `formatPercent`, `formatRupiah`, `formatDate`,
  `formatRelativeTime`).

## Shape & spacing rhythm

- **Squared-off aesthetic**: chips and chart tooltips have
  `border-radius: 0`; cards are mostly unrounded (`border
  border-[var(--app-border)] bg-[var(--app-surface)]`). Some legacy
  `rounded-lg` survives; do not add more.
- Spacing: `space-y-4` / `gap-4`; padding `p-3`–`p-5`; main container
  `max-w-[1760px]`.
- Focus: use the custom utility `focus-visible:app-focus` on every
  interactive element (defined via `@utility app-focus` in globals.css).
- `.no-print` hides elements in print media.
- Custom scrollbars and `::selection` are themed — avoid inline scrollbar
  styling.

## Layout conventions

- Chrome: sticky `Header` (z-30, translucent `color-mix` + backdrop-blur) +
  bottom `MobileNav` (md:hidden). No persistent sidebar.
- Pages wrap in `EditorialPageShell`; filter-heavy pages (berita, brs,
  riset-akademik) use its 300px sticky sidebar variant.
- Empty/failure states: plain Indonesian sentence in the standard bordered
  surface. No illustrations, no spinners beyond BeritaClient's existing one.
- Mobile: cards-on-mobile/table-on-desktop split uses `md:hidden` +
  `hidden md:block` (see overview ASEAN snapshot); BarChart's
  `containerMinWidth` gives horizontal scroll for wide charts.

## Static-export constraints (design implications)

- No server at runtime: no dynamic OG images, no personalization, no
  server-computed "live" badges — anything time-relative rendered on the
  server is frozen at build (compute relative times client-side, as Header
  does).
- `images: { unoptimized: true }`; the app deliberately uses no
  `next/image` (lucide SVGs + emoji flags). Keep raster images out.
- `trailingSlash: true`; internal links via `next/link` only.
- Dual basePath (Vercel empty / Pages `/DashboadPercobaan`): any runtime
  asset URL must be prefixed with `process.env.NEXT_PUBLIC_BASE_PATH || ''`
  — but the design intent is that BeritaClient's archive fetch stays the
  ONLY runtime fetch.
