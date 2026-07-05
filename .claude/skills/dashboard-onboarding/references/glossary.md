# Glossary — Indonesian statistical terms, institutions, data conventions

This is THE shared glossary for the whole skill library. Other skills link
here instead of redefining terms. Keep terms in Indonesian in code, data, and
UI; define them here in English.

## Core labor-market indicators

| Term | Expansion | Meaning |
|---|---|---|
| **TPT** | Tingkat Pengangguran Terbuka | Open unemployment rate (%). The project's headline indicator. BPS var `543` (by province). |
| **TPAK** | Tingkat Partisipasi Angkatan Kerja | Labor-force participation rate (%). |
| **EPR** | Employment-to-Population Ratio | Derived in this repo as `tpak * (1 - tpt/100)` (see SDG benchmark panel). |
| **Angkatan kerja** | — | Labor force (employed + unemployed actively seeking). |
| **Susenas** | Survei Sosial Ekonomi Nasional | BPS national socio-economic survey: poverty (P0/P1/P2), gini, consumption, education participation. Data provider for the `programme-tracker` area (welfare side), complementing Sakernas (labor side). |
| **NEET** | Not in Employment, Education, or Training | Youth (15–24) outside work, school, and training — SDG 8.6.1; BPS var 1186 in this repo. |
| **RPJMN** | Rencana Pembangunan Jangka Menengah Nasional | Bappenas' five-year national development plan (current: 2025–2029); source of national targets in `data/benchmarks/targets.json`. |
| **RPJP / RPJPN** | Rencana Pembangunan Jangka Panjang (Nasional) | The 20-year long-term national development plan (current: RPJPN 2025–2045, "Indonesia Emas 2045"). Source of long-horizon milestone targets; RPJMN periods operationalize it. Same benchmark rules as RPJMN entries. |
| **Sakernas** | Survei Angkatan Kerja Nasional | BPS national labor-force survey. Conducted **February and August**; releases typically ~3 months later (see `SURVEY_PERIODS` in `src/lib/constants.ts`). Historical facts encoded in the data: annual observations 1986–2004, Feb/Aug points afterward; **1995 has no Sakernas** (intentionally absent — never interpolate it); provinces appear from their first official observation. |
| **PHK** | Pemutusan Hubungan Kerja | Layoffs/termination of employment. Tracked via Kemenaker press releases (`data/kemenaker/phk/`) and news keywords. |
| **Setengah penganggur** | — | Underemployed (working < 35 h/week and willing to work more). |

## Other tracked statistics

| Term | Expansion | Meaning |
|---|---|---|
| **BRS** | Berita Resmi Statistik | BPS official statistical press releases. Scraped via Web API `model/pressrelease`; surfaced at `/brs`. |
| **IHK** | Indeks Harga Konsumen | Consumer price index (CPI). Inflasi MtM/YoY derives from it. BPS vars `1` (monthly inflation), `2245` (IHK, 2022=100). |
| **NTP** | Nilai Tukar Petani | Farmers' terms of trade index (BRS bucket). |
| **PDB** | Produk Domestik Bruto | GDP. BRS bucket slug is **`pertumbuhan-ekonomi`** — all PDB/growth title variants map to this one canonical slug. |
| **Wisman** | Wisatawan Mancanegara | Foreign tourist arrivals. |
| **Kemiskinan** | — | Poverty (headcount, gini ratio) — BRS bucket `kemiskinan`. |
| **Gini ratio** | — | Income-inequality measure (0–1). |
| **PMI** | Purchasing Managers' Index | Manufacturing PMI published by Bank Indonesia ("Prompt Manufacturing Index"); >50 = expansion. |
| **UMP / UMR / UMK** | Upah Minimum Provinsi / Regional / Kabupaten-Kota | Minimum wage at province / (legacy) regional / regency-city level. News keywords, not a scraped statistic. |
| **PKWT / PKWTT** | Perjanjian Kerja Waktu Tertentu / Tidak Tertentu | Fixed-term vs permanent employment contracts. |
| **JKP** | Jaminan Kehilangan Pekerjaan | Job-loss insurance program (BPJS). |
| **TKI / TKA** | Tenaga Kerja Indonesia / Asing | Indonesian migrant workers / foreign workers. |

## KBLI sectors

