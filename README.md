# Dashboard Berita Ketenagakerjaan

This project is a dashboard and data pipeline for monitoring labor and employment issues in Indonesia. It aggregates press releases from official government sources and news articles from major national and provincial media networks.

## Data Architecture

The project relies on a static JSON-based "database" stored in the `data/` directory. This setup is highly portable and allows GitHub Actions to continuously update the data by committing new JSON files.

- `data/bps/`: Contains BPS press releases categorized by economic indicators.
- `data/kemenaker/phk/`: Contains Kemenaker press releases filtered for PHK (Pemutusan Hubungan Kerja).
- `data/news/`: Contains daily aggregations of news articles from RSS and HTML sources.
- `data/setkab/`, `data/bi/`, `data/asean/`: Other data source directories.

The frontend reads from these JSON files to visualize trends, counts, and recent articles.

## Official Data Sources

The scrapers are configured to pull historical data since January 2024 to provide a solid baseline for the dashboard.

1. **BPS (Badan Pusat Statistik)**
   - **URL / API**: Scrapes `https://www.bps.go.id/id/pressrelease` HTML directly, or queries the official BPS Web API (`https://webapi.bps.go.id`) if `BPS_API_KEY` is configured in the environment.
   - **Indicators Tracked**: 
     - IHK (Inflasi)
     - Ekspor-Impor
     - Wisatawan Mancanegara
     - Transportasi
     - Ketenagakerjaan (Pengangguran, Sakernas, TPAK, TPT)
     - Pertumbuhan Ekonomi (PDB)
     - Kemiskinan & Ketimpangan
     - Nilai Tukar Petani (NTP)
   - **History**: Data retrieved retroactively to 2024 via pagination (by page and year parameters in the API, or page parameter in HTML).
   - **Makro Indonesia TPT Series**: The `Analisis Tingkat Pengangguran Terbuka (TPT) Sakernas` chart now uses official BPS-only Sakernas series in `data/bps/national-tpt-sakernas.json` and `data/bps/provinsi/tpt-historical.json`, covering **1986-2026** with exact observation timing. Annual observations are used for `1986-2004`, while Sakernas month-specific points such as **Februari** and **Agustus** are preserved for later years. `1995` is intentionally absent because Sakernas was not conducted that year, and newer provinces appear only from the first official observation available in BPS.


2. **Kemenaker (Kementerian Ketenagakerjaan)**
   - **URL**: `https://kemnaker.go.id/news/categories/siaran-pers`
   - **Focus**: Articles and press releases related to PHK (Pemutusan Hubungan Kerja) and major labor issues.
   - **History**: Data retrieved retroactively to 2024 via pagination (up to 30 pages).

3. **Setkab (Sekretariat Kabinet)**
   - RSS feed for broader government policies impacting labor.

4. **Bank Indonesia (PMI)**
   - Prompt Manufacturing Index and inflation tracking.

5. **ASEAN Labor Data (World Bank / NSO)**
   - **Coverage**: 10 ASEAN Countries (Indonesia, Malaysia, Singapore, Thailand, Philippines, Vietnam, Myanmar, Cambodia, Laos, Brunei).
   - **Sources**: Direct HTML/API scraping of National Statistical Offices (NSO), with a World Bank API fallback for core labor metrics (Unemployment rate, Labor force participation, Employment ratio, Youth unemployment).
   - **History**: Data retrieved retroactively back to 2018.

