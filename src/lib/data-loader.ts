// ============================================================
// Data Loader — loads JSON data from public/data/ for static site
// ============================================================

import type {
  BPSIndicator,
  PHKArticle,
  PMIData,
  SetkabArticle,
  GoogleTrendsData,
  ASEANCountryData,
  NewsArticle,
  ArticleSummary,
  ScraperRunLog,
  MetadataFile,
} from "@/types";

// In static export mode, data is loaded from public/data/ at build time
// For development, we use sample data

// --- Sample data generators ---

export function getSampleMetadata(): MetadataFile {
  return {
    last_updated: new Date().toISOString(),
    sources: {
      bps: { source: "BPS", last_fetched: "2026-06-05T06:00:00Z", last_success: "2026-06-05T06:00:00Z", items_total: 24, status: "ok" },
      kemenaker: { source: "Kemenaker", last_fetched: "2026-06-05T06:00:00Z", last_success: "2026-06-05T06:00:00Z", items_total: 8, status: "ok" },
      setkab: { source: "Setkab", last_fetched: "2026-06-06T06:00:00Z", last_success: "2026-06-06T06:00:00Z", items_total: 42, status: "ok" },
      bi: { source: "Bank Indonesia", last_fetched: "2026-06-01T06:00:00Z", last_success: "2026-06-01T06:00:00Z", items_total: 12, status: "ok" },
      trends_node: { source: "Google Trends (Node)", last_fetched: "2026-06-02T06:00:00Z", last_success: "2026-06-02T06:00:00Z", items_total: 8, status: "ok" },
      trends_python: { source: "Google Trends (Python)", last_fetched: "2026-06-02T06:00:00Z", last_success: "2026-06-01T06:00:00Z", items_total: 8, status: "warning" },
      asean: { source: "ASEAN NSO", last_fetched: "2026-06-01T06:00:00Z", last_success: "2026-06-01T06:00:00Z", items_total: 10, status: "ok" },
      news: { source: "Berita (8 outlet)", last_fetched: "2026-06-06T06:00:00Z", last_success: "2026-06-06T06:00:00Z", items_total: 156, status: "ok" },
    },
  };
}

export function getSampleBPSData(): any[] {
  return [
    { period: "Jun 2026", ihk_value: 106.8, inflation_yoy: 2.8, inflation_mtm: 0.2, _source_url: "https://www.bps.go.id" },
    { period: "Mei 2026", ihk_value: 106.6, inflation_yoy: 2.9, inflation_mtm: 0.3, _source_url: "https://www.bps.go.id" },
    { period: "Apr 2026", ihk_value: 106.3, inflation_yoy: 3.0, inflation_mtm: 0.1, _source_url: "https://www.bps.go.id" },
    { period: "Mar 2026", ihk_value: 106.2, inflation_yoy: 3.1, inflation_mtm: 0.4, _source_url: "https://www.bps.go.id" },
    { period: "Feb 2026", ihk_value: 105.8, inflation_yoy: 3.2, inflation_mtm: 0.2, _source_url: "https://www.bps.go.id" },
  ];
}

export function getSampleBPSProvinsi(): any[] {
  return [
    { province_code: "31", province_name: "DKI Jakarta", tpt_value: 6.5 },
    { province_code: "32", province_name: "Jawa Barat", tpt_value: 7.8 },
  ];
}

