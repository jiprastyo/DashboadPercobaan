# Workflow catalog — full details

All scrape workflows share: `permissions: contents: write`,
`actions/checkout@v4`, `actions/setup-node@v4` (node `'20'`, npm cache),
`npm install --no-package-lock`, committer
`github-actions[bot] / github-actions[bot]@users.noreply.github.com`, and
commit-if-changed guards (`git diff --staged --quiet || git commit …`).

Every `cron:` line also carries a one-line cadence-rationale comment (added post-audit B2) stating the underlying source's real publication cadence and why the chosen poll frequency matches or safely over-polls it. Keep this comment current if a workflow is retimed; never edit the cron value itself without restating the rationale.

## deploy.yml — "Deploy" (GitHub Pages, legacy)

- Trigger: push to `master` + `workflow_dispatch`. Permissions: `contents:
  read, pages: write, id-token: write`. Concurrency `'pages'`,
  `cancel-in-progress: false`. Build job timeout 15 min.
- Steps: checkout → Node 20 → `npm install` → `npm run build` with env
  `GEMINI_API_KEY`, `GEMINI_API_KEY_BACKUP` (dead — read nowhere),
  `NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}` → verify
  `out/` → `upload-pages-artifact` → `deploy-pages@v4`.
- This is the ONLY place `NEXT_PUBLIC_BASE_PATH` is set. Vercel builds get
  an empty basePath.

## scrape-daily.yml — "Daily Scrape"

- Cron `24 1 * * *` and `24 13 * * *` (08:24 & 20:24 WIB). Job timeout
  30 min. No concurrency group. Declares a `workflow_dispatch` input
  `force` (default `'false'`) that **no step references** — do not expect it
  to do anything.
- Steps: `npx tsx scripts/run-news-collection.ts` (step timeout 12 min) →
  `npx tsx scripts/merge-daily-news-archive.ts` → commit #1
  `chore(data): daily scrape $(date -u +%Y-%m-%d)` scoped to `data/news/
  data/ops/ data/_metadata.json` → `npx tsx
  scripts/summarizer/gemini-summarize.ts` (step timeout 8 min,
  `continue-on-error: true`, env `GEMINI_API_KEY`, `COHERE_API_KEY`,
  `GROQ_API_KEY`) → commit #2 (`if: always()`) `chore(data): enrich daily
  news <date>` scoped to `data/summaries/ data/ops/ data/_metadata.json`.

## scrape-bps-brs-daily.yml — "Daily BPS BRS Refresh"

- Cron `17 5 * * *` (12:17 WIB — after the BPS morning release window).
  Timeout 20 min. Concurrency `daily-bps-brs-refresh`,
  `cancel-in-progress: false`.
- Guard step **exits 1 if the `BPS_API_KEY` secret is empty** (intentional
  loud failure). Runs `npx tsx scripts/scrapers/bps-html.ts` with
  `BPS_BRS_MAX_PAGES_PER_YEAR: '8'`. Commit `chore(data): refresh BPS BRS
  <date>` scoped to `data/bps/`, with `git pull --rebase` before push (this
  workflow can race the daily scrape's pushes).

## scrape-weekly.yml — "Weekly Scrape"

- Cron `3 22 * * 0` (Mon 05:03 WIB). Timeout 45 min.
- Extra setup: Python 3.11 (`actions/setup-python@v5`, pip cache) +
  `pip install -r requirements.txt` (sole dependency: `pytrends>=4.9.0`).
- Runs `npx tsx scripts/run-all.ts --tier weekly` (bps-html, kemenaker,
  google-trends-node, google-trends-py, bps-national, bps-provinsi) with
  env `GEMINI_API_KEY`, `GEMINI_API_KEY_BACKUP` (dead), `BPS_API_KEY`.
  Commit `chore(data): weekly scrape <date>` adding all of `data/`.

## scrape-monthly.yml — "Monthly Scrape"

- Cron `3 18 28-31 * *` (01:03 WIB next day). Timeout 60 min.
- Bash guard: executes only if `$(date -d tomorrow +%d) = "01"` or the
  event is `workflow_dispatch` — i.e., effectively runs on the last day of
  the month. Runs `run-all.ts --tier monthly` (bi-pmi, asean-nso,
  asean-fallback). Commit `chore(data): monthly scrape <date>`.

## scrape-scholar.yml — "Scrape Academic Research (Scholar)"

- Cron `0 0 */3 * *`. Timeout 20 min (added — this workflow previously had
  no job timeout, the one gap in the otherwise-universal budget rule).
  Runs `scholar.ts` then `openalex-research.ts` (default = current-year
  incremental; `OPENALEX_FROM_YEAR=2019` for a deliberate full backfill).
  Commit `Auto-update academic research data [skip ci]` scoped to
  `data/research/` — the ONLY `[skip ci]` commit; research updates don't
  rebuild the site until the next ordinary commit.

## Operational notes

- **Deploy amplification:** every non-scholar scrape commit triggers
  deploy.yml AND a Vercel build. The `'pages'` concurrency group serializes
  Pages deploys; Vercel queues its own.
- **Race windows:** daily (2×/day) and BRS-daily both push to master ~4 h
  apart; BRS's `git pull --rebase` exists for this. If you add a workflow
  that commits, include the same rebase-before-push.
- **Re-running:** all workflows have `workflow_dispatch`. For a missed
  window, dispatch the workflow rather than hand-running scrapers — that
  keeps ops logging + commit scoping identical to scheduled runs.
- **Where each scraper's failure shows up:** step logs in the Actions run +
  `data/ops/<date>.json` entries committed by the run itself (see
  `pipeline-debugging`).
