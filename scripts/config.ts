/**
 * scripts/config.ts — Centralized configuration for all scrapers
 * All source URLs, keywords, rate-limit settings, and data paths.
 */

import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local at the project root
try {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
} catch (err) {
  console.warn('Failed to load .env.local in config.ts:', err);
}

// ─── Root Paths ──────────────────────────────────────────────────────────────
export const PROJECT_ROOT = path.resolve(__dirname, '..');

export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const METADATA_PATH = path.join(DATA_DIR, '_metadata.json');

// ─── Rate Limiting ───────────────────────────────────────────────────────────
export const RATE_LIMIT = {
  defaultDelayMs: 2000,       // 2 seconds between requests
  googleTrendsDelayMs: 5000,  // 5 seconds between Google Trends queries
  geminiDelayMs: 3000,        // 3 seconds between Gemini API batches
  maxRetries: 3,
  timeoutMs: 10_000,          // 10 seconds HTTP timeout
  backoffMultiplier: 2,       // exponential backoff multiplier
};

// ─── Fetch defaults ──────────────────────────────────────────────────────────
export const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

// ─── BPS (Badan Pusat Statistik) ─────────────────────────────────────────────
export const BPS = {
  baseUrl: 'https://www.bps.go.id/id/pressrelease',
  indicators: [
    { slug: 'ihk', keywords: ['ihk', 'indeks harga konsumen', 'inflasi'] },
    { slug: 'ekspor-impor', keywords: ['ekspor', 'impor', 'neraca perdagangan', 'perdagangan luar negeri'] },
    { slug: 'wisman', keywords: ['wisman', 'wisatawan mancanegara', 'kunjungan wisatawan'] },
    { slug: 'transportasi', keywords: ['transportasi', 'penumpang', 'angkutan', 'barang'] },
    { slug: 'ketenagakerjaan', keywords: ['ketenagakerjaan', 'pengangguran', 'angkatan kerja', 'sakernas', 'tpak', 'tpt'] },
    { slug: 'pertumbuhan-ekonomi', keywords: ['pdb', 'pertumbuhan ekonomi', 'produk domestik bruto'] },
    { slug: 'kemiskinan', keywords: ['kemiskinan', 'penduduk miskin', 'gini ratio', 'ketimpangan'] },
    { slug: 'ntp', keywords: ['ntp', 'nilai tukar petani'] },
  ],
  dataDir: path.join(DATA_DIR, 'bps'),
};

// ─── Kemenaker (Kementerian Ketenagakerjaan) ─────────────────────────────────
export const KEMENAKER = {
  baseUrl: 'https://kemnaker.go.id/news/categories/siaran-pers',
  phkKeywords: [
    'phk', 'pemutusan hubungan kerja', 'pemecatan', 'perampingan',
    'efisiensi karyawan', 'pengurangan tenaga kerja', 'layoff', 'restrukturisasi',
    'penutupan pabrik', 'penutupan perusahaan', 'mogok kerja', 'unjuk rasa buruh',
  ],
  dataDir: path.join(DATA_DIR, 'kemenaker', 'phk'),
};

// ─── Setkab (Sekretariat Kabinet) ────────────────────────────────────────────
export const SETKAB = {
  rssUrl: 'https://setkab.go.id/feed/',
  keywords: [
    'ketenagakerjaan', 'tenaga kerja', 'pengangguran', 'phk', 'buruh',
    'upah', 'gaji', 'lowongan', 'lapangan kerja', 'angkatan kerja',
    'pekerja', 'serikat pekerja', 'jaminan sosial', 'bpjs ketenagakerjaan',
    'pelatihan kerja', 'produktivitas', 'tki', 'pmi', 'pekerja migran',
  ],
  dataDir: path.join(DATA_DIR, 'setkab', 'articles'),
};

// ─── Bank Indonesia PMI ──────────────────────────────────────────────────────
export const BI_PMI = {
  baseUrl: 'https://www.bi.go.id/id/publikasi/laporan/Pages/Survei-PMI.aspx',
  alternateUrl: 'https://www.bi.go.id/id/statistik/indikator/data-inflasi.aspx',
  dataDir: path.join(DATA_DIR, 'bi', 'pmi'),
};