**KBLI** = Klasifikasi Baku Lapangan Usaha Indonesia (standard industrial
classification). News articles are auto-tagged into 18 sector buckets; the ids
are lowercase letters used in `sector_tags` (definitions:
`src/lib/constants.ts:KBLI_SECTORS`, keyword lists: `SECTOR_KEYWORDS` and
`scripts/config.ts:KBLI_SECTORS`):

`a` Pertanian · `b` Pertambangan · `c` Industri (manufacturing) · `d` Listrik/
Energi · `e` Air & Limbah · `f` Konstruksi · `g` Perdagangan · `h`
Transportasi · `i` Akomodasi/Pariwisata · `j` Penerbitan & Penyiaran · `k`
Telekomunikasi & IT · `l` Keuangan & Asuransi · `m` Real Estat · `no`
Profesional & Jasa Perusahaan (N+O combined) · `p` Administrasi Pemerintahan ·
`q` Pendidikan · `r` Kesehatan & Sosial · `stuv` Jasa Lainnya (S–V combined).

Articles with no sector match get `sector_tags: ['general']` in the archive.

## Institutions

| Abbrev | Full name | Role in this project |
|---|---|---|
| **BPS** | Badan Pusat Statistik | Indonesia's national statistics office. **The authoritative source** (top of the source hierarchy). Web API at `webapi.bps.go.id` (see `bps-webapi` skill). |
| **Kemenaker / Kemnaker** | Kementerian Ketenagakerjaan | Ministry of Manpower. PHK press releases via `portal.kemnaker.go.id/api/v1/news`. |
| **Setkab** | Sekretariat Kabinet | Cabinet Secretariat; RSS feed of government policy news (scraper currently dormant). |
| **BI** | Bank Indonesia | Central bank; publishes PMI. |
| **Bappenas** | — | National development planning ministry; owns **RPJMN** (see above) whose targets feed the benchmark layer. |
| **DEN** | Dewan Ekonomi Nasional | National Economic Council (advisory body, est. 2024) — tracked in `programme-tracker` as a targets source. |
| Tracked kementerian | — | The programme-tracker ministry registry (Bappenas, Kemnaker, Kemenkeu, Pertanian, Pendidikan, Kemenpora, Kemenperin, Pariwisata, Ekraf, DEN) lives in `programme-tracker/references/ministries.md` — each tracked ONLY through its labor-market lens. |
| ASEAN NSOs | — | National statistics offices: **DOSM** (Malaysia), **SingStat** (Singapore), **PSA** (Philippines), **GSO** (Vietnam), **NSO** (Thailand), **CSO** (Myanmar), **NIS** (Cambodia), **LSB** (Laos), **DEPS** (Brunei), **DGS** (Timor-Leste). |
| **ILO / World Bank** | — | Sources of *modeled* estimates (`SL.UEM.TOTL.ZS` etc.) — comparison layer only, never merged silently into official series. |
| **SDG 8** | Sustainable Development Goal 8 | Decent work & economic growth. The `/sdg` page maps requested codes (431, 552, 831, 852/852A, 861, 871/871A, 922) to BPS Web API variables. |

## Data-field conventions (every record, every file)

| Field | Meaning |
|---|---|
| `_source_url` | Verifiable origin URL. **Mandatory on every record.** UI renders it as "Verifikasi sumber data". |
| `_scraped_at` | ISO timestamp of the scrape. Mandatory. |
| `_summarized_at`, `_ai_provider`, `_ai_model` | AI-summary provenance (`data/summaries/`). |
| `is_estimated` | `true` = article date is an estimate, not a verified publication date. Historical artifact of `synthetic-dates.ts`; repaired by `reclean-news-dates.ts`. |
| `date_source` | Exactly one of `original_feed` \| `article_metadata` \| `fallback_estimate`. Only the first two count as verified (`VERIFIED_DATE_SOURCES`). |
| `data_tier` | ASEAN country trust tier: `official_nso` \| `ilo_estimate` \| `worldbank_estimate`. Rendered as badges ("NSO Resmi" / "Estimasi ILO" / "World Bank"). |
| `source` (file-level) | Provenance flag on BPS files: `official_api` (real) vs `static_seed` / `historical_seed` / `fallback_spreadsheet` (fallbacks — UI must announce them via DataNotice/banner). |

## Language rule

UI strings, labels, tooltips, empty states: **Indonesian** (locale `id-ID`).
Code, comments, commit messages, skills: English. Domain terms above stay
Indonesian everywhere.
