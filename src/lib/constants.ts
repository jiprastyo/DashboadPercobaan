// ============================================================
// Constants — Dashboard Monitoring Ketenagakerjaan
// ============================================================

import type { SurveyPeriod, ASEANCountryData } from "@/types";

// --- Survey Periods ---
export const SURVEY_PERIODS: SurveyPeriod[] = [
  {
    id: "2026-feb",
    survey_month: "Februari 2026",
    release_month: "Mei 2026",
    label: "Feb → Mei 2026",
    start_date: "2026-02-01",
    end_date: "2026-05-31",
  },
  {
    id: "2026-may",
    survey_month: "Mei 2026",
    release_month: "Agustus 2026",
    label: "Mei → Agu 2026",
    start_date: "2026-05-01",
    end_date: "2026-08-31",
  },
  {
    id: "2026-aug",
    survey_month: "Agustus 2026",
    release_month: "November 2026",
    label: "Agu → Nov 2026",
    start_date: "2026-08-01",
    end_date: "2026-11-30",
  },
  {
    id: "2026-nov",
    survey_month: "November 2026",
    release_month: "Februari 2027",
    label: "Nov 2026 → Feb 2027",
    start_date: "2026-11-01",
    end_date: "2027-02-28",
  },
];

// --- KBLI / ISIC Sectors ---
export const KBLI_SECTORS = [
  { id: "pertanian", label: "Pertanian, Kehutanan & Perikanan", icon: "🌾" },
  { id: "pertambangan", label: "Pertambangan & Penggalian", icon: "⛏️" },
  { id: "industri", label: "Industri Pengolahan", icon: "🏭" },
  { id: "konstruksi", label: "Konstruksi", icon: "🏗️" },
  { id: "perdagangan", label: "Perdagangan Besar & Eceran", icon: "🛒" },
  { id: "akomodasi", label: "Akomodasi & Makan Minum", icon: "🏨" },
  { id: "transportasi", label: "Transportasi & Pergudangan", icon: "🚛" },
  { id: "infokom", label: "Informasi & Komunikasi", icon: "📡" },
  { id: "keuangan", label: "Jasa Keuangan & Asuransi", icon: "🏦" },
] as const;

// --- ASEAN Countries ---
export const ASEAN_COUNTRIES: Omit<ASEANCountryData, "indicators" | "last_updated">[] = [
  {
    country_code: "IDN",
    country_name_id: "Indonesia",
    country_name_en: "Indonesia",
    flag_emoji: "🇮🇩",
    nso_name: "BPS",
    nso_url: "https://www.bps.go.id",
    data_tier: "official_nso",
  },
  {
    country_code: "MYS",
    country_name_id: "Malaysia",
    country_name_en: "Malaysia",
    flag_emoji: "🇲🇾",
    nso_name: "DOSM",
    nso_url: "https://www.dosm.gov.my",
    data_tier: "official_nso",
  },
  {
    country_code: "THA",
    country_name_id: "Thailand",
    country_name_en: "Thailand",
    flag_emoji: "🇹🇭",
    nso_name: "NSO",
    nso_url: "https://www.nso.go.th",
    data_tier: "official_nso",
  },
  {
    country_code: "PHL",
    country_name_id: "Filipina",
    country_name_en: "Philippines",
    flag_emoji: "🇵🇭",
    nso_name: "PSA",
    nso_url: "https://psa.gov.ph",
    data_tier: "official_nso",
  },
  {
    country_code: "VNM",
    country_name_id: "Vietnam",
    country_name_en: "Vietnam",
    flag_emoji: "🇻🇳",
    nso_name: "GSO",
    nso_url: "https://www.gso.gov.vn",
    data_tier: "official_nso",
  },
  {
    country_code: "SGP",
    country_name_id: "Singapura",
    country_name_en: "Singapore",
    flag_emoji: "🇸🇬",
    nso_name: "SingStat",
    nso_url: "https://www.singstat.gov.sg",
    data_tier: "official_nso",
  },
  {
    country_code: "MMR",
    country_name_id: "Myanmar",
    country_name_en: "Myanmar",
    flag_emoji: "🇲🇲",
    nso_name: "CSO",
    nso_url: "http://www.csostat.gov.mm",
    data_tier: "ilo_estimate",
  },
  {
    country_code: "KHM",
    country_name_id: "Kamboja",
    country_name_en: "Cambodia",
    flag_emoji: "🇰🇭",
    nso_name: "NIS",
    nso_url: "https://www.nis.gov.kh",
    data_tier: "ilo_estimate",
  },
  {
    country_code: "LAO",
    country_name_id: "Laos",
    country_name_en: "Laos",
    flag_emoji: "🇱🇦",
    nso_name: "LSB",
    nso_url: "https://www.lsb.gov.la",
    data_tier: "ilo_estimate",
  },
  {
    country_code: "BRN",
    country_name_id: "Brunei Darussalam",
    country_name_en: "Brunei",
    flag_emoji: "🇧🇳",
    nso_name: "DEPS",
    nso_url: "https://deps.mofe.gov.bn",
    data_tier: "official_nso",
  },
];