// ─── Google Trends ───────────────────────────────────────────────────────────
export const GOOGLE_TRENDS = {
  keywords: [
    'PHK',
    'Lowongan Kerja',
    'Jobstreet',
    'Cari Kerja',
    'Loker',
    'Upah Minimum',
    'BPJS Ketenagakerjaan',
    'Gaji',
  ],
  geo: 'ID',
  nodeDataDir: path.join(DATA_DIR, 'trends', 'node'),
  pythonDataDir: path.join(DATA_DIR, 'trends', 'python'),
};

// ─── ASEAN Country Codes & NSO URLs ──────────────────────────────────────────
export interface ASEANCountry {
  code: string;
  name: string;
  nsoName: string;
  apiUrl?: string;
  htmlUrl?: string;
  type: 'api' | 'html';
}

export const ASEAN_COUNTRIES: ASEANCountry[] = [
  {
    code: 'MYS',
    name: 'Malaysia',
    nsoName: 'DOSM',
    apiUrl: 'https://api.data.gov.my/data-catalogue?id=lfs_month',
    type: 'api',
  },
  {
    code: 'SGP',
    name: 'Singapore',
    nsoName: 'SingStat',
    apiUrl: 'https://data.gov.sg/api/action/datastore_search?resource_id=d_a89deba6e903e1abd83b5704e8001e86&limit=100',
    type: 'api',
  },
  {
    code: 'PHL',
    name: 'Philippines',
    nsoName: 'PSA',
    apiUrl: 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2B%20LFS/0012B4ELFS0.px',
    type: 'api',
  },
  {
    code: 'THA',
    name: 'Thailand',
    nsoName: 'NSO Thailand',
    apiUrl: 'http://statbbi.nso.go.th/staticreport/page/sector/en/01.aspx',
    htmlUrl: 'http://statbbi.nso.go.th/staticreport/page/sector/en/01.aspx',
    type: 'html',
  },
  {
    code: 'VNM',
    name: 'Vietnam',
    nsoName: 'GSO Vietnam',
    htmlUrl: 'https://www.gso.gov.vn/en/labour/',
    type: 'html',
  },
  {
    code: 'MMR',
    name: 'Myanmar',
    nsoName: 'CSO Myanmar',
    htmlUrl: 'https://www.csostat.gov.mm/',
    type: 'html',
  },
  {
    code: 'KHM',
    name: 'Cambodia',
    nsoName: 'NIS Cambodia',
    htmlUrl: 'https://www.nis.gov.kh/',
    type: 'html',
  },
  {
    code: 'LAO',
    name: 'Laos',
    nsoName: 'LSB Laos',
    htmlUrl: 'https://www.lsb.gov.la/',
    type: 'html',
  },
  {
    code: 'BRN',
    name: 'Brunei',
    nsoName: 'DEPS Brunei',
    htmlUrl: 'http://www.deps.gov.bn/',
    type: 'html',
  },
];

export const ASEAN_NSO = {
  dataDir: path.join(DATA_DIR, 'asean', 'nso'),
};

// ─── ILO / World Bank Fallback ───────────────────────────────────────────────
export const WORLD_BANK = {
  baseUrl: 'https://api.worldbank.org/v2',
  countries: 'IDN;MYS;THA;PHL;VNM;SGP;MMR;KHM;LAO;BRN',
  indicators: [
    { code: 'SL.UEM.TOTL.ZS', name: 'Unemployment rate (%)' },
    { code: 'SL.TLF.CACT.ZS', name: 'Labor force participation rate (%)' },
    { code: 'SL.EMP.TOTL.SP.ZS', name: 'Employment to population ratio (%)' },
    { code: 'SL.UEM.1524.ZS', name: 'Youth unemployment rate (%)' },
  ],
  dateRange: '2018:2026',
  perPage: 500,
  dataDir: path.join(DATA_DIR, 'asean', 'fallback'),
};

// ─── News Outlets ────────────────────────────────────────────────────────────
export interface NewsOutlet {
  name: string;
  type: 'rss' | 'html';
  urls: string[];
  selectors?: {
    articleList: string;
    title: string;
    link: string;
    date?: string;
    summary?: string;
  };
}

