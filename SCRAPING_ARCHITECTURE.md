# Arsitektur Scraping Ketenagakerjaan

Dokumen ini mencatat seluruh daftar sumber berita, jaringan regional, dan kata kunci yang digunakan oleh sistem *scraper* (baik harian maupun historis).

## 1. Daftar Sumber Berita & Domain Jaringan

Sistem memantau **26+ domain berita** (Nasional dan Regional). 

### BPS Berita Resmi Statistik (BRS)

Selain sumber berita umum, sistem juga memantau BRS BPS melalui Web API `model/pressrelease` pada domain nasional `0000`. Jalur ini dipakai untuk menyimpan tautan PDF Bahasa Indonesia langsung dari field `pdf`, bukan hanya halaman detail BPS.

Rencana cakupan BRS resmi:

- **Ketenagakerjaan**: `ketenagakerjaan`, `pengangguran`, `angkatan kerja`, `sakernas`, `tpak`, `tpt`
- **Kemiskinan dan ketimpangan**: `kemiskinan`, `penduduk miskin`, `gini ratio`, `ketimpangan`
- **Pertumbuhan ekonomi / PDB**: `pdb`, `pertumbuhan ekonomi`, `produk domestik bruto`, `ekonomi indonesia`
- **Nilai Tukar Petani (NTP)**: `ntp`, `nilai tukar petani`
- **Wisatawan mancanegara**: `wisman`, `wisatawan mancanegara`, `kunjungan wisatawan`
- **Ekspor-impor**: `ekspor`, `impor`, `neraca perdagangan`, `perdagangan luar negeri`

Setiap hasil BRS harus menyimpan `title`, `rl_date`, `summary`, `indicator`, `link`, `_source_url`, dan `_scraped_at`. `link` dan `_source_url` diutamakan sebagai URL langsung `https://webapi.bps.go.id/download.php?f=...` yang membuka PDF BRS. Untuk PDB dan pertumbuhan ekonomi, gunakan slug kanonis `pertumbuhan-ekonomi` agar judul BPS yang memakai variasi istilah tetap masuk ke satu bucket.

Rencana produk untuk BRS adalah menu khusus yang menampung seluruh rilis BRS tersebut secara kronologis. Tampilan utama berupa daftar rilis terbaru-ke-terlama, sementara sidebar menyediakan filter tahun dan tipe BRS (`ketenagakerjaan`, `kemiskinan`, `pertumbuhan-ekonomi`, `ntp`, `wisman`, `ekspor-impor`). Setiap item harus menampilkan tanggal rilis resmi, judul, tipe BRS, ringkasan pendek, dan tautan PDF langsung.

Strategi scraping BRS harus hemat terhadap batas/limit BPS. Prioritaskan incremental refresh untuk tahun berjalan dan tahun sebelumnya, hentikan pagination ketika halaman sudah tidak menghasilkan item baru yang relevan, dan simpan checkpoint per tahun/halaman agar backfill lama tidak mengulang seluruh arsip. Backfill historis dilakukan bertahap per tahun dengan jeda dan dedupe berbasis URL PDF atau ID rilis, bukan dengan sweep tak terbatas.

### Jaringan Media Nasional (Networks)
Sistem melakukan *deep-search* ke seluruh subdomain di bawah jaringan raksasa ini:
1. **Tribun Network** (`tribunnews.com`) - Mencakup seluruh portal provinsi Tribun.
2. **Jawa Pos Group** (`jawapos.com`) - Mencakup jaringan Radar.
3. **PRMN / Pikiran Rakyat** (`pikiran-rakyat.com`) - Mencakup portal mitra PRMN.
4. **Promedia Network** (`ayobandung.com`, dll).

### Portal Ekonomi & Berita Nasional
1. **Kontan** (`kontan.co.id`)
2. **Bisnis.com** (`bisnis.com`)
3. **Katadata** (`katadata.co.id`)
4. **CNBC Indonesia** (`cnbcindonesia.com`)
5. **CNN Indonesia** (`cnnindonesia.com`)
6. **Bloomberg Technoz** (`bloombergtechnoz.com`)
7. **Jakarta Post** (`thejakartapost.com`)
8. **IDN Financials** (`idnfinancials.com`)

### Portal Regional / Spesifik Provinsi
1. **Serambi Indonesia** (Aceh)
2. **Waspada** (Sumatera Utara)
3. **Haluan** (Sumatera Barat)
4. **Riau Pos** (Riau)
5. **Sriwijaya Post** (Sumsel)
6. **Warta Kota** (DKI Jakarta)
7. **Kabar Banten** (Banten)
8. **Pikiran Rakyat** (Jawa Barat)
9. **Suara Merdeka** (Jawa Tengah)
10. **Kedaulatan Rakyat** (DIY)
11. **Surya** (Jawa Timur)
12. **Bali Post** (Bali)
13. **Pontianak Post** (Kalimantan Barat)
14. **Banjarmasin Post** (Kalimantan Selatan)
15. **Kaltim Post** (Kalimantan Timur)
16. **Fajar** (Sulawesi Selatan)
17. **Kabar Makassar** (Sulawesi Selatan)
18. **Manado Post** (Sulawesi Utara)
19. **Ambon Ekspres** (Maluku)
20. **Cenderawasih Pos** (Papua)