export function getSamplePMIData(): PMIData[] {
  return [
    { period: "Mei 2026", pmi_value: 52.1, sub_indices: { output: 53.2, new_orders: 52.8, employment: 51.5, delivery: 50.3, stocks: 49.8 }, _source_url: "https://www.bi.go.id/id/publikasi/laporan/pmi-mei-2026", _scraped_at: "2026-06-01T06:00:00Z" },
    { period: "April 2026", pmi_value: 51.8, sub_indices: { output: 52.5, new_orders: 52.1, employment: 51.2, delivery: 50.1, stocks: 49.5 }, _source_url: "https://www.bi.go.id/id/publikasi/laporan/pmi-apr-2026", _scraped_at: "2026-05-01T06:00:00Z" },
    { period: "Maret 2026", pmi_value: 51.2, sub_indices: { output: 51.8, new_orders: 51.5, employment: 50.8, delivery: 50.5, stocks: 50.1 }, _source_url: "https://www.bi.go.id/id/publikasi/laporan/pmi-mar-2026", _scraped_at: "2026-04-01T06:00:00Z" },
    { period: "Februari 2026", pmi_value: 50.9, sub_indices: { output: 51.2, new_orders: 51.0, employment: 50.5, delivery: 50.2, stocks: 49.8 }, _source_url: "https://www.bi.go.id/id/publikasi/laporan/pmi-feb-2026", _scraped_at: "2026-03-01T06:00:00Z" },
  ];
}

export function getSamplePHKData(): PHKArticle[] {
  return [
    { id: "phk-1", title: "PHK Massal di Industri Tekstil Jawa Barat", date: "2026-05-20", summary: "Sebanyak 2.300 pekerja di-PHK dari 5 pabrik tekstil di Karawang dan Purwakarta akibat penurunan pesanan ekspor.", workers_affected: 2300, sector: "Industri Pengolahan", region: "Jawa Barat", _source_url: "https://kemnaker.go.id/news/detail/phk-tekstil-jabar-2026", _scraped_at: "2026-05-25T06:00:00Z" },
    { id: "phk-2", title: "Kemenaker Catat 23.470 Pekerja Terkena PHK Januari-Mei 2026", date: "2026-06-01", summary: "Kementerian Ketenagakerjaan mencatat total 23.470 pekerja terkena PHK selama Januari hingga Mei 2026. Jawa Barat menjadi provinsi tertinggi.", workers_affected: 23470, sector: "Berbagai Sektor", region: "Nasional", _source_url: "https://kemnaker.go.id/news/detail/phk-jan-mei-2026", _scraped_at: "2026-06-05T06:00:00Z" },
    { id: "phk-3", title: "Restrukturisasi Startup Teknologi Berlanjut", date: "2026-04-15", summary: "Tiga startup teknologi besar melakukan efisiensi dengan merumahkan total 850 karyawan.", workers_affected: 850, sector: "Informasi & Komunikasi", region: "DKI Jakarta", _source_url: "https://kemnaker.go.id/news/detail/phk-startup-2026", _scraped_at: "2026-04-20T06:00:00Z" },
  ];
}

export function getSampleTrendsData(): GoogleTrendsData[] {
  const baseDate = new Date("2026-02-01");
  const generateSeries = (keyword: string, baseVal: number, variance: number) => {
    const data = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 7);
      data.push({
        date: d.toISOString().split("T")[0],
        value: Math.max(0, Math.min(100, baseVal + Math.round((Math.random() - 0.5) * variance))),
      });
    }
    return data;
  };

  return [
    { keyword: "PHK", source: "node", period: "Feb-Mei 2026", data: generateSeries("PHK", 45, 30), related_queries: ["PHK 2026", "PHK massal", "pesangon PHK"], _scraped_at: "2026-06-02T06:00:00Z" },
    { keyword: "Lowongan Kerja", source: "node", period: "Feb-Mei 2026", data: generateSeries("Lowongan", 65, 20), related_queries: ["lowongan kerja 2026", "loker Jakarta", "lowongan BUMN"], _scraped_at: "2026-06-02T06:00:00Z" },
    { keyword: "Jobstreet", source: "node", period: "Feb-Mei 2026", data: generateSeries("Jobstreet", 55, 15), related_queries: ["jobstreet login", "jobstreet Indonesia", "lamaran kerja"], _scraped_at: "2026-06-02T06:00:00Z" },
    { keyword: "Cari Kerja", source: "node", period: "Feb-Mei 2026", data: generateSeries("Cari Kerja", 40, 25), related_queries: ["cara cari kerja", "tips cari kerja", "kerja online"], _scraped_at: "2026-06-02T06:00:00Z" },
    { keyword: "Upah Minimum", source: "node", period: "Feb-Mei 2026", data: generateSeries("Upah Minimum", 30, 40), related_queries: ["UMP 2026", "UMR Jakarta", "kenaikan gaji"], _scraped_at: "2026-06-02T06:00:00Z" },
  ];
}