export const NEWS_OUTLETS: NewsOutlet[] = [
  // RSS-based outlets
  {
    name: 'Kontan',
    type: 'rss',
    urls: [
      'https://rss.kontan.co.id/news/makroekonomi',
      'https://rss.kontan.co.id/news/nasional',
      'https://rss.kontan.co.id/news/industri',
    ],
  },
  {
    name: 'Bisnis.com',
    type: 'rss',
    urls: ['https://www.bisnis.com/rss'],
  },
  {
    name: 'CNBC Indonesia',
    type: 'rss',
    urls: ['https://www.cnbcindonesia.com/news/rss'],
  },
  {
    name: 'CNN Indonesia',
    type: 'rss',
    urls: [
      'https://www.cnnindonesia.com/ekonomi/rss',
      'https://www.cnnindonesia.com/nasional/rss',
    ],
  },
  {
    name: 'Serambi Indonesia (Aceh)',
    type: 'rss',
    urls: ['https://aceh.tribunnews.com/rss'],
  },
  {
    name: 'Waspada (Sumut)',
    type: 'rss',
    urls: ['https://waspada.id/feed/'],
  },
  {
    name: 'Haluan (Sumbar)',
    type: 'rss',
    urls: ['https://www.harianhaluan.com/rss'],
  },
  {
    name: 'Riau Pos (Riau)',
    type: 'rss',
    urls: ['https://riaupos.jawapos.com/rss'],
  },
  {
    name: 'Sriwijaya Post (Sumsel)',
    type: 'rss',
    urls: ['https://palembang.tribunnews.com/rss'],
  },
  {
    name: 'Warta Kota (DKI Jakarta)',
    type: 'rss',
    urls: ['https://wartakota.tribunnews.com/rss'],
  },
  {
    name: 'Pikiran Rakyat (Jabar)',
    type: 'rss',
    urls: ['https://www.pikiran-rakyat.com/rss'],
  },
  {
    name: 'Suara Merdeka (Jateng)',
    type: 'rss',
    urls: ['https://www.suaramerdeka.com/rss'],
  },
  {
    name: 'Kedaulatan Rakyat (DIY)',
    type: 'rss',
    urls: ['https://www.krjogja.com/rss'],
  },
  {
    name: 'Surya (Jatim)',
    type: 'rss',
    urls: ['https://suryamalang.tribunnews.com/rss'],
  },
  {
    name: 'Bali Post (Bali)',
    type: 'rss',
    urls: ['https://www.balipost.com/feed'],
  },
  {
    name: 'Pontianak Post (Kalbar)',
    type: 'rss',
    urls: ['https://pontianakpost.jawapos.com/rss'],
  },
  {
    name: 'Banjarmasin Post (Kalsel)',
    type: 'rss',
    urls: ['https://banjarmasin.tribunnews.com/rss'],
  },
  {
    name: 'Kaltim Post (Kaltim)',
    type: 'rss',
    urls: ['https://kaltimpost.jawapos.com/rss'],
  },
  {
    name: 'Fajar (Sulsel)',
    type: 'rss',
    urls: ['https://fajar.co.id/feed/'],
  },
  {
    name: 'Manado Post (Sulut)',
    type: 'rss',
    urls: ['https://manadopost.jawapos.com/rss'],
  },
  {
    name: 'Kabar Makassar',
    type: 'rss',
    urls: ['https://kabarmakassar.com/feed'],
  },
  {
    name: 'Katadata',
    type: 'rss',
    urls: ['https://katadata.co.id/rss'],
  },
  {
    name: 'Ambon Ekspres (Maluku)',
    type: 'rss',
    urls: ['https://ambonekspres.com/feed/'],
  },
  {
    name: 'Cenderawasih Pos (Papua)',
    type: 'rss',
    urls: ['https://www.ceposonline.com/feed/'],
  },
  // HTML-scraped outlets

  {
    name: 'Bloomberg Technoz',
    type: 'html',
    urls: ['https://www.bloombergtechnoz.com/'],
    selectors: {
      articleList: 'article, .cardItem, .news-card, .news-list-item',
      title: 'h2 a, h3 a, .card-title a, .title a',
      link: 'h2 a, h3 a, .card-title a, .title a',
      date: 'time, .date, .card-date',
      summary: 'p, .card-summary, .excerpt',
    },
  },
  {
    name: 'Jakarta Post',
    type: 'html',
    urls: ['https://www.thejakartapost.com/'],
    selectors: {
      articleList: 'article, .mostLatest, .listNews, .news-item',
      title: 'h2 a, h3 a, .titleNews a, .title a',
      link: 'h2 a, h3 a, .titleNews a, .title a',
      date: 'time, .dateNews, .date',
      summary: 'p, .desc, .synopsis',
    },
  },
  {
    name: 'IDN Financials',
    type: 'html',
    urls: ['https://www.idnfinancials.com/'],
    selectors: {
      articleList: 'article, .news-item, .card-news',
      title: 'h2 a, h3 a, .news-title a, a.title',
      link: 'h2 a, h3 a, .news-title a, a.title',
      date: 'time, .news-date, .date',
      summary: 'p, .news-summary, .excerpt',
    },
  },
  {
    name: 'Kumparan',
    type: 'html',
    urls: ['https://kumparan.com/'],
    selectors: {
      articleList: 'article, .cardItem, .news-card, .news-list-item, div[data-qa-id="news-item"]',
      title: 'h2 a, h3 a, .card-title a, .title a, span[data-qa-id="title"]',
      link: 'h2 a, h3 a, .card-title a, .title a, a[data-qa-id="title-link"]',
      date: 'time, .date, .card-date, span[data-qa-id="date"]',
      summary: 'p, .card-summary, .excerpt',
    },
  },
  {
    name: 'Tirto.id',
    type: 'html',
    urls: ['https://tirto.id/'],
    selectors: {
      articleList: 'article, .cardItem, .news-card, .news-list-item, .article-item',
      title: 'h2 a, h3 a, .card-title a, .title a, .article-title',
      link: 'h2 a, h3 a, .card-title a, .title a, .article-title a',
      date: 'time, .date, .card-date, .article-date',
      summary: 'p, .card-summary, .excerpt, .article-summary',
    },
  },
  {
    name: 'Detik.com',
    type: 'html',
    urls: ['https://www.detik.com/'],
    selectors: {
      articleList: 'article, .cardItem, .news-card, .news-list-item, .list-content article',
      title: 'h2 a, h3 a, .card-title a, .title a, .media__title a',
      link: 'h2 a, h3 a, .card-title a, .title a, .media__title a',
      date: 'time, .date, .card-date, .media__date',
      summary: 'p, .card-summary, .excerpt, .media__desc',
    },
  },
];

