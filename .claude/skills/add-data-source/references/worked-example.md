# Worked example — the bi-pmi source, and how to finish it

`bi-pmi` is the best teaching source in the repo: steps 1–4 and 8-partial are
done correctly, and steps 6–8 were skipped — which is exactly why the PMI
panel on `/makro-indonesia` renders **sample data** today. Walk the checklist
against it.

## What exists (pattern to copy)

**Step 1 — registry (`scripts/config.ts`):**

```ts
export const BI_PMI = {
  baseUrl: 'https://www.bi.go.id/id/publikasi/laporan/Pages/Survei-PMI.aspx',
  alternateUrl: 'https://www.bi.go.id/id/statistik/indikator/data-inflasi.aspx',
  dataDir: path.join(DATA_DIR, 'bi', 'pmi'),
};
```

**Step 2 — scraper (`scripts/scrapers/bi-pmi.ts`):** exports
`runBIPMI(): Promise<{ total }>`. Scrapes the primary page's tables plus a
regex sweep (`/(?:pmi|purchasing\s*managers?\s*index)[^0-9]*(\d+[\.,]\d+)/gi`),
then the alternate page. Items:

```json
{ "period": "Mei 2026", "pmi_value": 52.1, "category": "...",
  "description": "...", "_source_url": "https://www.bi.go.id/...", "_scraped_at": "..." }
```

Append-merge into `data/bi/pmi/series.json`, deduped by `period|pmi_value`.

**Step 3 — orchestration:** `run-all.ts` has a `case 'bi-pmi'`, and
`TIERS.monthly` includes it → `scrape-monthly.yml` runs it (cron
`3 18 28-31 * *` with the "tomorrow is the 1st" guard).

**Step 4 — data dir:** `data/bi/pmi/series.json` (currently `[]` — both BI
pages have been failing; note the scraper swallows dual-page failure and
still reports ops `success`, a known silent-success trap listed in
`pipeline-debugging/references/failure-modes.md`).

## What was skipped (the anti-pattern) — and how to close it

**Step 6 — loader.** There is no `getBIPMIData()` in
`src/lib/data-loader-server.ts`. Closing it looks like:

```ts
export interface BIPMISeriesItem {
  period: string;
  pmi_value: number;
  category?: string;
  description?: string;
  _source_url: string;
  _scraped_at: string;
}

export function getBIPMIData(): BIPMISeriesItem[] {
  try {
    const filePath = path.join(DATA_DIR, 'bi', 'pmi', 'series.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load BI PMI data:', error);
    return [];
  }
}
```

**Step 7 — surface.** `src/app/makro-indonesia/page.tsx` currently passes
`pmiData={getSamplePMIData()}` (from the sample-only `data-loader.ts`).
Closing it: pass `getBIPMIData()`, and in `MakroIndonesiaClient` render the
real series when non-empty, else the standard Indonesian empty state
("Data PMI belum tersedia dari Bank Indonesia.") — **never** the sample.
This closure is specced as part of Stage 0 in `viz-revamp-roadmap`; if you
are doing it, do it under that stage's acceptance criteria.

**Step 8 — inventory.** Add a `bi-pmi` entry to `getDataInventory()`
(staleness window ~45 days, matching the OperasionalClient
`STALE_LIMIT_DAYS` table) so /operasional flags the currently-empty file
instead of nobody noticing.

**Step 9 — docs.** README lists BI PMI already; the onboarding
`data-catalog.md` row for `data/bi/pmi` must flip from "no loader wired"
to its new consumer when you close this.

## Transferable lessons

1. A scraper that writes a file nobody loads is invisible work — wire the
   loader in the same session, or file the gap explicitly.
2. Swallowed dual-source failure + ops `success` = a source can die for
   months unnoticed. Prefer returning an `error` string (→ `partial`) when
   ALL sources of a scraper failed.
3. The dedupe key must survive re-scrapes: `period|pmi_value` works because
   a period's value never changes once published — pick keys with that
   property (URL, release id, period).
4. Every step you skip becomes someone else's archaeology.
