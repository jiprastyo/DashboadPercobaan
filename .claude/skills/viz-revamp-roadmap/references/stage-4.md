# Stage 4 — Data-health surface (source health as product)

Status: not-started (requires stage-3 done)

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

- [ ] One shared freshness helper + one shared staleness table; the
      OperasionalClient duplicate table is deleted.
- [ ] Every listed page shows its source badge inside existing attribution
      UI; no layout shift (before/after screenshot check).
- [ ] SourceStatusCard grid live on /operasional; duplicate local types
      removed.
- [ ] Simulated staleness (temporarily edit `_metadata.json` locally)
      flips badges through ok→warning→error correctly. Restore with
      `git checkout -- data/_metadata.json` and confirm `git status data/`
      is clean BEFORE committing anything — a committed test-mutation of
      metadata deploys to production.
- [ ] UI copy states "per build terakhir" semantics; Indonesian labels;
      light+dark pass.
- [ ] `add-visualization` DoD passes; Status line + README updated. The
      roadmap is complete — propose a retrospective + next-roadmap session
      to the owner rather than inventing Stage 5.