export function getSampleASEANData(): ASEANCountryData[] {
  return [
    { country_code: "IDN", country_name_id: "Indonesia", country_name_en: "Indonesia", flag_emoji: "🇮🇩", nso_name: "BPS", nso_url: "https://www.bps.go.id", data_tier: "official_nso", last_updated: "2026-05-05", indicators: { unemployment_rate: { value: 4.82, period: "Feb 2026", _source_url: "https://www.bps.go.id" }, lfpr: { value: 69.51, period: "Feb 2026", _source_url: "https://www.bps.go.id" } } },
    { country_code: "MYS", country_name_id: "Malaysia", country_name_en: "Malaysia", flag_emoji: "🇲🇾", nso_name: "DOSM", nso_url: "https://www.dosm.gov.my", data_tier: "official_nso", last_updated: "2026-05-15", indicators: { unemployment_rate: { value: 2.9, period: "Mar 2026", _source_url: "https://api.data.gov.my" }, lfpr: { value: 70.3, period: "Mar 2026", _source_url: "https://api.data.gov.my" } } },
    { country_code: "THA", country_name_id: "Thailand", country_name_en: "Thailand", flag_emoji: "🇹🇭", nso_name: "NSO", nso_url: "https://www.nso.go.th", data_tier: "official_nso", last_updated: "2026-05-10", indicators: { unemployment_rate: { value: 0.94, period: "Q1 2026", _source_url: "https://www.nso.go.th" }, lfpr: { value: 68.2, period: "Q1 2026", _source_url: "https://www.nso.go.th" } } },
    { country_code: "PHL", country_name_id: "Filipina", country_name_en: "Philippines", flag_emoji: "🇵🇭", nso_name: "PSA", nso_url: "https://psa.gov.ph", data_tier: "official_nso", last_updated: "2026-05-08", indicators: { unemployment_rate: { value: 5.0, period: "Mar 2026", _source_url: "https://psa.gov.ph" }, lfpr: { value: 65.8, period: "Mar 2026", _source_url: "https://psa.gov.ph" } } },
    { country_code: "VNM", country_name_id: "Vietnam", country_name_en: "Vietnam", flag_emoji: "🇻🇳", nso_name: "GSO", nso_url: "https://www.gso.gov.vn", data_tier: "official_nso", last_updated: "2026-04-20", indicators: { unemployment_rate: { value: 2.21, period: "Q1 2026", _source_url: "https://www.gso.gov.vn" }, lfpr: { value: 73.1, period: "Q1 2026", _source_url: "https://www.gso.gov.vn" } } },
    { country_code: "SGP", country_name_id: "Singapura", country_name_en: "Singapore", flag_emoji: "🇸🇬", nso_name: "SingStat", nso_url: "https://www.singstat.gov.sg", data_tier: "official_nso", last_updated: "2026-05-01", indicators: { unemployment_rate: { value: 2.1, period: "Mar 2026", _source_url: "https://www.singstat.gov.sg" }, lfpr: { value: 71.2, period: "Mar 2026", _source_url: "https://www.singstat.gov.sg" } } },
    { country_code: "MMR", country_name_id: "Myanmar", country_name_en: "Myanmar", flag_emoji: "🇲🇲", nso_name: "CSO", nso_url: "http://www.csostat.gov.mm", data_tier: "ilo_estimate", last_updated: "2025-12-01", indicators: { unemployment_rate: { value: 2.8, period: "2024 (est.)", _source_url: "https://ilostat.ilo.org" } } },
    { country_code: "KHM", country_name_id: "Kamboja", country_name_en: "Cambodia", flag_emoji: "🇰🇭", nso_name: "NIS", nso_url: "https://www.nis.gov.kh", data_tier: "ilo_estimate", last_updated: "2025-12-01", indicators: { unemployment_rate: { value: 0.26, period: "2025 (est.)", _source_url: "https://ilostat.ilo.org" } } },
    { country_code: "LAO", country_name_id: "Laos", country_name_en: "Laos", flag_emoji: "🇱🇦", nso_name: "LSB", nso_url: "https://www.lsb.gov.la", data_tier: "ilo_estimate", last_updated: "2025-12-01", indicators: { unemployment_rate: { value: 1.2, period: "2025 (est.)", _source_url: "https://ilostat.ilo.org" } } },
    { country_code: "BRN", country_name_id: "Brunei Darussalam", country_name_en: "Brunei", flag_emoji: "🇧🇳", nso_name: "DEPS", nso_url: "https://deps.mofe.gov.bn", data_tier: "official_nso", last_updated: "2026-03-01", indicators: { unemployment_rate: { value: 5.0, period: "2025", _source_url: "https://deps.mofe.gov.bn" } } },
  ];
}

