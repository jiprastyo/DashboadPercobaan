@AGENTS.md

# Session bootstrap — read this before anything else

Before touching any file, read `.claude/skills/dashboard-onboarding/SKILL.md`.
It is the map of this system (3-layer architecture, glossary, data catalog,
session protocol). Every other skill assumes you have read it.

## Skill library (`.claude/skills/`)

- `dashboard-onboarding` — read-me-first: system map, shared glossary, data catalog, session protocol.
- `project-guardrails` — the owner's non-negotiables as decision tests; apply before designing anything.
- `pipeline-debugging` — diagnose and fix scraper/workflow failures; recovery playbooks.
- `bps-webapi` — using the BPS Web API within quota; endpoints, variable IDs, checkpoints.
- `add-data-source` — end-to-end checklist for a new source (config → scraper → workflow → UI).
- `data-validation` — pre-commit data QA: schemas, quality gates, dedupe, date sanity.
- `add-visualization` — charts/pages: component inventory, conventions, static-export constraints.
- `design-taste` — anti-AI-vibe design gate; fixed design read + forbidden-pattern list for all UI work.
- `deploy-infra` — Vercel + Pages workflows, Actions budget, secrets inventory, build pipeline.
- `viz-revamp-roadmap` — the staged visualization revamp; one stage ≈ one session, in order. Governs open-ended improvement work; a specific requested chart goes via `add-visualization` unless a stage already specs it.
- `programme-tracker` — RPJMN, national programmes, and kementerian data-needs tracking on Sakernas+Susenas; stages P1–P3, data model included.

## Iron rules (non-negotiable, see project-guardrails for the full tests)

1. **No fabricated data. Ever.** Real dates, real sources, `_source_url` +
   `_scraped_at` on every record. The `inject-morning-news.ts` /
   `synthetic-dates.ts` cleanup saga is the cautionary tale.
2. **Mission test.** Every change must help monitor the Indonesian labor
   market (sole exception: infra/ops hardening). Otherwise reject it.
3. **Verify before commit.** `npm run lint` and `npm run build` must pass;
   apply the Definition of done in whichever skill you used. Never force-push
   or rewrite history.
