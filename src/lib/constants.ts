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
  { id: "a", label: "A. Pertanian", icon: "🌾" },
  { id: "b", label: "B. Pertambangan & Penggalian", icon: "⛏️" },
  { id: "c", label: "C. Industri", icon: "🏭" },
  { id: "d", label: "D. Pengadaan Listrik & Gas", icon: "⚡" },
  { id: "e", label: "E. Treatment Air & Sampah", icon: "♻️" },
  { id: "f", label: "F. Konstruksi", icon: "🏗️" },
  { id: "g", label: "G. Perdagangan", icon: "🛒" },
  { id: "h", label: "H. Transportasi & Penyimpanan", icon: "🚛" },
  { id: "i", label: "I. Akomodasi & Makan Minum", icon: "🏨" },
  { id: "j", label: "J. Penerbitan & Penyiaran", icon: "📰" },
  { id: "k", label: "K. Telekomunikasi & IT", icon: "💻" },
  { id: "l", label: "L. Keuangan & Asuransi", icon: "🏦" },
  { id: "m", label: "M. Real Estat", icon: "🏢" },
  { id: "no", label: "N,O. Aktivitas Profesional & Perusahaan", icon: "💼" },
  { id: "p", label: "P. Administrasi Pemerintahan", icon: "🏛️" },
  { id: "q", label: "Q. Pendidikan", icon: "🎓" },
  { id: "r", label: "R. Kesehatan & Sosial", icon: "🏥" },
  { id: "stuv", label: "S-V. Jasa Lainnya", icon: "🛠️" },
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
  {
    country_code: "TLS",
    country_name_id: "Timor-Leste",
    country_name_en: "Timor-Leste",
    flag_emoji: "🇹🇱",
    nso_name: "DGS",
    nso_url: "https://www.statistics.gov.tl/",
    data_tier: "worldbank_estimate",
  },
];

// --- News Sources ---
export const NEWS_SOURCES = [
  // Nasional
  { id: "kontan", name: "Kontan", type: "rss" as const, url: "https://rss.kontan.co.id/news/", color: "#E11D48" },
  { id: "bisnis", name: "Bisnis.com", type: "rss" as const, url: "https://www.bisnis.com/rss", color: "#1D4ED8" },
  { id: "katadata", name: "Katadata", type: "rss" as const, url: "https://katadata.co.id/rss", color: "#059669" },
  { id: "cnbc", name: "CNBC Indonesia", type: "rss" as const, url: "https://www.cnbcindonesia.com/news/rss", color: "#0E7490" },
  { id: "cnn", name: "CNN Indonesia", type: "rss" as const, url: "https://www.cnnindonesia.com/ekonomi/rss", color: "#DC2626" },
  { id: "bloomberg", name: "Bloomberg Technoz", type: "scrape" as const, url: "https://www.bloombergtechnoz.com/", color: "#1E293B" },
  { id: "jakpost", name: "Jakarta Post", type: "scrape" as const, url: "https://www.thejakartapost.com/", color: "#7C3AED" },
  { id: "idnfin", name: "IDN Financials", type: "scrape" as const, url: "https://www.idnfinancials.com/", color: "#B45309" },
  { id: "kumparan", name: "Kumparan", type: "scrape" as const, url: "https://kumparan.com/", color: "#F97316" },
  { id: "tirto", name: "Tirto.id", type: "scrape" as const, url: "https://tirto.id/", color: "#000000" },
  { id: "detik", name: "Detik.com", type: "scrape" as const, url: "https://www.detik.com/", color: "#3B82F6" },

  // Jaringan Berita Lokal (Networks)
  { id: "tribun", name: "Tribun Network", type: "scrape" as const, url: "https://www.tribunnews.com/", color: "#475569" },
  { id: "jawapos", name: "Jawa Pos Group", type: "scrape" as const, url: "https://www.jawapos.com/", color: "#475569" },
  { id: "prmn", name: "PRMN (Pikiran Rakyat)", type: "scrape" as const, url: "https://www.pikiran-rakyat.com/", color: "#475569" },
  { id: "promedia", name: "Promedia Network", type: "scrape" as const, url: "https://www.ayobandung.com/", color: "#475569" },

  // Regional Spesifik (Situs Berita Daerah)
  { id: "serambi", name: "Serambi Indonesia (Aceh)", type: "scrape" as const, url: "https://aceh.tribunnews.com/", color: "#475569" },
  { id: "waspada", name: "Waspada (Sumut)", type: "scrape" as const, url: "https://waspada.id/", color: "#475569" },
  { id: "haluan", name: "Haluan (Sumbar)", type: "scrape" as const, url: "https://www.harianhaluan.com/", color: "#475569" },
  { id: "riaupos", name: "Riau Pos", type: "scrape" as const, url: "https://riaupos.jawapos.com/", color: "#475569" },
  { id: "sripoku", name: "Sriwijaya Post (Sumsel)", type: "scrape" as const, url: "https://sripoku.com/", color: "#475569" },
  { id: "wartakota", name: "Warta Kota (DKI Jakarta)", type: "scrape" as const, url: "https://wartakota.tribunnews.com/", color: "#475569" },
  { id: "kabarbanten", name: "Kabar Banten", type: "scrape" as const, url: "https://kabarbanten.pikiran-rakyat.com/", color: "#475569" },
  { id: "pikiranrakyat", name: "Pikiran Rakyat (Jabar)", type: "scrape" as const, url: "https://www.pikiran-rakyat.com/", color: "#475569" },
  { id: "suaramerdeka", name: "Suara Merdeka (Jateng)", type: "scrape" as const, url: "https://www.suaramerdeka.com/", color: "#475569" },
  { id: "krjogja", name: "Kedaulatan Rakyat (DIY)", type: "scrape" as const, url: "https://www.krjogja.com/", color: "#475569" },
  { id: "suryamalang", name: "Surya (Jatim)", type: "scrape" as const, url: "https://suryamalang.tribunnews.com/", color: "#475569" },
  { id: "balipost", name: "Bali Post", type: "scrape" as const, url: "https://www.balipost.com/", color: "#475569" },
  { id: "pontianakpost", name: "Pontianak Post (Kalbar)", type: "scrape" as const, url: "https://pontianakpost.jawapos.com/", color: "#475569" },
  { id: "banjarmasinpost", name: "Banjarmasin Post (Kalsel)", type: "scrape" as const, url: "https://banjarmasinpost.co.id/", color: "#475569" },
  { id: "kaltimpost", name: "Kaltim Post", type: "scrape" as const, url: "https://kaltimpost.jawapos.com/", color: "#475569" },
  { id: "fajar", name: "Fajar (Sulsel)", type: "rss" as const, url: "https://fajar.co.id/feed/", color: "#475569" },
  { id: "kabarmakassar", name: "Kabar Makassar", type: "rss" as const, url: "https://kabarmakassar.com/feed", color: "#475569" },
  { id: "manadopost", name: "Manado Post (Sulut)", type: "scrape" as const, url: "https://manadopost.jawapos.com/", color: "#475569" },
  { id: "ambonekspres", name: "Ambon Ekspres", type: "scrape" as const, url: "https://ambonekspres.com/", color: "#475569" },
  { id: "cenderawasih", name: "Cenderawasih Pos (Papua)", type: "scrape" as const, url: "https://ceposonline.com/", color: "#475569" },
] as const;