## Features & Recent Enhancements
- **System-wide Dark Mode**: Fully supported and respects OS/User preference.
- **Enhanced Data Visualization**: Interactive charts for Makro ASEAN and separated historical trends for TPT (Pengangguran) and TPAK (Partisipasi Angkatan Kerja) without date restrictions.
- **Exact Sakernas TPT Timeline**: Makro Indonesia now plots BPS TPT points on their real observation period instead of forcing all values onto generic yearly spacing.
- **Historical Provincial TPT Integration**: Makro Indonesia can now draw selected provincial unemployment lines from the official BPS Sakernas history instead of showing only the national long-run series.
- **Reusable PNG Export for Charts**: `Salin PNG` / `Unduh PNG` in Makro Indonesia and Makro ASEAN now use a shared export helper that captures the rendered chart container itself, so copied/downloaded PNG files match the on-screen chart rather than incidental nested SVG icons.
- **BPS-only TPT Analysis Panel**: Makro Indonesia TPT now keeps only the BPS Sakernas views, adds multi-select observation-point filtering for `Tren Sakernas`, and lets `Perbandingan Wilayah` step through the same historical observation dates back to `1986`.
- **Readable Historical Province Comparison**: The provincial TPT comparison chart now keeps every province label visible on the horizontal axis by using a scrollable wider chart surface and rotated tick labels.
- **Advanced Filtering**: News tracking includes dynamic Month-based filtering and Sektoral (KBLI) tagging.
- **Riset Akademik Interactive Filters**: Added real-time text searching, a dynamic dropdown for publishers, and a row of interactive topic tag pills that toggle active filters.
- **Rebuilt Academic Research Scraper**: The scholar pipeline now performs a clean rebuild of dynamic findings, keeps only destination links from academic or institutional domains, requires a real publication date from landing-page metadata, and tags topics such as Sakernas, NEET, Gig Economy, Green Jobs, and Youth Unemployment.
- **Scrapped Pembuat Laporan**: Retired the Report Builder route (`/laporan`) and navigation menus to clean up the workspace for future implementation.

## Academic Research Findings

The dashboard includes a curated and automated section for **Riset Akademik (Academic Research)** covering the period from 2019-2026. This section aggregates findings related to:
- The Gig & Digital Economy
- Vocational High School (SMK) Unemployment and Skills Mismatch
- Green Jobs and the Labor Market Transition
- Time Use, Working Hours, and the Overwork Paradox
- Sakernas (Survei Angkatan Kerja Nasional) Insights
- Specific findings from Politeknik Statistika STIS, FEB UI, UGM, and other top academic repositories.

**Automated Pipeline & Location:** 
- The data is split into a base static seed (`data/research/seed.json`) and dynamic scraped data (`data/research/scholar.json`).
- A dedicated **Google Scholar Scraper** runs automatically via GitHub Actions every 3 days to fetch the latest academic publications using the original labor-research queries plus added coverage for **NEET** alongside "Sakernas" (and its variations like "Survei Angkatan Kerja Nasional" or "Labor Force Survey"), "Youth Unemployment", "Gig Economy", "Green Jobs", and social-protection topics.
- **Clean Rebuild Rule:** Each automated run rebuilds `data/research/scholar.json` from fresh findings instead of appending onto older dynamic entries, while `seed.json` remains the separate curated baseline.
- **Quality Gate for Dynamic Entries:** Scholar is used as a discovery layer, but the scraper only keeps results that resolve to academic or institutional destinations and expose a real publication date from landing-page metadata or JSON-LD. Results without a verifiable publication date are rejected instead of being assigned synthetic placeholder dates.
- **Publication Window:** Dynamic findings are limited to publications from **2019 onward**.
- **Dynamic Site-Origin Discovery:** The scraper extracts publication hosts (e.g. `.ac.id`, `.edu`, `.org`, `researchgate.net`, `academia.edu`) from initial links and performs a site-specific secondary search pass (`site:<domain> Sakernas`) to perform deep-dives on discovered academic sites. Discovered origins are automatically shortened and tagged as labels (like `STIS`, `UI`, `UGM`, `ResearchGate`).
- The UI dynamically merges these files and renders them as a clean list of rows with publication sources, DOI links, and year of publication.

## News Sources

To ensure comprehensive geographical coverage of labor issues (e.g., regional minimum wage protests, local factory closures), the news aggregator pulls from a wide network of national and provincial media outlets:

### National Outlets
- Kontan, Bisnis.com, CNBC Indonesia, CNN Indonesia
- Katadata, Bloomberg Technoz, Jakarta Post, IDN Financials
- Kumparan, Tirto.id, Detik.com

### Provincial / Regional Outlets
- **Sumatera**: Serambi Indonesia (Aceh), Waspada (Sumut), Haluan (Sumbar), Riau Pos (Riau), Sriwijaya Post (Sumsel)
- **Jawa & Bali**: Warta Kota (DKI Jakarta), Pikiran Rakyat (Jabar), Suara Merdeka (Jateng), Kedaulatan Rakyat (DIY), Surya (Jatim), Bali Post (Bali)
- **Kalimantan**: Pontianak Post (Kalbar), Banjarmasin Post (Kalsel), Kaltim Post (Kaltim)
- **Sulawesi**: Fajar (Sulsel), Manado Post (Sulut)
- **Maluku & Papua**: Ambon Ekspres (Maluku), Cenderawasih Pos (Papua)

