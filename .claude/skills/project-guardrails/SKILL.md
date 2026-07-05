---
name: project-guardrails
description: >-
  The owner's non-negotiable decision rules for the DashboadPercobaan
  dashboard, written as tests you can apply. Use this BEFORE designing or
  implementing any feature, data source, dependency, or refactor — even if
  the request sounds obviously fine, and especially when a request is
  exciting, clever, or "just a small addition". Also use it when choosing
  between data sources, when someone proposes mixing estimated and official
  series, when adding benchmarks/targets to charts, or when a change might
  cost money or require a server. If a session skips this skill, it will
  eventually ship scope creep or fabricated data.
---

# Project guardrails

These are the departing architect's standards, written down so cheaper
sessions apply the same judgment. Each guardrail is a test with a pass/fail
answer. When a request fails a test, do not silently comply — explain which
guardrail it fails and propose the nearest compliant alternative.

## a) Mission test

**Does this change help someone monitor the Indonesian labor market?**

The product is a monitoring instrument, not a portal. Charts, sources,
filters, and pages exist to answer questions like "is unemployment rising?",
"which sectors are shedding jobs?", "how does Indonesia compare to ASEAN?",
"what did BPS just release?".

- Pass: PHK tracker, provincial TPT comparison, BRS feed, benchmark bands.
- Fail: general economic news portal, crypto prices, election coverage,
  a blog, generic "AI chat with the data".
- **The ministry lens:** the `programme-tracker` area covers many
  kementerian (Bappenas, Kemenkeu, Pertanian, Pariwisata…), each ONLY
  through its labor-market dimension — sectoral employment, youth/NEET,
  labor programme budgets and targets. A ministry's non-labor portfolio
  (harvest volumes, tourist arrivals as such, tax revenue) fails the test
  even though the ministry itself is registered.
- **Sole exception:** infrastructure/ops hardening (better logging, recovery
  tooling, build reliability) passes automatically — it protects the mission.

## b) Source hierarchy

**BPS Web API > other official national sources (Kemenaker, BI, ASEAN NSOs) >
modeled estimates (World Bank / ILO).**

- Official series and modeled series may appear on the same chart only when
  the modeled series is **labeled and opt-in**. The reference implementation
  is Makro ASEAN: Indonesia defaults to the BPS series; the World Bank
  overlay is a toggle, off by default, drawn dashed, with a methodology
  metadata panel. Copy that pattern; never silently merge tiers.
- The `/sdg` page is stricter: **BPS Web API is the exclusive operational
  source**. Other sources are prose references only.
- A number without `_source_url` is not data — it is a rumor. Every record
  carries `_source_url` and `_scraped_at` (see `data-validation`).

## c) Benchmark policy (the "target" in "keep an eye on its target")

Indicators gain meaning when readable against targets:

- **Global**: SDG 8 targets.
- **Regional**: ASEAN comparators (e.g. ASEAN median, computed from the
  World Bank panel and labeled as computed).
- **National**: government targets — RPJMN five-year plan targets, RPJPN
  2025–2045 long-horizon milestones, APBN assumptions. Label the horizon:
  a 2045 milestone next to a 2029 target must say which plan it comes from.

Rules: benchmarks are a **presentation-layer** concept — reference lines and
bands (Recharts `ReferenceLine`/`ReferenceArea`) sourced from a hand-curated,
documented file (`data/benchmarks/targets.json` once Stage 1 of
`viz-revamp-roadmap` lands). Every benchmark entry cites its official
publication URL. Benchmarks are never scraped guesses and never mixed into
observed series as if they were observations.

## d) Simplicity budget

Visual simplicity is a feature the owner explicitly pays for with restraint:

- **One message per chart.** A chart needing three toggles to be legible is
  two charts or one table.
- Every added visual must **earn or replace** its space — "more data
  presentation" means more insight per pixel, not more pixels.
- **No new dependencies without written justification** in the PR/commit
  body. Recharts, Tailwind, next-themes, lucide, date-fns cover this app.
  A dependency is a permanent maintenance tax on a solo-maintained repo.
- If a page needs a legend of legends, it is wrong. If a filter needs a
  manual, it is wrong.

## e) Autonomy

**No human in the loop for routine data updates.** Scrapers fetch, commit,
and deploy on cron. Anything that requires a person (a backfill, a seed
update, a recovery) must be a documented, staged one-off — the pattern is
`BPS_BRS_BACKFILL_START_YEAR` staged backfills and the recovery playbooks in
`pipeline-debugging`. A feature that only works if someone remembers to run
a script weekly fails this test; either schedule it or redesign it.

## f) Cost envelope

The entire system must run on: **GitHub Pro** (finite Actions minutes —
scrapers are timeout-bounded, incremental, checkpointed), **Vercel free
tier** (static export only — no serverless functions, no ISR, no middleware),
and **free-tier APIs** (BPS quota discipline per `bps-webapi`; Gemini free
tier with Cohere/Groq failover). Reject designs that exceed this: paid APIs,
databases, queues, long-running workers, per-request rendering. If a design
needs a server, redesign it to need a build instead.

## g) Data integrity (the iron rule)

**No fabricated data. Ever.** Real dates, real values, real sources.

The cautionary tale is in this repo's own history: `inject-morning-news.ts`
and `inject-new-sources.ts` appended hardcoded fake articles, and
`synthetic-dates.ts` assigned random dates to bulk imports — the cleanup
(`is_estimated` flags, `reclean-news-dates.ts`, merge-curation purges) has
consumed multiple sessions and still leaves scars (`date_source:
'fallback_estimate'` rows, seed files with synthetic-precision floats). One
convenient fake value costs ten sessions of trust repair.

Corollaries: never invent values for the hand-seeded BPS files; never
extend a `getSample*()` code path (see `add-visualization`'s sample-data
trap); estimated/fallback data always announces itself in the UI.

## Anti-scope-creep list (seductive, and wrong)

Reject on sight, citing the failed guardrail: user accounts/auth (a, f),
comments or community features (a), realtime websockets/live tickers (f),
paid data APIs (f), a CMS (a, f), general-news expansion beyond labor
keywords (a), server-side search (f — client-side filtering over static JSON
is the pattern), embedding external dashboards (b, d), scraping non-official
"estimates" to fill gaps (b, g), dark-launch config systems and feature
flags (d — this repo ships by commit).

## Definition of done

You applied this skill if your plan names which guardrails were relevant and
how the design passes them — one sentence each is enough. For any rejected
request, you offered the nearest compliant alternative (e.g. "no live PMI
ticker (f), but the monthly BI PMI series can get a real loader — Stage 0 of
`viz-revamp-roadmap`").