// --- Navigation ---
export const NAV_ITEMS = [
  { href: "/", label: "Ikhtisar", icon: "BarChart3" },
  { href: "/makro-indonesia", label: "Makro Indonesia", icon: "Flag" },
  { href: "/sdg-sakernas", label: "SDG Sakernas", icon: "FileText" },
  { href: "/makro-asean", label: "Makro ASEAN", icon: "Globe" },
  { href: "/tren", label: "Tren Pencarian", icon: "TrendingUp" },
  { href: "/berita", label: "Arsip Berita", icon: "Newspaper" },
  { href: "/riset-akademik", label: "Riset Akademik", icon: "BookOpen" },
  { href: "/operasional", label: "Operasional", icon: "Settings" },
] as const;

// --- Keywords for sector auto-tagging ---
export const SECTOR_KEYWORDS: Record<string, string[]> = {
  a: ["pertanian", "perkebunan", "perikanan", "kehutanan", "sawit", "karet", "padi", "nelayan"],
  b: ["tambang", "minerba", "batu bara", "nikel", "mineral", "smelter", "hilirisasi", "iwip"],
  c: ["manufaktur", "pabrik", "industri", "garmen", "tekstil", "otomotif", "elektronik", "farmasi", "amdk"],
  d: ["listrik", "pln", "gas", "migas", "energi", "masela"],
  e: ["sampah", "daur ulang", "air bersih", "limbah"],
  f: ["konstruksi", "properti", "infrastruktur", "pembangunan", "jalan tol", "bandara"],
  g: ["perdagangan", "retail", "UMKM", "ekspor", "impor", "e-commerce"],
  h: ["transportasi", "logistik", "pelabuhan", "bandara", "kereta", "penerbangan", "tiket", "kemenhub", "kai"],
  i: ["hotel", "restoran", "pariwisata", "hospitality", "wisata", "makan minum", "akomodasi"],
  j: ["penerbitan", "penyiaran", "media", "pers", "jurnalis", "berita", "televisi"],
  k: ["teknologi", "startup", "digital", "IT", "telekomunikasi", "tech", "kecerdasan buatan", "AI"],
  l: ["perbankan", "asuransi", "fintech", "keuangan", "bank", "OJK", "kredit", "unitlink"],
  m: ["real estat", "hunian", "kpr", "residensial", "perkantoran", "cbd"],
  no: ["profesional", "konsultan", "jasa perusahaan", "outsourcing"],
  p: ["pemerintahan", "pns", "asn", "pppk", "honorer", "kementerian", "pemda"],
  q: ["pendidikan", "guru", "sekolah", "kampus", "dosen", "universitas"],
  r: ["kesehatan", "rumah sakit", "klinik", "dokter", "nakes", "sosial"],
  stuv: ["hiburan", "event", "jasa lainnya", "kesenian", "rekreasi"],
};