## Environment Setup

Create a `.env.local` file in the root of the project (specifically inside `dashboard-ketenagakerjaan/`) to set up the necessary keys:

```bash
# API Key for Gemini AI Summarizer (used in daily tier)
GEMINI_API_KEY=your_gemini_api_key_here

# API Key for BPS Web API (used in weekly tier)
# If set, the scraper uses the official API instead of parsing website HTML.
BPS_API_KEY=your_bps_api_key_here
```

To run the scrapers automatically in GitHub Actions, make sure to add these keys to your repository **Secrets** (`GEMINI_API_KEY` and `BPS_API_KEY`).

## Running the Scrapers

The project includes scheduled scraping scripts to fetch new data.


### Local Execution

To run the scrapers manually and update the local `data/` directory:

```bash
# Run specific scrapers
npx tsx scripts/scrapers/bps-html.ts
npx tsx scripts/scrapers/kemenaker.ts
npx tsx scripts/scrapers/news-aggregator.ts

# Or run the orchestrator for all tiers
npx tsx scripts/run-all.ts --tier all
```

### GitHub Actions (Scheduled)

The data pipeline is designed to run automatically via GitHub Actions. The workflows run scrapers on a scheduled basis and commit the updated JSON files directly to the repository:
- **Daily**: News Aggregator, Setkab
- **Every 3 Days**: **Google Scholar** (`scrape-scholar.yml`)
- **Weekly**: BPS HTML, Kemenaker, Google Trends
- **Monthly**: Bank Indonesia PMI, ASEAN NSO/World Bank

## KBLI Auto-Tagging & Keyword Boundary Matching

News articles are automatically parsed and tagged with relevant KBLI (Klasifikasi Baku Lapangan Usaha Indonesia) sector codes based on keywords found in the title and summary (e.g., matching "pabrik" to Sector C - Industri Pengolahan, or "pertanian" to Sector A).

To prevent false positive substring matching (for example, the keyword `"gas"` matching `"petugas"` or `"migas"`, or `"IT"` matching `"berita"`/`"kita"`), the system enforces strict word boundaries (`\b`) using RegExp across the entire pipeline:
* **Live Ingestion**: `matchesKeywords` and `tagKBLI` in [config.ts](file:///c:/Users/Prastyo/dashboard%20berita%20ketenagakerjaan/dashboard-ketenagakerjaan/scripts/config.ts) use RegExp word boundaries to filter and tag incoming news.
* **Database Maintenance**: [clean-db.ts](file:///c:/Users/Prastyo/dashboard%20berita%20ketenagakerjaan/dashboard-ketenagakerjaan/scripts/clean-db.ts) re-evaluates both `keywords_matched` and `sector_tags` against all 80+ keywords for all historical seed data in `historical-seed.json`, resetting unmatched articles to the `'general'` sector.

## Data Schema & Clickable References

To ensure full traceability and allow the dashboard to render clickable source links for users, **every data payload generated by the scrapers explicitly logs the original source URL.**

For news articles and press releases (e.g., BPS, Kemenaker, News Aggregator), the URL is stored in the `link` property. For broader datasets (e.g., ASEAN indicators), the URL is stored in the `_source_url` property of the JSON file. 

**Example News Article Schema:**
```json
{
  "title": "Example News Title",
  "link": "https://example.tribunnews.com/news-article",
  "date": "2026-06-05T00:00:00Z",
  "summary": "...",
  "outlet": "Tribun Jabar",
  "categories": [],
  "kbli_sectors": [{"code": "C", "name": "Industri Pengolahan"}],
  "_source_url": "https://example.tribunnews.com/news-article",
  "_scraped_at": "2026-06-06T14:35:00.000Z"
}
```

*Future Learning Note for Frontend Developers*: When building UI components (like news cards or data tables), always wrap the title or a "Read More" button with an `<a>` tag pointing to the `link` or `_source_url` property. This maintains transparency and allows users to easily verify the raw data at its source.