export function getSampleNewsData(): NewsArticle[] {
  return [
    { id: "n1", title: "Pemerintah Siapkan Program Padat Karya untuk 500 Ribu Pekerja", date: "2026-06-05", source: "kontan", source_name: "Kontan", excerpt: "Kementerian PUPR dan Kemenaker menyiapkan program padat karya infrastruktur pertanian yang ditargetkan menyerap 500 ribu tenaga kerja di semester II 2026.", sector_tags: ["a"], keywords_matched: ["tenaga kerja", "padat karya"], _source_url: "https://www.kontan.co.id/news/padat-karya-2026", _scraped_at: "2026-06-05T06:00:00Z" },
    { id: "n2", title: "PHK Massal Sektor Tekstil, 2.300 Pekerja Terdampak", date: "2026-06-04", source: "cnbc", source_name: "CNBC Indonesia", excerpt: "Gelombang PHK melanda industri tekstil di Jawa Barat. Sebanyak 2.300 pekerja dari 5 pabrik dirumahkan akibat menurunnya pesanan ekspor ke pasar Eropa.", sector_tags: ["c"], keywords_matched: ["PHK", "tenaga kerja"], _source_url: "https://www.cnbcindonesia.com/news/phk-tekstil-2026", _scraped_at: "2026-06-04T06:00:00Z" },
    { id: "n3", title: "UMP 2027 Diproyeksikan Naik 6-8 Persen", date: "2026-06-03", source: "bisnis", source_name: "Bisnis.com", excerpt: "Dewan Pengupahan Nasional memproyeksikan kenaikan Upah Minimum Provinsi (UMP) 2027 sebesar 6-8 persen berdasarkan formula PP 51/2023.", sector_tags: [], keywords_matched: ["upah minimum", "UMP"], _source_url: "https://www.bisnis.com/ump-2027-proyeksi", _scraped_at: "2026-06-03T06:00:00Z" },
    { id: "n4", title: "Investasi Asing Masuk Rp 142 Triliun di Q1 2026, Serap 1,2 Juta Tenaga Kerja", date: "2026-06-02", source: "katadata", source_name: "Katadata", excerpt: "Realisasi investasi asing (PMA) kuartal I 2026 mencapai Rp 142 triliun, menyerap 1,2 juta tenaga kerja baru terutama di sektor manufaktur dan infrastruktur.", sector_tags: ["c", "f"], keywords_matched: ["tenaga kerja", "investasi"], _source_url: "https://katadata.co.id/investasi-q1-2026", _scraped_at: "2026-06-02T06:00:00Z" },
    { id: "n5", title: "Startup Teknologi Lakukan Efisiensi, 850 Karyawan Dirumahkan", date: "2026-06-01", source: "cnn", source_name: "CNN Indonesia", excerpt: "Tiga startup teknologi besar di Indonesia melakukan restrukturisasi dengan merumahkan total 850 karyawan. Langkah ini diambil untuk mencapai profitabilitas.", sector_tags: ["k"], keywords_matched: ["PHK", "karyawan"], _source_url: "https://www.cnnindonesia.com/startup-efisiensi-2026", _scraped_at: "2026-06-01T06:00:00Z" },
    { id: "n6", title: "Ekspor Nikel Olahan Meningkat, Industri Smelter Rekrut 15 Ribu Pekerja Baru", date: "2026-05-30", source: "bloomberg", source_name: "Bloomberg Technoz", excerpt: "Industri smelter nikel di Sulawesi dan Maluku merekrut 15.000 pekerja baru seiring meningkatnya permintaan nikel olahan untuk baterai kendaraan listrik.", sector_tags: ["b", "c"], keywords_matched: ["tenaga kerja", "rekrut"], _source_url: "https://www.bloombergtechnoz.com/nikel-smelter-2026", _scraped_at: "2026-05-30T06:00:00Z" },
  ];
}

