---
name: data-validation
description: >-
  Pre-commit QA gates for anything that creates, edits, migrates, or commits
  files under data/ in the DashboadPercobaan repo. Use this before EVERY
  commit that touches data/ — scraper output changes, schema migrations,
  archive cleanups, seed edits, backfills, or "quick" manual fixes to a JSON
  file. Also use it when reviewing whether existing data looks corrupt,
  duplicated, or fabricated. The data IS the product here; a bad commit ships
  bad statistics to the live site on the next deploy, and git history is the
  only undo.
---

# Data validation

This repo's database is committed JSON. There is no staging environment: a
merged data commit is production on the next build. These gates exist because
every one of them was violated once and cost sessions to repair — the
`synthetic-dates.ts` saga (random dates on bulk imports) and the
`inject-*-news.ts` fake articles are still being purged by the quality
pipeline years of sessions later.

Schemas per file family: `references/schemas.md`.
The commit ritual and diff checks: `references/quality-gates.md`.
Field-convention definitions: `../dashboard-onboarding/references/glossary.md`.

## The invariants (every record, every family)

1. **Provenance:** every record carries `_source_url` (a real, verifiable
   URL) and `_scraped_at` (ISO timestamp). A record you cannot source does
   not get committed — delete it or find the source.
2. **Real dates:** dates are real publication/observation dates, ISO-format,
   zero-padded. The news pipeline's vocabulary is exactly
   `date_source: 'original_feed' | 'article_metadata' | 'fallback_estimate'`;
   only the first two are "verified" (`VERIFIED_DATE_SOURCES` in
   `scripts/merge-daily-news-archive.ts`, `isVerifiedNewsDate` in
   `src/lib/news-archive.ts`). Never set a date you did not observe; if a
   date is estimated, it must say `is_estimated: true` +
   `date_source: 'fallback_estimate'` so the UI badges it amber.
3. **Dedupe keys:** news by normalized URL (fallback normalized title), BRS
   by PDF URL / release link, research by DOI (fallback normalized
   title+year), PMI by `period|pmi_value`. Adding records means checking the
   key first — re-runs and recoveries must be idempotent.
4. **No fabricated values** (`project-guardrails` g). The five hand-seeded
   BPS files (`data/bps/national-historical.json`, `national-tpt-sakernas.json`,
   `provinsi/tpt-historical.json`, `historical-ihk-trade.json`, `wisman.json`)
   are **edit-only-with-official-source**: any change cites a BPS publication
   URL in the commit message. A **sixth** hand-curated no-scraper file,
   `data/benchmarks/targets.json` (Stage 1 benchmark layer), follows the same
   rule: every target cites its official publication URL and the loader skips
   any null-valued/TODO-placeholder entry. Sakernas facts are intentional, not gaps:
   **1995 has no observation** (survey not conducted — never interpolate),
   1986–2004 are annual, later years are Feb/Aug-specific
   (`observation_date` matters), provinces start at their first official
   observation.
5. **Source hierarchy stays visible:** BPS > other official national > World
   Bank/ILO modeled. Modeled/fallback data is always labeled — file-level
   `source` flags (`official_api` vs `static_seed`/`historical_seed`/
   `fallback_spreadsheet`) and `data_tier` values drive UI banners and
   badges. Relabeling a fallback as official is data fraud, not cleanup.
   The Makro ASEAN page (BPS default + opt-in dashed World Bank overlay +
   methodology panel) is the reference implementation when tiers must
   coexist.

## The automated gate

```bash
npm run test:news-quality
```

Runs `scripts/tests/news-quality.test.ts` (Node `assert/strict`) against
`src/lib/news-quality.ts`: Google News hosts are never "real publisher
URLs"; URL-embedded dates (`/2026/06/25/`, compact `20260624...`, 2-digit-year
compact forms) must match claimed dates; the archive min-date floor
(`NEWS_ARCHIVE_MIN_DATE = 2026-01-01`) and max future skew (36 h) hold;
title normalization strips trailing "- Source". It is NOT wired into any
workflow — run it manually whenever you touch news code or news data. If you
change quality logic, extend this test in the same commit.

## Manual gates before any data commit

Run the ritual in `references/quality-gates.md`. The headline checks:

- `git diff --stat data/` — only expected files changed, plausible sizes.
  A mass deletion or a 10× size jump is a stop-and-investigate, not a commit.
- Record-count delta matches intent (`jq length` before/after).
- No timezone shifts: a diff that rewrites every `_scraped_at`/date by hours
  means a script ran with wrong TZ assumptions — abort.
- Spot-check 3 random new records: `_source_url` opens, date matches the
  source, values match the source.
- JSON validity + zero-padded filenames (consumers sort lexically).

## Archive maintenance tools (know what mutates what)

- `scripts/merge-daily-news-archive.ts` — curates + merges dailies into
  `historical-seed.json`; also **rewrites daily files in place**, dropping
  rows that fail curation.
- `scripts/dedupe-news-archive.ts` — union-find dedupe (exact id, canonical
  URL, fuzzy same-day titles at Jaccard ≥ 0.92); **dry-run by default,
  writes only with `--write`**. Always run dry first and read the report.
- `scripts/reclean-news-dates.ts` — repairs estimated dates on Google-News
  rows; checkpoint via `CHECKPOINT_EVERY`.
- `scripts/clean-db.ts` — re-tags keywords/sectors, strips title suffixes.
- Run order for a full cleanup: merge → reclean → dedupe(dry) → dedupe
  `--write` → `npm run test:news-quality`.

Never edit `historical-seed.json` by hand for anything beyond a single
surgical record fix — the tools above exist so edits are reproducible.

## Worked example: reviewing a backfill commit

A session backfilled June news and asks you to validate before push.

1. `git diff --stat data/` → `data/news/2026-06-2{4,5,6}.json` +
   `historical-seed.json` changed. OK: matches the stated range.
2. `jq length data/news/historical-seed.json` grew +38 vs `git show
   HEAD:...` — matches the recovery manifest's `accepted_items` (38)?
   Manifest says 20 → **stop**: 18 rows appeared outside the recovery path.
   Investigate before committing (in this case: dedupe had not run and the
   merge re-admitted rows it should have merged — run dedupe dry-run, then
   `--write`).
3. Spot-check: 3 new rows have `date_source: 'original_feed'`, URLs open,
   URL-embedded dates match. `npm run test:news-quality` passes.
4. Commit as `chore(data): backfill news 2026-06-24..26` — scoped `git add
   data/news/`, no code files mixed into a data commit.

## Definition of done

- `npm run test:news-quality` passes (always run it; it is cheap).
- The quality-gates ritual ran, and you can state: which files changed, the
  record-count delta and why, and the provenance of any new/changed value.
- Any seed-file edit cites an official source URL in the commit message.
- Any schema change: `npm run build` passes (build-time reads are the
  consumer test) and the coupling table in `references/schemas.md` was
  checked for every consumer of the changed fields — then update that file
  and the onboarding data-catalog in the same commit.
- Data commits are scoped (`git add data/<family>`) with the existing
  message conventions (`chore(data): <what> <date>`). Never force-push.
