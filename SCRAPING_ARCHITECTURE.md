# Arsitektur Scraping Ketenagakerjaan

Dokumen ini mencatat seluruh daftar sumber berita, jaringan regional, dan kata kunci yang digunakan oleh sistem *scraper* (baik harian maupun historis).

## 1. Daftar Sumber Berita & Domain Jaringan

Sistem memantau **26+ domain berita** (Nasional dan Regional). 

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
- **Gaji & Kompensasi**: `upah`, `gaji`, `upah minimum`, `UMP`, `UMR`, `UMK`, `pesangon`
- **Rekrutmen**: `lowongan`, `loker`, `rekrutmen`, `lapangan kerja`, `pencari kerja`, `mencari kerja`
- **Aktivitas Pekerja/Industri**: `demo buruh`, `mogok kerja`, `serikat pekerja`, `padat karya`
- **Kondisi Perusahaan**: `PMA`, `investasi`, `pembangunan pabrik`, `usaha`, `pabrik tutup`, `bangkrut`
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