export function getSampleSummaries(): ArticleSummary[] {
  return [
    { article_id: "n1", source: "kontan", original_title: "Pemerintah Siapkan Program Padat Karya untuk 500 Ribu Pekerja", _source_url: "https://www.kontan.co.id/news/padat-karya-2026", ringkasan: "Pemerintah melalui Kementerian PUPR dan Kemenaker meluncurkan program padat karya infrastruktur yang menargetkan penyerapan 500.000 tenaga kerja di semester II 2026. Program ini fokus pada proyek jalan, irigasi, dan fasilitas publik di daerah tertinggal.", dampak_tenaga_kerja: "positif", tingkat_dampak: "tinggi", angka_penting: ["500.000 tenaga kerja ditargetkan", "Semester II 2026"], sektor_terdampak: ["Konstruksi"], kata_kunci: ["padat karya", "infrastruktur", "penyerapan tenaga kerja"], _summarized_at: "2026-06-05T07:00:00Z", _model: "gemini-2.0-flash", _token_usage: { input_tokens: 450, output_tokens: 280 } },
    { article_id: "n2", source: "cnbc", original_title: "PHK Massal Sektor Tekstil, 2.300 Pekerja Terdampak", _source_url: "https://www.cnbcindonesia.com/news/phk-tekstil-2026", ringkasan: "Industri tekstil Jawa Barat mengalami gelombang PHK dengan 2.300 pekerja dari 5 pabrik dirumahkan. Penyebab utama adalah penurunan pesanan ekspor ke Eropa akibat persaingan dengan produk Vietnam dan Bangladesh yang lebih murah.", dampak_tenaga_kerja: "negatif", tingkat_dampak: "tinggi", angka_penting: ["2.300 pekerja di-PHK", "5 pabrik terdampak", "Penurunan ekspor ke Eropa"], sektor_terdampak: ["Industri Pengolahan"], kata_kunci: ["PHK", "tekstil", "ekspor", "Jawa Barat"], _summarized_at: "2026-06-04T07:00:00Z", _model: "gemini-2.0-flash", _token_usage: { input_tokens: 380, output_tokens: 310 } },
    { article_id: "n4", source: "katadata", original_title: "Investasi Asing Masuk Rp 142 Triliun di Q1 2026", _source_url: "https://katadata.co.id/investasi-q1-2026", ringkasan: "Realisasi PMA Q1 2026 sebesar Rp 142 triliun telah menyerap 1,2 juta tenaga kerja baru, didominasi sektor manufaktur dan infrastruktur. Angka ini menunjukkan tren positif dibandingkan periode yang sama tahun sebelumnya.", dampak_tenaga_kerja: "positif", tingkat_dampak: "tinggi", angka_penting: ["Rp 142 triliun PMA", "1,2 juta tenaga kerja baru", "Q1 2026"], sektor_terdampak: ["Industri Pengolahan", "Konstruksi"], kata_kunci: ["investasi asing", "PMA", "penyerapan tenaga kerja"], _summarized_at: "2026-06-02T07:00:00Z", _model: "gemini-2.0-flash", _token_usage: { input_tokens: 420, output_tokens: 290 } },
  ];
}

