import assert from 'node:assert/strict';
import {
  extractPublicationDayFromUrl,
  isPlausibleNewsPublicationDate,
  isRealPublisherUrl,
  normalizeNewsTitle,
} from '../../src/lib/news-quality';

assert.equal(isRealPublisherUrl('https://news.google.com/rss/articles/example'), false);
assert.equal(isRealPublisherUrl('https://example.com/news/article'), true);
assert.equal(
  extractPublicationDayFromUrl('https://riaupos.jawapos.com/riau/1110110020/example'),
  '2011-10-11',
);
assert.equal(
  extractPublicationDayFromUrl('https://example.com/2026/06/25/article'),
  '2026-06-25',
);
assert.equal(
  extractPublicationDayFromUrl('https://www.cnnindonesia.com/ekonomi/20260624171430-95-1/article'),
  '2026-06-24',
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2026-06-25T04:00:00.000Z',
    'https://example.com/2026/06/25/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  true,
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2010-02-04T08:00:00.000Z',
    'https://example.com/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  false,
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2026-06-25T04:00:00.000Z',
    'https://example.com/2026/06/24/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  false,
);
assert.equal(
  normalizeNewsTitle('PHK Buruh Besar-besaran - Contoh Media'),
  'phk buruh besar besaran',
);

console.log('news quality tests passed');

// ─── Foreign-context filter ─────────────────────────────────────────────────
import { isForeignOnlyNews, hasDomesticContext } from '../../src/lib/news-quality';

// Kasus nyata dari arsip: berita asing berkata-kunci ketenagakerjaan → tolak
assert.equal(
  isForeignOnlyNews(
    'Sosok Andy Burnham Calon Perdana Menteri Inggris, Perjalanan Sang Raja Utara Menuju Puncak Kekuasaan',
  ),
  true,
);
assert.equal(
  isForeignOnlyNews('16 Ribu Karyawan Amazon Kena PHK, Sulit Cari Kerja di Tengah Gelombang AI'),
  true,
);
assert.equal(
  isForeignOnlyNews('Amazon, Google, Meta, dan Microsoft Kompak Investasi Teknologi Ramah Lingkungan'),
  true,
);
assert.equal(
  isForeignOnlyNews('50 Ribu Pekerja Volkswagen Terancam PHK di Tengah Tekanan Bisnis'),
  true,
);

// Sudut pandang domestik → pertahankan
assert.equal(isForeignOnlyNews('PHK Massal di Pabrik Tekstil Karawang, 2.000 Buruh Dirumahkan'), false);
assert.equal(isForeignOnlyNews('Utang Luar Negeri RI Tembus Rp8.030 Triliun pada Mei 2026'), false);
assert.equal(
  isForeignOnlyNews('Pekerja Migran Indonesia di Malaysia Tuntut Perlindungan Upah'),
  false,
);
assert.equal(
  isForeignOnlyNews('IMF Pertahankan Proyeksi Pertumbuhan Ekonomi Indonesia di 5 Persen'),
  false,
);
assert.equal(isForeignOnlyNews('Toyota Tambah Investasi Pabrik di Karawang, Serap 5.000 Pekerja'), false);
// Tanpa penanda asing sama sekali → pertahankan (jangan agresif)
assert.equal(isForeignOnlyNews('Kemnaker Buka Pendaftaran Magang Nasional Angkatan II'), false);

// Penanda rupiah dihitung sebagai konteks domestik
assert.equal(hasDomesticContext('Harga Minyakita di Atas HET Rp15.700 per Liter'), true);
// "ri" tidak boleh cocok di dalam kata lain
assert.equal(hasDomesticContext('industri berdiri sendiri'), false);

console.log('foreign-context filter tests passed');