---

## 2. Kata Kunci Ketenagakerjaan (Labor Keywords)

Ini adalah kata kunci utama (akar) yang digunakan untuk mendeteksi berita yang relevan dengan isu ketenagakerjaan:

- **Inti**: `PHK`, `tenaga kerja`, `pengangguran`, `angkatan kerja`, `ketenagakerjaan`, `pemutusan hubungan kerja`
- **Tipe Pekerja**: `pekerja formal`, `pekerja informal`, `blue collar`, `white collar`, `PRT`, `pembantu rumah tangga`, `TKI`, `tenaga kerja indonesia`, `tenaga kerja asing`, `pekerja anak`, `freelancer`, `freelancing`, `remote worker`, `remote working`, `pekerja kontrak`, `subkontrak`, `PKWT`, `PKWTT`, `kaki lima`, `asongan`, `rumahan`
- **Gaji & Kondisi Kerja**: `upah`, `gaji`, `upah minimum`, `UMP`, `UMR`, `UMK`, `pesangon`, `decent work`, `pekerjaan berbahaya`, `jaminan kerja`
- **Rekrutmen**: `lowongan`, `loker`, `rekrutmen`, `lapangan kerja`, `pencari kerja`, `mencari kerja`, `membuka lapangan kerja`, `menyerap tenaga kerja`
- **Status & Aktivitas**: `demo buruh`, `mogok kerja`, `serikat pekerja`, `padat karya`, `setengah penganggur`, `penganggur`, `mengentaskan pengangguran`
- **Kondisi Perusahaan**: `PMA`, `investasi`, `pembangunan pabrik`, `proyek pembangunan`, `usaha`, `ijin usaha`, `usaha formal`, `usaha informal`, `wirausaha`, `pabrik tutup`, `bangkrut`, `industri rumahan`, `maklun`, `industri rumah tangga`, `outsourcing`, `ekonomi baru`
- **Program Pemerintah**: `JKP`, `kartu prakerja`, `BPJS Ketenagakerjaan`

---

## 3. Kata Kunci Sektoral (KBLI)

Setiap artikel berita akan dikategorikan secara otomatis ke dalam salah satu dari 18 Sektor KBLI berdasarkan kemunculan kata kunci turunan berikut:

- **A. Pertanian**: `pertanian`, `perkebunan`, `perikanan`, `kehutanan`, `sawit`, `karet`, `padi`, `nelayan`
- **B. Pertambangan**: `tambang`, `minerba`, `batu bara`, `nikel`, `mineral`, `smelter`, `hilirisasi`, `iwip`
- **C. Industri**: `manufaktur`, `pabrik`, `industri`, `garmen`, `tekstil`, `otomotif`, `elektronik`, `farmasi`, `amdk`
- **D. Pengadaan Listrik**: `listrik`, `pln`, `gas`, `migas`, `energi`, `masela`
- **E. Treatment Air & Sampah**: `sampah`, `daur ulang`, `air bersih`, `limbah`
- **F. Konstruksi**: `konstruksi`, `properti`, `infrastruktur`, `pembangunan`, `jalan tol`, `bandara`
- **G. Perdagangan**: `perdagangan`, `retail`, `UMKM`, `ekspor`, `impor`, `e-commerce`
- **H. Transportasi**: `transportasi`, `logistik`, `pelabuhan`, `bandara`, `kereta`, `penerbangan`, `tiket`, `kemenhub`, `kai`
- **I. Akomodasi**: `hotel`, `restoran`, `pariwisata`, `hospitality`, `wisata`, `makan minum`, `akomodasi`
- **J. Penerbitan & Penyiaran**: `penerbitan`, `penyiaran`, `media`, `pers`, `jurnalis`, `berita`, `televisi`
- **K. Telekomunikasi & IT**: `teknologi`, `startup`, `digital`, `IT`, `telekomunikasi`, `tech`, `kecerdasan buatan`, `AI`
- **L. Keuangan & Asuransi**: `perbankan`, `asuransi`, `fintech`, `keuangan`, `bank`, `OJK`, `kredit`, `unitlink`
- **M. Real Estat**: `real estat`, `hunian`, `kpr`, `residensial`, `perkantoran`, `cbd`
- **N,O. Profesional & Perusahaan**: `profesional`, `konsultan`, `jasa perusahaan`, `outsourcing`
- **P. Administrasi Pemerintahan**: `pemerintahan`, `pns`, `asn`, `pppk`, `honorer`, `kementerian`, `pemda`
- **Q. Pendidikan**: `pendidikan`, `guru`, `sekolah`, `kampus`, `dosen`, `universitas`
- **R. Kesehatan & Sosial**: `kesehatan`, `rumah sakit`, `klinik`, `dokter`, `nakes`, `sosial`
- **S-V. Jasa Lainnya**: `hiburan`, `event`, `jasa lainnya`, `kesenian`, `rekreasi`