export function getSampleOpsData(): ScraperRunLog[] {
  return [
    {
      run_id: "gh-12345", timestamp: "2026-06-06T06:00:00Z", tier: "daily",
      scrapers: {
        setkab: { status: "success", latency_ms: 920, items_fetched: 12, items_new: 3, items_failed: 0, source_url: "https://setkab.go.id/feed/", http_status: 200, response_size_bytes: 45000 },
        news_kontan: { status: "success", latency_ms: 1200, items_fetched: 8, items_new: 4, items_failed: 0, source_url: "https://rss.kontan.co.id/news/", http_status: 200, response_size_bytes: 32000 },
        news_cnbc: { status: "success", latency_ms: 980, items_fetched: 10, items_new: 5, items_failed: 0, source_url: "https://www.cnbcindonesia.com/news/rss", http_status: 200, response_size_bytes: 38000 },
        news_cnn: { status: "success", latency_ms: 1100, items_fetched: 6, items_new: 2, items_failed: 0, source_url: "https://www.cnnindonesia.com/ekonomi/rss", http_status: 200, response_size_bytes: 28000 },
        news_bisnis: { status: "success", latency_ms: 1400, items_fetched: 5, items_new: 3, items_failed: 0, source_url: "https://www.bisnis.com/rss", http_status: 200, response_size_bytes: 22000 },
        news_katadata: { status: "success", latency_ms: 2300, items_fetched: 7, items_new: 4, items_failed: 1, source_url: "https://katadata.co.id/berita", http_status: 200, response_size_bytes: 65000 },
        news_bloomberg: { status: "partial", latency_ms: 3100, items_fetched: 4, items_new: 2, items_failed: 2, source_url: "https://www.bloombergtechnoz.com/", http_status: 200, response_size_bytes: 82000 },
        news_jakpost: { status: "success", latency_ms: 1800, items_fetched: 3, items_new: 1, items_failed: 0, source_url: "https://www.thejakartapost.com/", http_status: 200, response_size_bytes: 55000 },
      },
      gemini: { articles_summarized: 18, total_input_tokens: 8200, total_output_tokens: 5400, api_calls: 2, latency_ms: 4500, rate_limited: false, errors: 0 },
      github_actions: { workflow_name: "scrape-daily", run_duration_ms: 42000, billable_minutes: 1 },
    },
    {
      run_id: "gh-12340", timestamp: "2026-06-01T06:00:00Z", tier: "weekly",
      scrapers: {
        bps_html: { status: "success", latency_ms: 2300, items_fetched: 5, items_new: 2, items_failed: 0, source_url: "https://www.bps.go.id/id/pressrelease", http_status: 200, response_size_bytes: 120000 },
        kemenaker: { status: "success", latency_ms: 1800, items_fetched: 3, items_new: 1, items_failed: 0, source_url: "https://kemnaker.go.id/news/categories/siaran-pers", http_status: 200, response_size_bytes: 95000 },
        trends_node: { status: "success", latency_ms: 2800, items_fetched: 8, items_new: 8, items_failed: 0, source_url: "https://trends.google.com", http_status: 200, response_size_bytes: 12000 },
        trends_python: { status: "partial", latency_ms: 8200, items_fetched: 6, items_new: 6, items_failed: 2, source_url: "https://trends.google.com", http_status: 429, response_size_bytes: 8000, error_message: "Rate limited on 2 keyword groups" },
      },
      github_actions: { workflow_name: "scrape-weekly", run_duration_ms: 65000, billable_minutes: 2 },
    },
  ];
}