// ─── Labor / Employment Keywords (for filtering news) ────────────────────────
export const LABOR_KEYWORDS = [
  // Indonesian
  'ketenagakerjaan', 'tenaga kerja', 'pengangguran', 'phk',
  'pemutusan hubungan kerja', 'buruh', 'upah', 'gaji',
  'lowongan kerja', 'lapangan kerja', 'angkatan kerja',
  'pekerja', 'serikat pekerja', 'mogok', 'demo buruh',
  'outsourcing', 'alih daya', 'tki', 'pmi',
  'pekerja migran', 'bpjs ketenagakerjaan', 'jaminan sosial',
  'upah minimum', 'umk', 'umr', 'ump',
  'pelatihan kerja', 'produktivitas', 'pasar kerja',
  'job fair', 'naker', 'kemnaker', 'omnibus law',
  'cipta kerja', 'hubungan industrial', 'kontrak kerja',
  'pesangon', 'tunjangan', 'lembur', 'shift',
  'pabrik tutup', 'pabrik ditutup', 'pabrik relokasi',
  'efisiensi pegawai', 'rasionalisasi', 'pekerja formal',
  'pekerja informal', 'usaha formal', 'usaha informal',
  'wirausaha', 'membuka lapangan kerja', 'PRT', 'pembantu rumah tangga',
  'tenaga kerja indonesia', 'tenaga kerja asing', 'pekerja anak',
  'decent work', 'pekerjaan berbahaya', 'setengah penganggur', 'penganggur',
  'industri rumahan', 'maklun', 'industri rumah tangga', 'ekonomi baru',
  'freelancer', 'freelancing', 'remote worker', 'remote working',
  'pekerja kontrak', 'subkontrak', 'PKWT', 'PKWTT', 'jaminan kerja',
  'ijin usaha', 'kaki lima', 'asongan', 'rumahan', 'proyek pembangunan',
  'menyerap tenaga kerja', 'mengentaskan pengangguran', 'sakernas',
  // English (for Jakarta Post, IDN Financials)
  'labor', 'labour', 'employment', 'unemployment',
  'workforce', 'layoff', 'layoffs', 'job market',
  'minimum wage', 'worker', 'workers', 'strike',
  'retrenchment', 'hiring', 'recruitment', 'blue collar', 'white collar'
];

