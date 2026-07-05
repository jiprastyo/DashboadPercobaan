---
name: viz-revamp-roadmap
description: >-
  The staged visualization revamp for the DashboadPercobaan dashboard — the
  owner's mandate to add more data presentation and visualization while
  keeping the site simple, easy to use, autonomous, and benchmark-aware. Use
  this whenever the task is "improve the dashboard", "add more charts/
  visualization", "make it richer", "lanjutkan revamp", or any feature work
  that is not a bugfix — BEFORE inventing your own feature ideas. The
  roadmap is ordered; sessions execute the next incomplete stage rather than
  cherry-picking. Also use it to check whether a proposed feature is already
  specced (it usually is).
---

# Visualization revamp roadmap

The owner's brief: **more data presentation & visualization; same ease of
use; visually simple; autonomous official-data fetching preserved; always
readable against its targets** (mission, source health, and quantitative
benchmarks — SDG/RPJMN/ASEAN). This skill turns that brief into five
session-sized stages with acceptance criteria, so cheaper sessions can
execute without re-deriving the strategy.

## How to use the roadmap

1. Find the current stage: each `references/stage-N.md` starts with a
   `Status:` line (`not-started` / `in-progress (<what remains>)` /
   `done (<date>, <commit>)`). The next incomplete stage is your assignment.
   **Tie-break with `add-visualization`:** if the user requests a *specific*
   chart/page, first check whether a stage already specs it — if yes,
   execute it under that stage's criteria (respecting stage order); if no
   stage specs it, build it via `add-visualization` directly. The stage
   order binds open-ended "improve the dashboard" work, not every visual
   request.
2. **Never start stage N+1 while stage N is unmerged.** The order is the
   strategy: trust first (0), meaning second (1), density third (2),
   interaction fourth (3), self-observation fifth (4). A benchmark band
   drawn over fake PMI data (1 before 0) would be worse than nothing.
3. A stage should fit one focused session. If you cannot finish, leave the
   stage file's `Status:` line describing exactly what remains — that line
   is the handoff.
4. On completion: update the stage `Status:` line, update `README.md`'s
   Features section, and update
   `dashboard-onboarding/references/data-catalog.md` if data files
   changed. Then stop — do not roll into the next stage uninvited.
5. Every stage obeys `project-guardrails` (especially the simplicity budget
   and no-new-dependencies rule) and `add-visualization`'s invariants, and
   ships through `add-visualization`'s Definition of done.

## The stages

| Stage | Theme | One-line goal |
|---|---|---|
| `references/stage-0.md` | **Debt clearance** | No fake data on any production surface; one SDG route; honest empty states. |
| `references/stage-1.md` | **Benchmark layer** | Every headline indicator readable against SDG 8 / RPJMN / ASEAN targets via reference bands + delta chips. |
| `references/stage-2.md` | **Density without clutter** | Provincial small-multiples, sector heat strip, PHK tracker, overview sparklines — more insight per pixel. |
| `references/stage-3.md` | **Interactivity & export** | Per-chart CSV download, unified period selector; optionally restore PNG export. |
| `references/stage-4.md` | **Data-health surface** | Freshness badges and source-status cards so scraper decay is visible to users. |

A second, sibling roadmap exists: `programme-tracker` (stages P1–P3 —
RPJMN/programmes/ministry tracking on Sakernas+Susenas). Its P2 depends on
THIS roadmap's stages 0–1; where sessions must choose, stages 0–1 here
outrank P-stages.

Why this order: Stage 0 makes every pixel trustworthy (fake data anywhere
poisons everything after). Stage 1 delivers the owner's "keep an eye on its
target" directly and cheaply (Recharts ReferenceLine/ReferenceArea — zero
new deps). Stage 2 adds the "more data presentation" mass, safely, because
stages 0–1 established honest data and benchmark context. Stage 3 adds
utility that assumes charts are worth exporting. Stage 4 closes the loop by
making the autonomous pipeline's health part of the product.

## Standing rules for all stages

- **No new npm dependencies.** Everything specced is achievable with
  Recharts 3 + existing libs. A stage that seems to need a dependency is
  mis-scoped — stop and reconsider.
- **Reuse the existing inventory first** (`add-visualization/references/
  chart-inventory.md`): CountryCard and SectionPanel are unused-but-intact;
  StatCard and SparkLine are live but only on `/sdg`; SourceStatusCard was
  unused-but-intact through Stage 3 and was revived on `/operasional` in
  Stage 4.3. All five existed for exactly these stages.
- **Indonesian labels, source attribution, dark-mode tokens, dual-basePath**
  — non-negotiable per `add-visualization`.
- **Benchmarks come from `data/benchmarks/targets.json` only** (created in
  Stage 1): hand-curated, every entry citing an official publication URL,
  rendered as reference lines/bands, never mixed into observed series
  (`project-guardrails` c).
- Data-side changes ride `data-validation`; new loaders follow the
  `data-loader-server.ts` pattern.
- **Every stage's UI work passes the `design-taste` pre-flight** (the
  anti-AI-vibe gate) as part of `add-visualization`'s Definition of done.

## Definition of done (for any roadmap session)

- The stage file's acceptance criteria are ALL checked, or the `Status:`
  line precisely states the remainder.
- `add-visualization` Definition of done passed (lint, both-basePath
  builds, light+dark visual check, no `getSample*` extension).
- Stage file `Status:` updated; README Features updated; onboarding
  catalog/map updated if data or routes changed.
- The diff contains only the stage's scope — no opportunistic refactors
  (file them as notes in the stage file instead).
