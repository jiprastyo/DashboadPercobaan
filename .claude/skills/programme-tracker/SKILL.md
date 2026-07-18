---
name: programme-tracker
description: >-
  Specs for the RPJMN / national-programme / ministry (kementerian) tracking
  area of the DashboadPercobaan dashboard, fed by Sakernas and Susenas via
  the BPS Web API. Use this whenever the task mentions RPJMN, national
  programmes (Kartu Prakerja, JKP, padat karya, program prioritas), ministry
  dashboards or data needs, kementerian tracking, Susenas indicators,
  programme targets, Bappenas, or "kebutuhan data kementerian" — even if
  phrased as "add a page for X ministry" or "track programme Y". This skill
  owns the data model and the P1–P3 stage specs; do not improvise this
  feature area outside them.
---

# Programme & ministry tracker

What this area adds to the dashboard, in one sentence: **who needs which
labor-market evidence (ministries), whether official statistics can supply
it (Sakernas/Susenas availability), and how the programmes and RPJMN targets
that depend on it are actually performing.**

Three connected functions (all three are in scope, per the owner):

1. **Indicator availability matrix** — ministries × the indicators they
   need × whether Sakernas/Susenas (through the BPS Web API) provides them:
   `available` / `partial` / `not-collected`.
2. **Programme performance vs targets** — national programmes tracked
   against RPJMN/ministry targets using the acquired indicator series.
3. **Ministry release monitoring** — autonomous scraping of kementerian
   press releases, generalizing the existing Kemenaker pattern.

## The mission lens (read before scoping anything)

The ministry list spans far beyond Kemnaker (see `references/ministries.md`:
Bappenas, Kemnaker, Kemenkeu, Pertanian, Pendidikan, Pemuda & Olahraga,
Perindustrian, Pariwisata, Ekonomi Kreatif, Dewan Ekonomi Nasional). This passes
`project-guardrails`' mission test **only through the employment lens**:
each ministry is tracked for its labor-market dimension — sectoral
employment (KBLI), youth employment/NEET, agricultural labor, manufacturing
jobs, tourism employment, creative-economy workers — never for its general
portfolio. "Track Kementerian Pariwisata" means tourism *employment and
labor programmes*, not hotel occupancy. When a requested indicator has no
employment/welfare dimension, reject it citing guardrail (a).

## Data providers (the foundation, and the order of trust)

- **Sakernas** (labor force survey, Feb/Aug) — employment by KBLI sector,
  TPT/TPAK by province and age, informality, NEET-adjacent series. Already
  partly acquired (vars in `bps-webapi`); P1 extends it.
- **Susenas** (socio-economic survey) — poverty, gini, education
  participation, welfare correlates of programmes. **New acquisition** — P1
  adds it via the same BPS Web API discovery procedure (`bps-webapi`
  discipline applies; variable IDs are DISCOVERED by probing `model/var` /
  `model/th`, never guessed).
- Ministry-published numbers (programme realization figures) are
  second-tier official sources: usable, labeled with their ministry origin,
  never silently blended into BPS series (guardrail b).
- RPJMN, RPJPN 2025–2045, and programme targets are hand-curated benchmark
  entries — they extend `data/benchmarks/targets.json` from
  `viz-revamp-roadmap` stage-1, same no-fabrication sentinel rules. RPJPN
  milestones are long-horizon (2045): always labeled with their horizon so
  they never read as near-term targets.

## Stage specs (ordered; one stage ≈ one session)

| Stage | File | Goal | Prerequisites |
|---|---|---|---|
| P1 | `references/stage-p1-data-foundation.md` | Sakernas/Susenas indicator acquisition + registries (ministries, programmes, needs matrix) as data files | none (can run parallel to viz stages) |
| P2 | `references/stage-p2-tracker-page.md` | The `/program` page: availability matrix + programme-vs-target cards | P1 done + viz stage-0 AND stage-1 done (needs registries, honest surfaces, targets.json) |
| P3 | `references/stage-p3-ministry-monitoring.md` | Registry-driven ministry press-release scraper + release feed | P1 (registry exists); independent of P2 |

Shared data model (schemas for all new files): `references/data-model.md`.
Ministry registry with the labor lens per ministry:
`references/ministries.md`.

Same execution rules as `viz-revamp-roadmap`: each stage file carries a
`Status:` line; never start a stage whose prerequisites are unmerged; update
the Status line + README + onboarding data-catalog on completion. Where the
two roadmaps compete for a session, viz stages 0–1 outrank P-stages
(everything here renders on top of them).

## Standing constraints

- **BPS quota discipline** (`bps-webapi`): Susenas acquisition follows the
  same probe-first, capped, incremental pattern; new vars are one request
  per year each, discovered manually before any code is written.
- **No fabrication** (guardrail g): registry entries (ministry names, URLs,
  programme names) marked `TODO-VERIFY` until checked against the live
  official site at implementation time — post-2024 ministry restructuring
  renamed several (see ministries.md warnings). Target values follow the
  stage-1 null-sentinel rule.
- **Static export invariant** (`add-visualization`): all new data loads at
  build time via `data-loader-server.ts`; the matrix and cards are
  prerendered; no runtime fetches.
- **Autonomy** (guardrail e): registries and targets are hand-curated
  (documented update procedure); indicator series and press releases
  refresh on cron.
- **Simplicity budget** (guardrail d): the tracker is ONE page (`/program`)
  with two views, not a page per ministry. If a ministry needs its own
  page, that is a future owner decision, not a session's.

## Definition of done (any P-stage session)

- The stage file's acceptance criteria all pass; `Status:` updated.
- New data files validated per `data-validation` (provenance fields,
  schemas registered in its `references/schemas.md`).
- New scrapers/loaders pass `add-data-source`'s Definition of done; new UI
  passes `add-visualization`'s.
- Onboarding data-catalog + architecture-map rows added for every new
  file/scraper/route, same commit.