// ─── KBLI Sector Keyword Mapping ─────────────────────────────────────────────
export interface KBLISector {
  code: string;
  name: string;
  keywords: string[];
}

export const KBLI_SECTORS: KBLISector[] = [
  {
    code: 'a',
    name: 'A. Pertanian',
    keywords: ['pertanian', 'perkebunan', 'perikanan', 'kehutanan', 'sawit', 'karet', 'padi', 'nelayan', 'agriculture', 'farming', 'forestry', 'fishery'],
  },
  {
    code: 'b',
    name: 'B. Pertambangan & Penggalian',
    keywords: ['tambang', 'minerba', 'batu bara', 'nikel', 'mineral', 'smelter', 'hilirisasi', 'iwip', 'mining', 'galian'],
  },
  {
    code: 'c',
    name: 'C. Industri',
    keywords: ['manufaktur', 'pabrik', 'industri', 'garmen', 'tekstil', 'otomotif', 'elektronik', 'farmasi', 'amdk', 'manufacturing', 'factory'],
  },
  {
    code: 'd',
    name: 'D. Pengadaan Listrik & Gas',
    keywords: ['listrik', 'pln', 'gas', 'migas', 'energi', 'masela', 'electricity', 'power plant', 'pembangkit'],
  },
  {
    code: 'e',
    name: 'E. Treatment Air & Sampah',
    keywords: ['sampah', 'daur ulang', 'air bersih', 'limbah', 'pdam', 'sanitasi', 'water', 'waste'],
  },
  {
    code: 'f',
    name: 'F. Konstruksi',
    keywords: ['konstruksi', 'properti', 'infrastruktur', 'pembangunan', 'jalan tol', 'bandara', 'construction', 'building'],
  },
  {
    code: 'g',
    name: 'G. Perdagangan',
    keywords: ['perdagangan', 'retail', 'UMKM', 'ekspor', 'impor', 'e-commerce', 'toko', 'supermarket', 'marketplace', 'trade', 'wholesale'],
  },
  {
    code: 'h',
    name: 'H. Transportasi & Penyimpanan',
    keywords: ['transportasi', 'logistik', 'pelabuhan', 'bandara', 'kereta', 'penerbangan', 'tiket', 'kemenhub', 'kai', 'transport', 'logistics', 'shipping', 'aviation'],
  },
  {
    code: 'i',
    name: 'I. Akomodasi & Makan Minum',
    keywords: ['hotel', 'restoran', 'pariwisata', 'hospitality', 'wisata', 'makan minum', 'akomodasi', 'kuliner', 'tourism', 'restaurant', 'travel'],
  },
  {
    code: 'j',
    name: 'J. Penerbitan & Penyiaran',
    keywords: ['penerbitan', 'penyiaran', 'media', 'pers', 'jurnalis', 'berita', 'televisi'],
  },
  {
    code: 'k',
    name: 'K. Telekomunikasi & IT',
    keywords: ['teknologi', 'startup', 'digital', 'IT', 'telekomunikasi', 'tech', 'kecerdasan buatan', 'AI', 'software', 'internet'],
  },
  {
    code: 'l',
    name: 'L. Keuangan & Asuransi',
    keywords: ['perbankan', 'asuransi', 'fintech', 'keuangan', 'bank', 'OJK', 'kredit', 'unitlink', 'finance', 'insurance'],
  },
  {
    code: 'm',
    name: 'M. Real Estat',
    keywords: ['real estat', 'hunian', 'kpr', 'residensial', 'perkantoran', 'cbd', 'real estate', 'properti', 'apartemen', 'perumahan', 'housing'],
  },
  {
    code: 'no',
    name: 'N,O. Aktivitas Profesional & Perusahaan',
    keywords: ['profesional', 'konsultan', 'jasa perusahaan', 'outsourcing', 'alih daya', 'persewaan', 'consulting', 'service'],
  },
  {
    code: 'p',
    name: 'P. Administrasi Pemerintahan',
    keywords: ['pemerintahan', 'pns', 'asn', 'pppk', 'honorer', 'kementerian', 'pemda', 'birokrasi', 'government', 'civil servant'],
  },
  {
    code: 'q',
    name: 'Q. Pendidikan',
    keywords: ['pendidikan', 'guru', 'sekolah', 'kampus', 'dosen', 'universitas', 'education', 'school', 'university', 'teacher'],
  },
  {
    code: 'r',
    name: 'R. Kesehatan & Sosial',
    keywords: ['kesehatan', 'rumah sakit', 'klinik', 'dokter', 'nakes', 'sosial', 'perawat', 'farmasi', 'health', 'hospital', 'medical', 'pharmaceutical'],
  },
  {
    code: 'stuv',
    name: 'S-V. Jasa Lainnya',
    keywords: ['hiburan', 'event', 'jasa lainnya', 'kesenian', 'rekreasi', 'olahraga', 'seni', 'entertainment', 'sports', 'art', 'creative'],
  },
];

