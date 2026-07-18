# Failure-mode catalog — symptom → diagnosis → fix

Ordered by how often you will meet them. Every entry was observed in this
repo, not hypothesized.

## 1. JSON-parse error strings inside data files

**Symptom:** `data/asean/nso/_summary.json` (or similar) contains per-country
errors like `"Unexpected non-whitespace character after JSON at position 4"`,
`"\"<!DOCTYPE \" is not valid JSON"`, `"fetch failed"`, `"This operation was
aborted"`.
**Diagnosis:** `scripts/config.ts:fetchWithRetry` **returns the final non-OK
Response instead of throwing** after its last retry. Callers that
immediately `res.json()` parse an HTML error page. The file is not corrupt —
the upstream site returned an error page or timed out.
**Fix:** for the data: nothing (next successful run overwrites; to force a
refresh sooner, `workflow_dispatch` the owning workflow — see
recovery-playbooks §7; scrape-monthly runs on dispatch regardless of its
date guard). For code you touch: always check `res.ok` (or the API's
`status` field) before `.json()`. Do NOT "fix" fetchWithRetry itself to
throw without auditing all callers — several rely on inspecting the
returned Response.

## 2. news-aggregator `partial` — "N source request(s) failed"

**Symptom:** ops entry `status: "partial"`, `errors: ["19 source request(s)
failed"]`, items still fetched.
**Diagnosis:** N counts failing outlet URLs out of 30 configured
(`NEWS_OUTLETS`). Regional outlets flap constantly; N of ~5–15 with normal
`items_fetched` is steady-state. Alarm when N spikes or `items_fetched`
collapses.
**Fix:** identify failing outlets from the Actions step log (each URL is
logged). Persistent 404/moved feed → update the outlet's URL/selectors in
`scripts/config.ts:NEWS_OUTLETS`. Dead outlet → remove it and note it in
`SCRAPING_ARCHITECTURE.md`. Transient CDN trouble → nothing; backfill thin
days with `recover-news-range.ts` (playbooks §1).

## 3. Summarizer failures / quota exhaustion

**Symptom:** ops `gemini-summarize` partial with "N batch(es) failed", or
summaries with `_ai_provider: "fallback"` and `dampak_tenaga_kerja:
"Analisis AI tidak tersedia; …"`.
**Diagnosis:** the LIVE summarizer is `scripts/summarizer/gemini-summarize.ts`
(`runGeminiSummarize`) — `scripts/scrapers/gemini-summarize.ts` is dead
legacy code (different model, mutates news files; never run it). Failover
chain per batch: Gemini `gemini-2.0-flash` (one provider per unique key from
`GEMINI_API_KEY` + comma-separated `GEMINI_API_KEYS`) → Cohere
`command-a-03-2025` (`COHERE_API_KEY`) → Groq `llama-3.3-70b-versatile`
(`GROQ_API_KEY`) → per-article fallback stubs. Check
`data/summaries/<date>.json` → `providerChain` and per-batch `provider` to
see who actually served (2026-07-02 was served by cohere = Gemini quota was
exhausted that day; normal).
**Fix:** all providers exhausted → wait (daily workflow marks the step
`continue-on-error`, so news still commits) or add capacity via
**`GEMINI_API_KEYS`** (comma list). **`GEMINI_API_KEY_BACKUP` is dead
plumbing** — set in 3 workflows, read nowhere; extending it does nothing.
Whole-batch parse failures with providers healthy → an article's text broke
the prompt's JSON output; find it in the batch, harden `parseAiResponse`
only with evidence.
**Non-failure summarizer changes** (prompt wording, provider order, models,
batch size) also belong here: edit `scripts/summarizer/gemini-summarize.ts`
only, keep the `runGeminiSummarize` entry contract and the output schema
(`data-validation/references/schemas.md`), keep `GEMINI.batchSize`/`delayMs`
caps (free-tier protection), and verify with a local run against one day's
news file before committing.

## 4. Google Trends rate limits (429)

**Symptom:** trends files missing/empty series for a week; python step
logging 429s.
**Diagnosis:** two scrapers, different behavior. Node
(`google-trends-node.ts`): per-keyword failures are swallowed — empty
series, ops still `success` (silent-success trap). Python
(`google-trends-py.py`, via `runPythonTrends`) has 3 retries with
exponential backoff, hard 120 s timeout in run-all, and its ops metrics are
hardcoded `{total: 1, newItems: 1}` regardless of reality.
**Fix:** usually wait — next weekly run overwrites (files are full
overwrites per ISO week). Do not shorten the 5 s inter-keyword delay
(`RATE_LIMIT.googleTrendsDelayMs`); Google punishes faster loops with longer
blocks. Persistent blocks: reduce keyword count before adding retries.