// --- Labor keywords for filtering news ---
export const LABOR_KEYWORDS = [
  "PHK", "tenaga kerja", "pengangguran", "angkatan kerja",
  "upah", "gaji", "lowongan", "ketenagakerjaan",
  "pemutusan hubungan kerja", "JKP", "padat karya",
  "kartu prakerja", "BPJS Ketenagakerjaan", "upah minimum",
  "UMP", "UMR", "UMK", "loker", "rekrutmen",
  "lapangan kerja", "pencari kerja", "mencari kerja",
  "PMA", "investasi", "pembangunan pabrik", "usaha",
  "demo buruh", "mogok kerja", "pesangon", "serikat pekerja",
  "pabrik tutup", "bangkrut", "pekerja formal", "pekerja informal",
  "usaha formal", "usaha informal", "blue collar", "white collar",
  "wirausaha", "membuka lapangan kerja", "PRT", "pembantu rumah tangga",
  "TKI", "tenaga kerja indonesia", "tenaga kerja asing",
  "pekerja anak", "decent work", "pekerjaan berbahaya",
  "setengah penganggur", "penganggur",
  "industri rumahan", "maklun", "industri rumah tangga", "outsourcing",
  "ekonomi baru", "freelancer", "freelancing", "remote worker", "remote working",
  "pekerja kontrak", "subkontrak", "PKWT", "PKWTT", "jaminan kerja",
  "ijin usaha", "kaki lima", "asongan", "rumahan", "proyek pembangunan",
  "menyerap tenaga kerja", "mengentaskan pengangguran", "sakernas", "survei angkatan kerja nasional", "labor force survey"
];

// --- Google Trends Keywords ---
export const TRENDS_KEYWORDS = {
  group1: ["PHK", "Lowongan Kerja", "Jobstreet"],
  group2: ["Cari Kerja", "Loker", "Upah Minimum"],
  group3: ["BPJS Ketenagakerjaan", "Gaji"],
};

// --- BPS Province Codes (38 Provinces) ---
export interface Province {
  code: string;
  name: string;
}

export const PROVINCES: Province[] = [
  { code: '11', name: 'Aceh' },
  { code: '12', name: 'Sumatera Utara' },
  { code: '13', name: 'Sumatera Barat' },
  { code: '14', name: 'Riau' },
  { code: '15', name: 'Jambi' },
  { code: '16', name: 'Sumatera Selatan' },
  { code: '17', name: 'Bengkulu' },
  { code: '18', name: 'Lampung' },
  { code: '19', name: 'Kepulauan Bangka Belitung' },
  { code: '21', name: 'Kepulauan Riau' },
  { code: '31', name: 'DKI Jakarta' },
  { code: '32', name: 'Jawa Barat' },
  { code: '33', name: 'Jawa Tengah' },
  { code: '34', name: 'DI Yogyakarta' },
  { code: '35', name: 'Jawa Timur' },
  { code: '36', name: 'Banten' },
  { code: '51', name: 'Bali' },
  { code: '52', name: 'Nusa Tenggara Barat' },
  { code: '53', name: 'Nusa Tenggara Timur' },
  { code: '61', name: 'Kalimantan Barat' },
  { code: '62', name: 'Kalimantan Tengah' },
  { code: '63', name: 'Kalimantan Selatan' },
  { code: '64', name: 'Kalimantan Timur' },
  { code: '65', name: 'Kalimantan Utara' },
  { code: '71', name: 'Sulawesi Utara' },
  { code: '72', name: 'Sulawesi Tengah' },
  { code: '73', name: 'Sulawesi Selatan' },
  { code: '74', name: 'Sulawesi Tenggara' },
  { code: '75', name: 'Gorontalo' },
  { code: '76', name: 'Sulawesi Barat' },
  { code: '81', name: 'Maluku' },
  { code: '82', name: 'Maluku Utara' },
  { code: '91', name: 'Papua Barat' },
  { code: '94', name: 'Papua' },
  { code: '95', name: 'Papua Selatan' },
  { code: '96', name: 'Papua Tengah' },
  { code: '97', name: 'Papua Pegunungan' },
  { code: '98', name: 'Papua Barat Daya' },
];