// --- News Sources ---
export const NEWS_SOURCES = [
  { id: "kontan", name: "Kontan", type: "rss" as const, url: "https://rss.kontan.co.id/news/", color: "#E11D48" },
  { id: "bisnis", name: "Bisnis.com", type: "rss" as const, url: "https://www.bisnis.com/rss", color: "#1D4ED8" },
  { id: "katadata", name: "Katadata", type: "scrape" as const, url: "https://katadata.co.id/berita", color: "#059669" },
  { id: "cnbc", name: "CNBC Indonesia", type: "rss" as const, url: "https://www.cnbcindonesia.com/news/rss", color: "#0E7490" },
  { id: "cnn", name: "CNN Indonesia", type: "rss" as const, url: "https://www.cnnindonesia.com/ekonomi/rss", color: "#DC2626" },
  { id: "bloomberg", name: "Bloomberg Technoz", type: "scrape" as const, url: "https://www.bloombergtechnoz.com/", color: "#1E293B" },
  { id: "jakpost", name: "Jakarta Post", type: "scrape" as const, url: "https://www.thejakartapost.com/", color: "#7C3AED" },
  { id: "idnfin", name: "IDN Financials", type: "scrape" as const, url: "https://www.idnfinancials.com/", color: "#B45309" },
] as const;

// --- Navigation ---
export const NAV_ITEMS = [
  { href: "/", label: "Ikhtisar", icon: "BarChart3" },
  { href: "/makro-indonesia", label: "Makro Indonesia", icon: "Flag" },
  { href: "/makro-asean", label: "Makro ASEAN", icon: "Globe" },
  { href: "/sektoral", label: "Sektoral", icon: "Factory" },
  { href: "/tren", label: "Tren Pencarian", icon: "TrendingUp" },
  { href: "/berita", label: "Arsip Berita", icon: "Newspaper" },
  { href: "/laporan", label: "Pembuat Laporan", icon: "FileText" },
  { href: "/operasional", label: "Operasional", icon: "Settings" },
] as const;

// --- Keywords for sector auto-tagging ---
export const SECTOR_KEYWORDS: Record<string, string[]> = {
  pertanian: ["pertanian", "perkebunan", "perikanan", "kehutanan", "sawit", "karet", "padi", "nelayan"],
  pertambangan: ["tambang", "minerba", "batu bara", "nikel", "mineral", "smelter", "hilirisasi"],
  industri: ["manufaktur", "pabrik", "industri", "garmen", "tekstil", "otomotif", "elektronik", "farmasi"],
  konstruksi: ["konstruksi", "properti", "infrastruktur", "pembangunan", "jalan tol", "bandara"],
  perdagangan: ["perdagangan", "retail", "UMKM", "ekspor", "impor", "e-commerce"],
  akomodasi: ["hotel", "restoran", "pariwisata", "hospitality", "wisata"],
  transportasi: ["transportasi", "logistik", "pelabuhan", "bandara", "kereta", "penerbangan"],
  infokom: ["teknologi", "startup", "digital", "IT", "telekomunikasi", "tech"],
  keuangan: ["perbankan", "asuransi", "fintech", "keuangan", "bank", "OJK"],
};

// --- Labor keywords for filtering news ---
export const LABOR_KEYWORDS = [
  "PHK", "tenaga kerja", "pengangguran", "angkatan kerja",
  "upah", "gaji", "lowongan", "ketenagakerjaan",
  "pemutusan hubungan kerja", "JKP", "padat karya",
  "kartu prakerja", "BPJS Ketenagakerjaan", "upah minimum",
  "UMP", "UMR", "UMK", "loker", "rekrutmen",
];

// --- Google Trends Keywords ---
export const TRENDS_KEYWORDS = {
  group1: ["PHK", "Lowongan Kerja", "Jobstreet"],
  group2: ["Cari Kerja", "Loker", "Upah Minimum"],
  group3: ["BPJS Ketenagakerjaan", "Gaji"],
};