## 5. Cheerio HTML drift (silent decay)

**Symptom:** an HTML-scraped source (6 HTML news outlets, bi-pmi, BPS HTML
fallback, asean-nso HTML countries) yields 0 items with ops `success`, for
weeks.
**Diagnosis:** target markup changed; selectors match nothing. The
news-aggregator has a broad `$('a')` fallback scan; bi-pmi and asean-nso
simply produce empty results (bi-pmi swallows even total failure).
**Fix:** fetch the live page, compare against the selector config
(`NEWS_OUTLETS[].selectors` / the scraper's inline selectors), update
selectors, re-run locally, verify item counts. Then check whether the gap
needs a backfill (news → playbooks §1). Consider returning an `error`
string when a source yields zero items so ops shows `partial` next time.

## 6. BPS API failures / quota

**Symptom:** bps-html falls back to HTML scraping; bps-national writes
`source: "static_seed"` (UI shows the amber fallback banner);
bps-sdg-sakernas throws.
**Diagnosis order:** (1) `BPS_API_KEY` secret present? (BRS workflow fails
early by design if not); (2) HTTP 429 / `status: 'Error'` body = quota —
**stop, do not retry-loop; never widen page caps as a "fix"** (see
`bps-webapi` budget discipline); (3) `datacontent` key-construction drift —
BPS occasionally restructures tables; probe the endpoint manually and
compare key layouts.
**Fix:** key/quota issues resolve themselves next scheduled run; key-layout
changes need a code fix in the specific scraper (see
`bps-webapi/references/endpoints.md` anatomy section).

## 7. Workflow timeout kills

**Symptom:** Actions run cancelled at exactly the job/step timeout; partial
commits (e.g. news committed, summaries missing).
**Diagnosis:** timeouts are deliberate budget caps (daily 30/12/8, weekly
45, monthly 60, BRS 20 min). A kill means an upstream site hung or volume
grew, not that the cap is wrong.
**Fix:** find the slow phase in the step log. Slow outlet → fix/remove the
outlet. Genuine sustained volume growth → raise the cap ONLY with the
minutes math stated (`deploy-infra` budget section). Missing summaries →
dispatch the daily workflow or run the summarizer locally for the day.

## 8. Silent-success traps (memorize this list)

Ops `success` does NOT prove data flowed for: **bi-pmi** (dual-page failure
swallowed → `[]`), **asean-nso** (per-country errors embedded in files,
never thrown), **google-trends-node** (per-keyword catch → empty series),
**setkab** (returns zeros on total failure — also dormant: in no workflow),
**google-trends-py** (hardcoded ops metrics). For these, freshness/record
counts (`getDataInventory()` on /operasional, or `jq length`) are the truth,
not the status color.

`google-trends-node` UI mitigation: `/tren`'s `getTrendArtifact()` now
resolves each keyword independently across the 8 newest weekly artifacts
(newest-with-data wins) instead of trusting the single newest file, and
`TrenClient` discloses per-keyword fallback plus any still-empty keyword in
the UI. This is a UI-level mitigation only — the scraper's per-keyword
silent catch is unchanged and a real fix there is still desirable.

**EXPECTED_PARTIAL policy (post-audit B3+D3, the single place this is
documented — cross-reference, don't duplicate):** two of the sources
above, **`asean-nso`** and **`google-trends-py`**, can also legitimately
report `status: "partial"` on their *wrapped run* (not just misleading
`success`) in ordinary steady state — NSO sites flap independently
per-country, and google-trends-py's hardcoded ops metrics make its status
unreliable in either direction. Because a `partial` on these two carries no
actionable signal (asean-nso in particular has no UI consumer at all — see
the data catalog), `src/lib/constants.ts` exports an `EXPECTED_PARTIAL` set
containing exactly these two ids; `evaluateFreshness()` returns `"ok"`
instead of `"warning"` for `lastStatus === "partial"` on sources in that
set only. Staleness and `error`/`failed` handling are unaffected — this
only silences the "last run was partial" branch. If you add a source here,
confirm with real `data/ops/*.json` history (or the scraper's own
try/catch shape) that partial is truly steady-state noise, not a genuine
new failure mode; do not add a source just because it is inconvenient.

## 9. Scheduling gaps (nothing ran at all)

**Symptom:** `data/_metadata.json` `lastFetch` days old for a scraper; no
Actions run in the list.
**Diagnosis:** GitHub disables cron on 60 days of repo inactivity;
monthly's bash guard skips all runs except month-end; scholar has no
timeout and can hang. Also remember `setkab`/`bps-sdg-sakernas` are in NO
workflow by design.
**Fix:** re-enable/dispatch the workflow. For a missed window, use
`workflow_dispatch` (keeps ops + commit scoping identical), not local runs
pushed by hand.
