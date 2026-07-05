// ============================================================
// Sample-data fallbacks (Stage 0 survivors)
// ============================================================
//
// This module does NOT load real data (the real loader is
// src/lib/data-loader-server.ts). Historically it exported a full set of
// hard-coded `getSample*` generators that some surfaces rendered
// unconditionally. Stage 0 of the visualization revamp purged every
// always-sample surface; the ONLY generators that remain are the two used as
// explicit missing-file fallbacks, each guarded by a real-loader check and the
// showWarning / DataNotice transparency contract:
//
//   - getSampleBPSData  — overview + makro-indonesia, when getBPSNationalData()
//     returns null (source flagged as 'static_seed', amber fallback banner shown).
//   - getSampleNewsData — overview, when getNewsData() returns [].
//
// Do not re-add sample generators or wire these into a surface that renders them
// unconditionally: fabricated numbers on a statistics dashboard destroy trust
// (see project-guardrails g and add-visualization's sample-data trap).

import type { NewsArticle } from "@/types";

// getBPSNationalData() missing-file fallback (overview + makro-indonesia).
export function getSampleBPSData(): Array<{
  period: string;
  ihk_value: number;
  inflation_yoy: number;
  inflation_mtm: number;
  _source_url: string;
}> {
  return [
    { period: "Jun 2026", ihk_value: 106.8, inflation_yoy: 2.8, inflation_mtm: 0.2, _source_url: "https://www.bps.go.id" },
    { period: "Mei 2026", ihk_value: 106.6, inflation_yoy: 2.9, inflation_mtm: 0.3, _source_url: "https://www.bps.go.id" },
    { period: "Apr 2026", ihk_value: 106.3, inflation_yoy: 3.0, inflation_mtm: 0.1, _source_url: "https://www.bps.go.id" },
    { period: "Mar 2026", ihk_value: 106.2, inflation_yoy: 3.1, inflation_mtm: 0.4, _source_url: "https://www.bps.go.id" },
    { period: "Feb 2026", ihk_value: 105.8, inflation_yoy: 3.2, inflation_mtm: 0.2, _source_url: "https://www.bps.go.id" },
  ];
}

// getNewsData() empty-file fallback (overview).
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
