# Ministry registry — the labor lens per institution

The owner-approved v1 coverage list. This file is the human-readable source
for `data/program/ministries.json` (schema: `data-model.md`).

**VERIFY-BEFORE-USE WARNING:** Indonesia's 2024 cabinet restructuring
renamed, split, and created several of these institutions. Every name, URL,
and press-release path below is a starting hypothesis marked for
verification against the live official site at implementation time
(`TODO-VERIFY` in the data file until checked). Never commit an unverified
URL as verified — guardrail (g) applies to registry data too.

| ID | Institution | Labor lens (what we track it FOR) | Primary indicator needs (provider) | Release source hypothesis |
|---|---|---|---|---|
| `bappenas` | Kementerian PPN/Bappenas | Owner of RPJMN 2025–2029 targets AND RPJPN 2025–2045 long-horizon milestones (Indonesia Emas 2045); national planning evidence needs | TPT, TPAK, poverty, gini — target-setting baselines (Sakernas + Susenas) | bappenas.go.id press/publication pages — TODO-VERIFY |
| `kemnaker` | Kementerian Ketenagakerjaan | Core: PHK, placement, training (BLK), JKP, wage policy | TPT by province/age, informality, sectoral employment (Sakernas) | ALREADY SCRAPED: `portal.kemnaker.go.id/api/v1/news` (see `scripts/scrapers/kemenaker.ts`) — P3 generalizes this working pattern |
| `kemenkeu` | Kementerian Keuangan | APBN budget lines + realization for labor programmes (Prakerja, JKP subsidy, padat karya); APBN macro assumptions incl. unemployment | TPT (assumption tracking, Sakernas); poverty (spending targeting, Susenas) | kemenkeu.go.id publications/siaran pers; APBN documents — TODO-VERIFY |
| `pertanian` | Kementerian Pertanian | Agricultural employment (KBLI a), farmer welfare programmes; NTP linkage | Sectoral employment-pertanian (Sakernas), rural poverty (Susenas), NTP (already scraped, BRS) | pertanian.go.id — TODO-VERIFY |
| `pendidikan` | Kementerian yang membidangi pendidikan (post-2024 split: dasar-menengah vs pendidikan tinggi — REGISTER AS TWO ENTRIES IF CONFIRMED) | School-to-work transition, vocational (SMK) outcomes, graduate unemployment | Youth TPT, NEET-adjacent series, education attainment of workforce (Sakernas); school participation (Susenas) | TODO-VERIFY both successor ministries' sites |
| `kemenpora` | Kementerian Pemuda dan Olahraga | Youth employment & entrepreneurship programmes | Youth (15–24) TPT, NEET (Sakernas; SDG 861 var 1186 already acquired — see `bps-webapi`) | kemenpora.go.id — TODO-VERIFY |
| `kemenperin` | Kementerian Perindustrian | Manufacturing employment (KBLI c), industrial estates' labor absorption | Sectoral employment-industri (Sakernas), PMI context (BI, already tracked) | kemenperin.go.id — TODO-VERIFY |
| `pariwisata` | Kementerian Pariwisata (post-2024: separate from Ekraf) | Tourism employment (KBLI i), wisman linkage to jobs | Sectoral employment-akomodasi/pariwisata (Sakernas), wisman (already tracked, BRS) | TODO-VERIFY current ministry site |
| `ekraf` | Kementerian/Badan Ekonomi Kreatif (post-2024 form TODO-VERIFY) | Creative-economy workers, gig/freelance labor | Sectoral employment (Sakernas — in this repo's 18-code KBLI list the natural codes are `j` Penerbitan & Penyiaran and `r` Kesenian/hiburan, plus parts of `c`; mapping needs care), informality | TODO-VERIFY |
| `den` | Dewan Ekonomi Nasional (new 2024 advisory council) | National economic-policy targets that bind labor outcomes | Consumers of the same headline set (TPT, poverty, growth) — likely a TARGETS source more than a data-needs source | den.go.id existence and publication channel TODO-VERIFY |

## Registry maintenance rules

1. One row here = one object in `data/program/ministries.json`. Keep them in
   sync; this file explains, the JSON drives the UI.
2. A ministry enters the availability matrix only with at least one
   Sakernas/Susenas-mappable indicator need. "Interesting institution" is
   not a criterion; evidence need is.
3. When the pendidikan split is confirmed, register two entries with
   distinct needs (dasar-menengah → SMK/school-to-work; dikti → graduate
   unemployment) rather than one blurred entry.
4. Kemnaker is the reference row: its scraper works today; P3's
   generalization must not break it.
5. Programmes (Prakerja, JKP, padat karya, ministry priority programmes)
   live in `data/program/programmes.json`, each linked to an owning
   ministry id and to target entries in `data/benchmarks/targets.json` —
   see `data-model.md`. Programme existence/names are also TODO-VERIFY at
   implementation (programmes get renamed across budget years).
