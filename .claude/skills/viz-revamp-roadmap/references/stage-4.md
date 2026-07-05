# Stage 4 — Data-health surface (source health as product)

Status: done (2026-07-05, commits ccae457 4.1, 136ce95 4.2, 7c96fc9 4.3;
4.4's shared rule was implemented as part of 4.1/4.3 rather than a
separate commit -- see the Definition of done note below for why)

## Goal

Make the autonomous pipeline's health visible to users, not just to
operators reading `data/ops/`. The owner's "retain autonomous fetching"
requirement implies its inverse: when fetching decays, someone must SEE it.
After this stage, a dead scraper is a visible badge within one build cycle
instead of a silent staleness.

**Constraint to design within:** the site is a static export — every
"freshness" computation happens at build time and freezes until the next
deploy. That is acceptable: scrape commits trigger deploys, so builds are
frequent; a scraper dying stops its commits but OTHER scrapers keep
triggering builds, so the dead source's staleness keeps growing in
subsequent builds. State this trade-off in the UI copy ("status per build
terakhir").

## Work items

### 4.1 Freshness badge component

Small client component (`SourceFreshnessBadge`): dot + relative time
("diperbarui 2 hari lalu" via `formatRelativeTime`), status color ok/
warning/error from tokens (`--app-success`/`--app-warning`/`--app-danger`).
Data: a new `getSourceFreshness()` helper in `data-loader-server.ts`
combining `data/_metadata.json` `scrapers.<name>.lastFetch/lastStatus`
with per-source staleness windows — **reuse the `STALE_LIMIT_DAYS` table
currently duplicated in OperasionalClient; move it to a shared module
(`src/lib/constants.ts`) so operasional and the badges read ONE table.**

### 4.2 Badges on data pages

Each chart-bearing page's attribution area gains the badge for its
underlying source(s): makro-indonesia (bps-national, bps-provinsi), brs
(bps-html), makro-asean (asean-fallback), tren (trends-node), berita
(news-aggregator), sdg (bps-sdg-sakernas — note it is manual-run; its
staleness window is `_generated_at`-based and generous). Placement inside
the existing "Sumber Data" boxes — no new visual band, no layout shift.

### 4.3 Revive `SourceStatusCard` on /operasional

`src/components/cards/SourceStatusCard.tsx` exists unused and expects the
`SourceMetadata` shape. Adapt it to the real per-scraper merge the
operasional client already computes (`latestOps` + `freshnessFor()`), and
render a card grid above the existing table (cards for scanning, table
for detail). Delete the client's local duplicate types by importing shared
ones while you are there (`OpsLogEntry` etc. from data-loader-server).

### 4.4 Stale-source warning logic

One rule, one place (the shared freshness helper): `error` when
`lastStatus === 'error'` OR staleness > 2× window; `warning` when
staleness > window OR `lastStatus === 'partial'`; else `ok`. The
/operasional "Yang perlu dicek" panel and the page badges must both derive
from this helper — no second implementation. Remember the silent-success
traps (`pipeline-debugging/references/failure-modes.md` §8): for bi-pmi,
asean-nso, trends, freshness/record-count IS the health signal, which is
exactly why this stage matters.

## What NOT to do

- No runtime polling, no client-side fetches of ops data, no status API —
  build-time only (cost envelope).
- No red alarm styling on normal `partial` news runs (steady-state N
  source failures are normal — thresholds live in the shared helper, not
  per-page).
- Do not surface raw error strings to users (operasional already has
  `sanitizeOperationalMessage` for operator view; public pages get only
  the badge + relative time).

## Acceptance criteria

- [x] One shared freshness helper + one shared staleness table; the
      OperasionalClient duplicate table is deleted. `evaluateFreshness()`
      + `STALE_LIMIT_DAYS` now live once in `src/lib/constants.ts`;
      `getSourceFreshness()`/`getManualSourceFreshness()`
      (`data-loader-server.ts`) and `OperasionalClient.freshnessFor()` are
      thin wrappers around it — grepped the repo to confirm zero other
      `ageDays > limit` / `lastStatus === 'error'` staleness logic exists.
- [x] Every listed page shows its source badge inside existing attribution
      UI; no layout shift. Verified at the code level (badge is an inline
      `<span>` with a dot + text inserted into an existing box/line on
      each page, never a new section) and by grepping built HTML for the
      badge's rendered text ("diperbarui N hari/minggu/jam lalu") on all
      six pages (makro-indonesia, brs, makro-asean, tren, berita, sdg)
      post-build. Browser-side pixel-diff screenshots were not available
      in this sandbox; the layout-shift claim rests on the structural
      argument (badge added inline inside a pre-existing box) plus grep
      confirmation the surrounding markup is otherwise unchanged.
- [x] SourceStatusCard grid live on /operasional; duplicate local types
      removed. Grid renders above the existing detail table; `OpsLogEntry`,
      `ScraperMetadata`, `DataInventoryEntry` are now imported from
      `data-loader-server.ts` instead of hand-rolled duplicates.
- [x] Simulated staleness (temporarily edit `_metadata.json` locally)
      flips badges through ok→warning→error correctly. Proven three ways:
      (1) isolated `getSourceFreshness()` calls via a throwaway
      `npx tsx` script at ages 6/50/100 days -> ok/warning/error; (2) a
      full rebuild with `data/_metadata.json`'s `bps-html.lastStatus`
      mutated to `'error'` -> the `/brs` page's badge (built HTML)
      rendered reason "Run terakhir gagal."; (3) a full rebuild with
      `data/ops/2026-06-28.json`'s `bps-html` entry mutated to `'error'`
      -> `/operasional`'s "Yang perlu dicek" panel and card grid picked it
      up. All three mutations were restored via `git checkout --
      data/_metadata.json` / `data/ops/2026-06-28.json` and `git status
      data/` was confirmed clean before every commit in this stage.
- [x] UI copy states "per build terakhir" semantics; Indonesian labels;
      light+dark pass (token-only colors, verified at the code level --
      `--app-success`/`--app-warning`/`--app-danger` via `var()`, no fixed
      Tailwind palette classes reintroduced).
- [x] `add-visualization` DoD passes; Status line + README updated. The
      roadmap is complete — see the retrospective + next-roadmap proposal
      below; no Stage 5 was invented.

## Retrospective (end of the 5-stage roadmap)

Stages 0-4 took the dashboard from "may render fabricated numbers" (0) to
"every headline number is benchmarked" (1) to "denser without more clutter"
(2) to "chart output is portable" (3) to "the pipeline's own health is a
visible product surface" (4). The common thread each stage leaned on:
reuse the existing token/component system rather than adding one, and
prefer an honest empty/stale state over silence. Two things worth the
owner's attention before scoping new work:

- **Ikhtisar's `buildSourceEntries()`/`SourceMetadata` list**
  (`src/lib/overview-data.ts`) is computed every build but never rendered
  by `OverviewDashboard` — it predates Stage 4 and was out of this stage's
  named scope (stage-4.md lists six specific pages + /operasional), but it
  is now a second, unused freshness-adjacent computation sitting next to
  the real one. Worth a decision: wire it to a badge on `/` (cheap, same
  `SourceFreshnessBadge`) or delete it as dead code.
- **PNG chart export** (`src/lib/chart-export.ts`) is still parked from
  Stage 3, pending the owner's local two-browser verification.

## Proposed next session (not a Stage 5)

The roadmap's original five-stage arc is complete. Rather than inventing a
sixth stage unprompted, the natural next session is a **retrospective +
re-scoping session**: confirm Stage 4 in production (real light/dark
screenshots, the two parked Stage-3/4 loose ends above), then decide with
the owner whether the next body of work is a fresh roadmap (e.g. deepening
`programme-tracker`'s P-stages, which this roadmap's stages 0-1 unblocked)
or targeted `add-visualization` requests against the now-stable base.
