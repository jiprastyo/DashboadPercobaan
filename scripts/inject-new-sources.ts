import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');

const MOCK_NEW_SOURCES = [
  {
    id: "kumparan-1",
    title: "Badai PHK Start-up Berlanjut, Ribuan Karyawan Terdampak Sepanjang 2026",
    date: "2026-05-15",
    source: "kumparan",
    source_name: "Kumparan",
    excerpt: "Gelombang pemutusan hubungan kerja (PHK) di perusahaan rintisan atau start-up masih terjadi di paruh pertama 2026.",
    sector_tags: ["k"],
    keywords_matched: ["PHK", "tenaga kerja"],
    _source_url: "https://kumparan.com/news/1",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "tirto-1",
    title: "Mencari Solusi Pengangguran Gen Z di Tengah Tren 'Gig Economy'",
    date: "2026-04-20",
    source: "tirto",
    source_name: "Tirto.id",
    excerpt: "Tren ekonomi pekerja lepas (gig economy) memberikan fleksibilitas bagi Gen Z, namun di sisi lain tidak memberikan jaminan kesehatan dan pesangon.",
    sector_tags: ["stuv"],
    keywords_matched: ["pengangguran", "angkatan kerja", "pesangon"],
    _source_url: "https://tirto.id/news/1",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "detik-1",
    title: "Pabrik Tekstil di Jawa Barat Tutup, 5.000 Buruh Tuntut Pesangon",
    date: "2026-06-01",
    source: "detik",
    source_name: "Detik.com",
    excerpt: "Kondisi industri tekstil yang lesu memaksa salah satu pabrik besar di Jawa Barat menghentikan operasinya secara permanen.",
    sector_tags: ["c"],
    keywords_matched: ["pabrik tutup", "pesangon", "PHK"],
    _source_url: "https://www.detik.com/news/1",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "kumparan-2",
    title: "Investasi Manufaktur Naik, Serap 50 Ribu Tenaga Kerja Baru",
    date: "2026-05-25",
    source: "kumparan",
    source_name: "Kumparan",
    excerpt: "Kementerian Investasi mencatat kenaikan signifikan pada realisasi investasi sektor manufaktur yang diproyeksi menyerap puluhan ribu tenaga kerja lokal.",
    sector_tags: ["c"],
    keywords_matched: ["investasi", "menyerap tenaga kerja", "tenaga kerja"],
    _source_url: "https://kumparan.com/news/2",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "detik-2",
    title: "UMR 2026 Ditetapkan, Buruh Anggap Masih Kurang Layak",
    date: "2026-03-10",
    source: "detik",
    source_name: "Detik.com",
    excerpt: "Penetapan Upah Minimum Regional (UMR) 2026 diwarnai protes dari serikat pekerja yang menganggap kenaikannya tidak sebanding dengan inflasi.",
    sector_tags: ["c"],
    keywords_matched: ["UMR", "upah minimum", "serikat pekerja"],
    _source_url: "https://www.detik.com/news/2",
    _scraped_at: new Date().toISOString()
  }
];

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database file not found:', DB_FILE);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  
  // Append mock data
  const updatedData = [...data, ...MOCK_NEW_SOURCES];
  
  // Sort by date (descending)
  updatedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  fs.writeFileSync(DB_FILE, JSON.stringify(updatedData, null, 2));
  console.log(`Successfully injected ${MOCK_NEW_SOURCES.length} articles from Detik, Kumparan, Tirto.`);
}

main();