// ─── BPS Province Codes (38 Provinces) ───────────────────────────────────────
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

// ─── Gemini AI Summarizer ────────────────────────────────────────────────────
export const GEMINI = {
  model: 'gemini-2.0-flash',
  batchSize: 10,
  delayMs: 3000,
  dataDir: path.join(DATA_DIR, 'summaries'),
};

// ─── Ops Logger ──────────────────────────────────────────────────────────────
export const OPS = {
  dataDir: path.join(DATA_DIR, 'ops'),
};

// ─── News Aggregator ─────────────────────────────────────────────────────────
export const NEWS = {
  dataDir: path.join(DATA_DIR, 'news'),
};

// ─── Tier Schedule ───────────────────────────────────────────────────────────
export const TIERS = {
  daily: ['setkab', 'news-aggregator', 'gemini-summarize'],
  weekly: ['bps-html', 'kemenaker', 'google-trends-node', 'google-trends-py', 'bps-national', 'bps-provinsi'],
  monthly: ['bi-pmi', 'asean-nso', 'asean-fallback'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function timestamp(): string {
  return new Date().toISOString();
}

export function log(source: string, message: string): void {
  console.log(`[${timestamp()}] [${source}] ${message}`);
}

export function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(lower);
  });
}

export function getISOWeek(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((date.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function monthStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 7);
}

/**
 * Fetch with retry + timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = RATE_LIMIT.maxRetries,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RATE_LIMIT.timeoutMs);
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { ...FETCH_HEADERS, ...options.headers },
      });
      clearTimeout(timeout);
      if (!res.ok && attempt < retries) {
        log('fetch', `HTTP ${res.status} on ${url}, retry ${attempt}/${retries}`);
        await delay(RATE_LIMIT.defaultDelayMs * Math.pow(RATE_LIMIT.backoffMultiplier, attempt - 1));
        continue;
      }
      return res;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log('fetch', `Error on ${url}: ${lastError.message}, retry ${attempt}/${retries}`);
      if (attempt < retries) {
        await delay(RATE_LIMIT.defaultDelayMs * Math.pow(RATE_LIMIT.backoffMultiplier, attempt - 1));
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ensureDir(dirPath: string): void {
  const fs = require('fs');
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJSON(filePath: string, data: unknown): void {
  const fs = require('fs');
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  log('io', `Wrote ${filePath}`);
}

export function readJSON<T = unknown>(filePath: string): T | null {
  const fs = require('fs');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Tag text with matching KBLI sectors
 */
export function tagKBLI(text: string): { code: string; name: string }[] {
  const lower = text.toLowerCase();
  const hasWord = (word: string, text: string) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  };
  return KBLI_SECTORS
    .filter((s) => s.keywords.some((kw) => hasWord(kw, lower)))
    .map((s) => ({ code: s.code, name: s.name }));
}
