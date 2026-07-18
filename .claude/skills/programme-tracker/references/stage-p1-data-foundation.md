# Stage P1 — Data foundation (Sakernas/Susenas acquisition + registries)

Status: not-started
Prerequisites: none (may run parallel to viz stages; coordinate commits)

Scope note: P1 is the largest stage (probing + scraper + registries). A
sanctioned split point exists: the three registries + target entries may
land in one session, the Susenas scraper in the next — record the split in
this Status line. Do not split finer than that.

## Goal

Everything the tracker will render exists as validated data: the three
hand-curated registries, the Susenas indicator series scraped from the BPS
Web API, and any missing Sakernas series. No UI in this stage.

## Work items

### P1.1 Probe-first indicator discovery (manual, before ANY code)

Per `bps-webapi` discipline. For each need in the draft matrix
(`ministries.md` table → indicator needs column):

1. Search BPS variables: `model/var/domain/0000/page/<p>/key/<k>`,
   filtering candidate subjects (ketenagakerjaan, kemiskinan, pendidikan).
   Also check `docs/bps-webapi-reference.md` and the already-mapped SDG
   vars (some needs are ALREADY acquired: youth/NEET = var 1186, several
   SDG labor codes — reuse `data/bps/sdg-sakernas.json`, do not re-scrape).
2. For each candidate var: probe `model/th` (years) and one `model/data`
   response; eyeball `datacontent` key layout (layouts differ per table).
3. Record findings in a scratch table in the PR/commit body: need →
   varId/turvar → years available → key layout → decision
   (`available`/`partial`/`not-collected`).

Budget: this probing is a one-off manual spend; batch it, don't script an
exhaustive crawl.

### P1.2 `scripts/scrapers/bps-susenas.ts`

Copy `scripts/scrapers/bps-sdg-sakernas.ts` as the template (it already
solves discovery-based year fetching, multi-layout `readDataValue`,
national-row detection, and the `official_bps_webapi_only` output
contract). Differences: indicator map from P1.1's Susenas findings; output
`data/program/indicators-susenas.json` (schema: `data-model.md`); throws
without `BPS_API_KEY` (same policy — this feeds an official-only surface).
Follow `add-data-source` steps 1–4 + 8–9 (registry entry in config.ts,
withOpsLog wrapping). Tier: **weekly** — NOT monthly, because
`scrape-monthly.yml` does not carry the `BPS_API_KEY` secret (only
scrape-weekly and scrape-bps-brs-daily do); a key-requiring scraper in the
monthly tier would error on every scheduled run forever. Weekly is mildly
generous for annual Susenas series but costs one bounded request set. (If
the owner prefers monthly, the fix is adding `BPS_API_KEY:
${{ secrets.BPS_API_KEY }}` to scrape-monthly.yml's run step — a
`deploy-infra` change to state explicitly in the PR.)

### P1.3 Missing Sakernas series

If P1.1 found needed Sakernas vars not yet acquired: extend
`bps-sdg-sakernas.ts`'s indicator map when they fit its shape, else a
sibling `indicators-sakernas.json` via the same template. Prefer extending
— two files with one shape beat three shapes.

### P1.4 The three registries

Author `data/program/ministries.json`, `needs-matrix.json`,
`programmes.json` per `data-model.md`, from the `ministries.md` table.
Every unverified name/URL/programme keeps `verified: false` +
`TODO-VERIFY` sentinels. Verification (opening the official site,
confirming the institution's current name and press channel) may be done
in-session where network access allows — record `_verified_at` per entry.
Add RPJMN/programme target entries to `data/benchmarks/targets.json`
(with `ministry_id`/`programme_id`), null-sentinel rules intact. If viz
stage-1 has not created that file yet, create it now following the stage-1
schema exactly, note that in BOTH stages' Status lines, AND perform
stage-1's coupled edits in the same commit: its data-catalog row and the
"five hand-seeded" → "six hand-curated" phrasing updates in all four copy
sites listed in stage-1's acceptance criteria.

### P1.5 Registration

Ops: scraper appears in `getDataInventory()` + OperasionalClient
`STALE_LIMIT_DAYS` (45d). Docs: schemas into
`data-validation/references/schemas.md`; rows into onboarding
`data-catalog.md` + `architecture-map.md`; README Data Sources section.

## What NOT to do

- No invented variable IDs, values, ministry URLs, or programme names —
  sentinels are the honest state for anything unverified.
- No scraping of ministry statistics portals in this stage (P3 does press
  releases; programme realization figures are a future decision).
- No UI (P2), no loader beyond what validation needs.
- Do not widen any BPS page caps or year windows; Susenas backfill beyond
  the API's easy reach is a staged one-off, not a default.

## Acceptance criteria

- [ ] `npx tsx scripts/scrapers/bps-susenas.ts` runs end-to-end with a key,
      idempotent on second run; degrades loudly (throws) without a key.
- [ ] `indicators-susenas.json` contains ONLY probe-verified series with
      real `_source_url`s; every `available` matrix row's `series_ref`
      resolves to an existing repo file.
- [ ] Registries validate: JSON parses; every entry `verified:true` XOR
      carries TODO sentinels; kemnaker row marked verified (its scraper is
      live today).
- [ ] **Verification evidence:** every entry flipped to `verified: true`
      is listed in the commit body with the URL actually opened and what
      confirmed the institution's current name/press channel. No evidence
      listed = the flip is invalid; sentinels only protect against
      unverified entries, this criterion protects against falsely-verified
      ones.
- [ ] `data-validation` gates run; `npm run lint` + `npm run build` pass.
- [ ] P1.5 registration complete (ops, schemas, catalog, map, README).
- [ ] Status line updated with what P1.1 concluded per need
      (available/partial/not-collected counts).
