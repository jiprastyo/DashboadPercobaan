# Quality gates — the pre-commit ritual for data/ changes

Run top to bottom. Each gate is cheap; skipping one is how bad statistics
reach production (the next deploy after a data commit IS production).

## 1. Scope check

```bash
git status --short data/
git diff --stat data/
```

Only files your task explains should appear. A data commit never mixes code
changes; a code commit never smuggles data changes (workflow bots rely on
scoped `git add` patterns — follow them: `git add data/news/ data/ops/
data/_metadata.json` style).

## 2. Structural validity

```bash
# every changed file parses
git diff --name-only data/ | xargs -I{} node -e "JSON.parse(require('fs').readFileSync('{}','utf8')); console.log('OK {}')"
```

Filenames zero-padded (`2026-07-03.json`, `2026-W27.json`, `2026-07.json`) —
consumers pick files by lexical sort; a single unpadded name silently
becomes "latest" or never-latest.

## 3. Record-count delta

```bash
jq length data/news/historical-seed.json
git show HEAD:data/news/historical-seed.json | jq length
```

The delta must match your intent (recovery manifest `accepted_items`,
scraper `items_new`, dedupe report `removed`). Unexplained growth =
duplicates; unexplained shrinkage = data loss. Stop and explain before
committing. For object-shaped files check the inner array
(`jq '.data | length'`, `jq '.included_indicators | length'`).

## 4. Diff-shape review

```bash
git diff data/ | head -200
```

Red flags, each an abort-and-investigate:

- **Every timestamp/date shifted by a constant hours offset** → a script ran
  with wrong timezone assumptions.
- **Reordered-but-identical records dominating the diff** → a script changed
  sort order; consumers sort themselves, so don't churn the files.
- **Float precision explosions** (`4.82` → `4.820000000000001`) → a
  read-modify-write cycle is degrading values.
- **`source`/`data_tier` flags changing** (`static_seed` → `official_api`)
  without a real scrape behind it → provenance fraud.
- **Whole-file rewrite of a hand-seeded BPS file** → only surgical,
  source-cited edits are allowed there.

## 5. Provenance spot-check (3 random new/changed records)

For each: `_source_url` opens and is the claimed publisher (not Google News,
not an aggregator); the date matches the source; the value matches the
source; `_scraped_at` is now-ish. For news: `date_source` is honest
(`original_feed`/`article_metadata` only if that is truly where the date
came from).

## 6. Automated tests

```bash
npm run test:news-quality        # always when news code/data changed
npm run build                    # when any consumed schema changed — the
                                 # build-time reads are the consumer test
```

## 7. Source-hierarchy check (when data crosses tiers)

If the change mixes official and modeled/fallback series anywhere a user
will see them: the modeled series must be labeled, opt-in, and visually
distinct (the Makro ASEAN pattern: BPS default, World Bank overlay toggle
off-by-default, dashed stroke, methodology metadata panel). If your change
would make a fallback indistinguishable from official data, it fails
`project-guardrails` (b) and (g) — redesign.

## 8. Commit

Message follows the conventions: `chore(data): <what> <YYYY-MM-DD>` for
routine data, with the official source URL in the body for any seed edit.
Push to `master` triggers deploys (Vercel + the Pages workflow) — that is
expected; scholar-style `[skip ci]` is only for commits that should NOT
rebuild the site.
