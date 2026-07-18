# Skill library — Dashboard Berita Ketenagakerjaan

This directory is the departing architect's judgment, written down. It
exists so that junior/mid-level engineers and smaller AI models can debug,
extend, validate, and advance this repo at the original standard. Claude
Code discovers these skills automatically; humans should read them the same
way.

**Start here, always:** `dashboard-onboarding/SKILL.md` → then
`project-guardrails/SKILL.md`. Everything else is task-routed:

| Skill | Use when |
|---|---|
| `dashboard-onboarding` | Session start; tracing how anything flows; glossary; data catalog. |
| `project-guardrails` | Before designing/accepting ANY feature, source, or dependency. |
| `pipeline-debugging` | Scraper red/stale, missing data, failed workflow, recovery. |
| `bps-webapi` | Anything touching `webapi.bps.go.id` or `scripts/scrapers/bps-*.ts`. |
| `add-data-source` | New statistic/feed/API to track, end to end. |
| `data-validation` | Before every commit that touches `data/`. |
| `add-visualization` | Any chart/page/card/filter work. |
| `design-taste` | Before styling any UI; anti-AI-vibe gate + house design language. |
| `deploy-infra` | Workflows, secrets, Vercel/Pages, Actions budget, build failures. |
| `viz-revamp-roadmap` | Feature work / "improve the dashboard" — execute stages in order. |
| `programme-tracker` | RPJMN, national programmes, kementerian data-needs tracking (Sakernas + Susenas) — stages P1–P3. |

Layout per skill: `SKILL.md` (the contract: rules, worked example,
Definition of done) + `references/` (deep material, loaded on demand).

Maintenance rules for this library itself:

1. **Skills track the code.** If a change makes any skill statement false,
   updating the skill is part of the change, same commit.
2. The shared glossary lives ONLY in
   `dashboard-onboarding/references/glossary.md`; link to it, never fork it.
3. Every skill keeps a `## Definition of done` — if you weaken one, you are
   lowering the project's standard; expect the reviewer (human or model) to
   push back.
4. Roadmap progress is recorded in the `Status:` line of each
   `viz-revamp-roadmap/references/stage-N.md`.
