import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'news', 'historical-seed.json');

const TODAY_NEWS = [
  {
    id: "bisnis-morning-1",
    title: "Menaker Tegaskan Aturan Baru BPJS Ketenagakerjaan Berlaku Penuh Bulan Depan",
    date: "2026-06-08T07:15:00Z",
    source: "bisnis",
    source_name: "Bisnis.com",
    excerpt: "Kementerian Ketenagakerjaan mengonfirmasi bahwa penyesuaian iuran dan manfaat BPJS Ketenagakerjaan akan mulai berlaku secara nasional pada awal Juli 2026.",
    sector_tags: ["p"],
    keywords_matched: ["BPJS Ketenagakerjaan", "ketenagakerjaan"],
    _source_url: "https://www.bisnis.com/news/1",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "cnbc-morning-1",
    title: "Data BPS Pagi Ini: Tingkat Pengangguran Terbuka Turun Tipis ke 4.8%",
    date: "2026-06-08T08:30:00Z",
    source: "cnbc",
    source_name: "CNBC Indonesia",
    excerpt: "Laporan terbaru BPS menunjukkan penurunan tingkat pengangguran seiring dengan membaiknya penyerapan tenaga kerja di sektor manufaktur dan ritel.",
    sector_tags: ["c", "g"],
    keywords_matched: ["pengangguran", "tenaga kerja"],
    _source_url: "https://www.cnbcindonesia.com/news/1",
    _scraped_at: new Date().toISOString()
  },
  {
    id: "jp-morning-1",
    title: "Tech Industry Rebound: Major Startups Announce New Hiring Initiatives",
    date: "2026-06-08T09:00:00Z",
    source: "jakpost",
    source_name: "Jakarta Post",
    excerpt: "After a rough year of layoffs, the local tech ecosystem is showing signs of recovery with several major unicorns opening up thousands of new job vacancies.",
    sector_tags: ["k"],
    keywords_matched: ["layoff", "hiring", "job market"],
    _source_url: "https://www.thejakartapost.com/news/1",
    _scraped_at: new Date().toISOString()
  }
];

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database file not found:', DB_FILE);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  
  const updatedData = [...data, ...TODAY_NEWS];
  updatedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  fs.writeFileSync(DB_FILE, JSON.stringify(updatedData, null, 2));
  console.log(`Successfully injected ${TODAY_NEWS.length} new articles for this morning.`);
}

main();
