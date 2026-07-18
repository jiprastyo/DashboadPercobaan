---
name: design-taste
description: >-
  The anti-AI-vibe design gate for the DashboadPercobaan dashboard. Use this
  BEFORE styling anything — any new component, page, chart, card, table,
  filter, or section; any revamp stage's UI work; any change to color,
  spacing, shape, motion, or typography — even if the change seems purely
  functional. Also use it whenever a request contains "redesign", "modern
  look", "make it look better", "polish", "beautify", "clean it up", "more
  professional", or "it looks AI-ish". This site already HAS a deliberate
  design language; this skill's job is to DEFEND that language from generic
  AI-slop drift during the revamp, not to introduce a new aesthetic. Skipping
  it is how a session quietly turns a trust-first statistics instrument into a
  generic AI SaaS landing page.
---

# Design taste — defend the house language

This dashboard is not a blank canvas. It has a design read that is FIXED, not
inferred per session, and every styling decision is measured against it:

> **Trust-first statistical editorial for Indonesian policy watchers: muted
> Wikipedia-ish tokens, squared geometry, near-zero motion, dense-but-
> scannable data, source attribution everywhere.**

The credibility aesthetic IS the brand. A reader trusts these numbers partly
because the site looks like a public-record instrument, not a startup pitch.
Your job when touching any UI is to keep it that way. The default failure mode
of an LLM asked to "modernize" or "polish" is to reach for the generic
AI-landing-page kit (gradients, glass, rounded cards, hover animation). On
this site that kit is not neutral, it is off-brand and it destroys trust.

## The three dials, pinned (do not infer them per session)

This project IS the "trust-first / public-sector / regulated" preset. The
dials are constants, not conversational overrides:

- **VARIANCE 3-4** — near-symmetric, grid-disciplined layout. Not artsy, not
  asymmetric-for-effect. Data laid out predictably so the eye can compare.
- **MOTION 2** — near-static. The entire sanctioned motion budget is: the
  theme toggle, chip/hover state changes, and chart tooltips. That is roughly
  it. Anything new that moves must respect `prefers-reduced-motion`.
- **DENSITY 5** — dense but scannable. More insight per pixel via tables and
  small-multiples, never via hero cards or whitespace-as-luxury. Density
  serves scanning, it is not "cockpit" clutter.

Why pinned: the audience is policy watchers, journalists, and analysts
verifying claims, not design-conscious consumers. The audience picks the
aesthetic, and this audience wants legibility and provenance over delight.

## The forbidden AI-tells (hard gate)

These are the LLM's default reaches when it tries to "look designed". On this
site each one is banned. This list is a gate: a diff that introduces any of
these does not ship until the pattern is removed or explicitly justified.

- **AI-purple / indigo gradients, mesh or "aurora" backgrounds, neon glows.**
  The palette is muted tokens (see `add-visualization/references/design-system.md`).
  No gradient backgrounds, no glow shadows. Depth comes from borders, not blur.
- **Glassmorphism / backdrop-blur decoration.** There is exactly ONE sanctioned
  use in the whole app: the sticky `Header`'s translucent `color-mix` +
  backdrop-blur. It is grandfathered. Do NOT spread backdrop-blur to cards,
  panels, modals, or anything else.
- **Three-equal-feature-cards marketing rows.** The "3 identical cards in a
  row" landing-page layout has no place on a data instrument. Group data with
  tables, small-multiples, or bordered sections instead.
- **Emoji as icons.** Icons are lucide SVGs only. The ONE deliberate exception
  is flags, which are intentionally emoji — keep those; do not "upgrade" them
  to an icon set, and do not add new decorative emoji anywhere.
- **Inter + slate-900 default combo.** The site uses Geist (via `next/font`)
  plus its own token grays (`--app-text`, `--app-muted`, `--app-subtle`).
  Never swap the font to Inter and never hardcode `slate-*` / `gray-900`.
- **rounded-2xl + soft drop-shadow card inflation.** The geometry is squared:
  chips and tooltips are `border-radius: 0`, cards are unrounded bordered
  surfaces. No `rounded-2xl`, no `shadow-lg` card floating. Borders, not
  shadows. (Some legacy `rounded-lg` survives — do not add more, do not
  "harmonize" by rounding everything.)
- **Infinite micro-animations, scroll-jacking, hover-lift-on-everything.**
  Motion budget is the three items above. No `animate-` loops, no
  `-translate-y` hover lifts on cards, no scroll-triggered reveals, no
  parallax. Anything genuinely new that animates respects
  `prefers-reduced-motion`.
- **Centered-hero-with-gradient-text.** There is no marketing hero here. Pages
  are editorial: eyebrow, title, dense content. No big centered gradient
  headline.
- **Placeholder content of ANY kind.** "Jane Doe", "Acme Corp", lorem ipsum,
  fake avatars, invented sample numbers. This is the SAME principle as this
  repo's iron rule: **no fabricated data, ever** (`project-guardrails` g). The
  taste-skill "Jane Doe effect" and this repo's fabricated-data rule are one
  rule. Never extend a `getSample*()` path (see `add-visualization`'s
  sample-data trap and the getSample purge in `viz-revamp-roadmap`
  `references/stage-0.md`); use a real value or an honest Indonesian empty
  state.
- **Gratuitous badges / pills / gradient buttons.** A colored status dot or
  badge is allowed only when it conveys real semantic state (source tier,
  estimated-date flag). No decorative pills, no gradient CTAs, no "NEW" ribbons.
- **Dark-mode-only (or light-mode-only) design.** The site is dual-theme via
  tokens. Every change must be verified in BOTH light and dark.

**The em-dash.** The upstream skill bans the em-dash outright as the #1 AI
tell. Prose in this repo is Indonesian editorial; prefer a regular hyphen or a
restructured sentence over `—` in any user-facing string.

## Positive direction — what "good" looks like here

Do not just avoid the bad; steer toward the house language (all of this is
codified in `add-visualization/references/design-system.md`):

- **Tokens only** for chrome. `var(--app-*)` colors; the only literal hex
  allowed is a chart *series* color from the established palette.
- **Squared geometry.** Bordered surfaces, `border-radius: 0` on chips/tooltips.
- **10-11px uppercase eyebrows**: `text-[10px..11px] font-bold uppercase
  tracking-[0.06em..0.1em] text-[var(--app-subtle)]`.
- **id-ID number and date formatting** via the `src/lib/utils.ts` helpers
  (`formatNumber`, `formatPercent`, `formatRupiah`, `formatDate`).
- **Source attribution as a visual element**, not an afterthought. The
  "Verifikasi Sumber ↗" link, the 3-box "Arti / Sumber / Periode" grid, the
  StatCard `sourceUrl` — these ARE the aesthetic. Credibility is the brand.
- **Whitespace via rhythm, not emptiness.** `space-y-4` / `gap-4`, `p-3`-`p-5`.
  Consistent rhythm reads as calm; big empty hero space reads as marketing.
- **Density serving scanning.** Tables and small-multiples over hero cards;
  cards-on-mobile / table-on-desktop (`md:hidden` + `hidden md:block`).

## The drift test (run it on every UI change)

Before shipping, ask one question:

> **Could this exact styling appear, unchanged, in a generic AI-generated SaaS
> landing page?**

If yes, it does not ship here. Then run the pre-flight checklist:

1. **Tokens** — all new chrome colors are `var(--app-*)`; no raw hex except an
   approved chart series color.
2. **Geometry** — squared; no new `rounded-2xl` / `rounded-xl`; no new shadows.
3. **Motion** — nothing new animates beyond the sanctioned budget; anything
   that does honors `prefers-reduced-motion`.
4. **No placeholder / fabricated content** — real values or honest Indonesian
   empty states; no new `getSample*`.
5. **Source attribution present** — every new data surface carries its
   period + `_source_url`.
6. **Indonesian + id-ID** — all strings Indonesian, numbers/dates via the
   locale helpers.
7. **Both themes** — verified in light AND dark; no fixed Tailwind color
   classes that ignore `.dark`.
8. **Drift test passed** — the answer to the question above is "no".

## Worked example: "modernize the stat cards"

A request to "make the stat cards look more modern / polished". The wrong
instinct is the AI kit; the right move is the house language, using the real
`StatCard` props (`{ title, value, subtitle?, change?: { value; label;
direction }, sparkData?, sparkColor?, sourceUrl?, icon?, info? }`).

**Done wrong (fails the drift test):**

```tsx
// AI-slop: rounded-2xl, gradient accent, hover lift, glow, no source
<div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
                text-white shadow-lg hover:-translate-y-1 transition-transform">
  <span className="animate-pulse">Pengangguran</span>
  <p className="text-4xl">5.32%</p>
  <div className="drop-shadow-[0_0_12px_#8b5cf6]"><Sparkline glow /></div>
</div>
```

Every line here is a Tell: gradient, rounded-2xl, shadow-lg, hover-lift,
animate-pulse, glow, and no source link. It would look identical on any AI
SaaS landing page.

**Done right (house language):**

```tsx
// Token borders, squared, tabular value, real delta chip, source link
<StatCard
  title="Tingkat Pengangguran Terbuka"
  value={formatPercent(5.32)}
  change={{ value: '-0.18', label: 'yoy', direction: 'down' }}
  sparkData={tptSpark}
  sparkColor="#a33d2d"
  sourceUrl="https://webapi.bps.go.id/..."
  info={{ arti: '…', sumber: 'BPS Sakernas', periodik: 'Feb 2025' }}
/>
```

Bordered `var(--app-border)` surface, squared corners, `id-ID` value, a delta
chip that encodes real semantic direction, and the "Verifikasi sumber data"
link. The credibility markers ARE the polish.

## Cross-references

- `add-visualization/references/design-system.md` — the token table, dark-mode
  mechanics, typography, shape/spacing rhythm. The source of truth this skill
  defends.
- `add-visualization` — the mechanics (loaders, chart components, static-export
  constraints) and the DoD every UI change already runs.
- `project-guardrails` — **d)** simplicity budget (visual restraint is a paid
  feature) and **g)** the fabricated-data iron rule (= the "Jane Doe" ban).

## Attribution

Adapted for this repository from Leonxlnx/taste-skill (MIT-licensed). The
upstream skill targets landing pages, portfolios, and redesigns and explicitly
excludes dashboards and data tables. This adaptation pins its "trust-first /
public-sector" preset as a constant and keeps only the dashboard-relevant
rules; it does not import the landing-page machinery. Distilled, not copied
verbatim.

## Definition of done

- The **pre-flight checklist above passed**, and the passing result is stated
  in the commit body (one line naming the drift test + the checklist).
- **Light and dark** screenshots compared for the changed surface.
- **No new hex** introduced outside the sanctioned chart-series palette; all
  chrome on `var(--app-*)` tokens.
- **grep the diff for banned patterns** — `backdrop-blur`, `gradient`,
  `rounded-2xl`, `shadow-lg`, `animate-` beyond the sanctioned budget — and
  every remaining hit is justified in the commit body or removed.
- **`add-visualization`'s Definition of done still applies** in full (lint,
  both-basePath builds, light+dark visual check, no `getSample*` extension).
