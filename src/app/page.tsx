import { getSamplePMIData, getSamplePHKData, getSampleNewsData, getSampleMetadata, getSampleSummaries, getSampleBPSData } from '@/lib/data-loader';
import { getASEANHistoricalData, getBPSNationalData, getBPSProvinsiData, getPHKArticles, getNewsData, getBPSHistoricalData } from '@/lib/data-loader-server';
import { formatNumber, formatPercent, getImpactBadge } from '@/lib/utils';
import StatCard from '@/components/cards/StatCard';
import NewsCard from '@/components/cards/NewsCard';
import SourceStatusCard from '@/components/cards/SourceStatusCard';
import LineChart from '@/components/charts/LineChart';
import { NEWS_SOURCES } from '@/lib/constants';
import { TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react';

export default async function IkhtisarPage() {
  const nationalRes = getBPSNationalData();
  const provinsiRes = getBPSProvinsiData();
  const kemenakerPHK = getPHKArticles();
  const realNews = getNewsData();

  const bpsData = nationalRes ? nationalRes.data : getSampleBPSData();
  const bpsSource = nationalRes ? nationalRes.source : 'static_seed';
  
  const tptData = provinsiRes ? provinsiRes.data : [];
  const tptSource = provinsiRes ? provinsiRes.source : 'fallback_spreadsheet';

  const pmiData = getSamplePMIData();
  const phkData = getSamplePHKData();
  const newsData = realNews.length > 0 ? realNews : getSampleNewsData();
  const metadata = getSampleMetadata();
  const summaries = getSampleSummaries();
  const historicalData = await getASEANHistoricalData();
  const bpsHistorical = getBPSHistoricalData();

  // Pivot historical data for Indonesia
  let indoChartData: any[] = [];
  let chartSourceLabel = "World Bank / ILO";
  let chartSourceUrl = historicalData?._source_url || "#";

  if (bpsHistorical && bpsHistorical.data.length > 0) {
    chartSourceLabel = "BPS (Survei Angkatan Kerja Nasional)";
    chartSourceUrl = bpsHistorical._source_url || "https://www.bps.go.id";
    indoChartData = bpsHistorical.data.map(d => ({
      year: d.year,
      'Pengangguran (%)': d.tpt,
      'TPAK (%)': d.tpak,
    }));
  } else if (historicalData) {
    const indoHist = historicalData.countries.find(c => c.countryName === 'Indonesia');
    if (indoHist) {
      const uemData = indoHist.indicators['SL.UEM.TOTL.ZS']?.values || [];
      const lfprData = indoHist.indicators['SL.TLF.CACT.ZS']?.values || [];
      
      const years = Array.from(new Set([...uemData.map(d => d.year), ...lfprData.map(d => d.year)]))
        .sort();
        
      indoChartData = years.map(year => ({
        year,
        'Pengangguran (%)': uemData.find(d => d.year === year)?.value || null,
        'TPAK (%)': lfprData.find(d => d.year === year)?.value || null,
      }));
    }
  }

  // Filter general PHK news
  const generalPHK = realNews.filter(n => 
    n.keywords_matched?.some((k: string) => k.toLowerCase() === 'phk' || k.toLowerCase().includes('pemutusan hubungan kerja'))
  );

  // Extract latest values
  const latestIHK = bpsData.find((d) => d.indicator === 'ihk');
  const latestPMI = pmiData[0];
  const latestPHK = phkData[0];

  // Find real national TPT (province code '00')
  const nationalTptRecord = tptData.find(p => p.province_code === '00');
  let tptValue = 4.82; // fallback
  let tptPeriod = "Rilis: Mei 2026 (Survei: Feb 2026)";
  let tptChange = undefined;

  if (nationalTptRecord) {
    tptValue = nationalTptRecord.tpt_feb_26 !== null ? nationalTptRecord.tpt_feb_26 : 4.82;
    tptPeriod = `Rilis: Feb 2026 (TPT: ${formatNumber(tptValue, 2)}%)`;
    if (nationalTptRecord.tpt_feb_26 !== null && nationalTptRecord.tpt_feb_25 !== null) {
      const diff = parseFloat((nationalTptRecord.tpt_feb_26 - nationalTptRecord.tpt_feb_25).toFixed(2));
      tptChange = {
        value: diff,
        label: `${diff > 0 ? '+' : ''}${formatNumber(diff, 2)} pp YoY`,
        direction: diff > 0 ? ('down' as const) : diff < 0 ? ('up' as const) : ('neutral' as const),
      };
    }
  }

  // Sparkline data for IHK
  const ihkSpark = bpsData
    .filter((d) => d.indicator === 'ihk')
    .reverse()
    .map((d) => ({ value: d.value || 0 }));

  // Sparkline data for PMI
  const pmiSpark = pmiData
    .slice()
    .reverse()
    .map((d) => ({ value: d.pmi_value }));

  // Latest 5 news
  const latestNews = newsData.slice(0, 5);

  // Source status entries
  const sourceEntries = Object.values(metadata.sources);

  const showWarning = bpsSource === 'static_seed' || tptSource === 'fallback_spreadsheet';

  return (
    <div className="space-y-6">
      {/* Fallback Warning Banner */}
      {showWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md text-sm text-amber-800 shadow-sm">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block">Pemberitahuan Sumber Data Cadangan (Fallback Active)</span>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {bpsSource === 'static_seed' && '• Menampilkan data indikator nasional (IHK) dari cadangan statis lokal karena API BPS tidak terjangkau.'}
                {bpsSource === 'static_seed' && tptSource === 'fallback_spreadsheet' && <br />}
                {tptSource === 'fallback_spreadsheet' && '• Menampilkan data TPT tingkat nasional/provinsi dari Google Spreadsheet cadangan karena API BPS tidak terjangkau.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="IHK (Inflasi MtM)"
          value={latestIHK?.change_mom !== undefined ? `${latestIHK.change_mom > 0 ? '+' : ''}${formatNumber(latestIHK.change_mom, 2)}%` : '-'}
          subtitle={`Rilis: ${latestIHK?.period}`}
          change={
            latestIHK?.change_mom !== undefined
              ? {
                  value: latestIHK.change_mom,
                  label: `${latestIHK.change_mom > 0 ? '+' : ''}${formatNumber(latestIHK.change_mom, 2)}% MtM`,
                  direction: latestIHK.change_mom > 0 ? 'up' : latestIHK.change_mom < 0 ? 'down' : 'neutral',
                }
              : undefined
          }
          sparkData={ihkSpark}
          sparkColor="#F59E0B"
          sourceUrl={latestIHK?._source_url || "https://www.bps.go.id/id/pressrelease"}
          icon={<DollarSign className="w-4 h-4" />}
          info={{
            arti: "Indeks Harga Konsumen (IHK) mengukur rata-rata perubahan harga sekumpulan barang dan jasa yang dikonsumsi rumahtangga. Angka MtM menunjukkan inflasi bulanan.",
            sumber: bpsSource === 'official_api' ? "API BPS Resmi" : "Cadangan Statis",
            periodik: "Bulanan"
          }}
        />
        <StatCard
          title="PMI Manufaktur"
          value={formatNumber(latestPMI.pmi_value, 1)}
          subtitle={`Rilis: ${latestPMI.period}`}
          change={{
            value: latestPMI.pmi_value - 50,
            label: latestPMI.pmi_value > 50 ? 'Ekspansi' : 'Kontraksi',
            direction: latestPMI.pmi_value > 50 ? 'up' : 'down',
          }}
          sparkData={pmiSpark}
          sparkColor={latestPMI.pmi_value >= 50 ? '#10B981' : '#EF4444'}
          sourceUrl={latestPMI._source_url || "https://www.bi.go.id"}
          icon={<BarChart3 className="w-4 h-4" />}
          info={{
            arti: "Purchasing Managers' Index (PMI) adalah indikator aktivitas ekonomi sektor manufaktur. Angka di atas 50 berarti sektor manufaktur sedang ekspansi, di bawah 50 berarti kontraksi.",
            sumber: "Bank Indonesia / S&P Global",
            periodik: "Bulanan"
          }}
        />
        <StatCard
          title="PHK Terkini"
          value={latestPHK?.workers_affected ? formatNumber(latestPHK.workers_affected) : '-'}
          subtitle="Data Berjalan 2026"
          change={{
            value: -1,
            label: `${phkData.length} laporan`,
            direction: 'down',
          }}
          sourceUrl={latestPHK?._source_url || "https://kemnaker.go.id"}
          icon={<Users className="w-4 h-4" />}
          info={{
            arti: "Jumlah tenaga kerja yang terkena Pemutusan Hubungan Kerja (PHK) secara nasional berdasarkan laporan dari dinas ketenagakerjaan daerah dan provinsi.",
            sumber: "Kementerian Ketenagakerjaan (Kemenaker)",
            periodik: "Berkala (Harian/Bulanan)"
          }}
        />
        <StatCard
          title="TPT (Pengangguran)"
          value={formatPercent(tptValue)}
          subtitle={tptPeriod}
          change={tptChange}
          sourceUrl="https://www.bps.go.id"
          icon={<TrendingUp className="w-4 h-4" />}
          info={{
            arti: "Tingkat Pengangguran Terbuka (TPT) adalah persentase jumlah pengangguran terhadap jumlah total angkatan kerja. Indikator utama kesehatan pasar kerja.",
            sumber: tptSource === 'official_api' ? "API BPS Resmi" : "Spreadsheet Fallback",
            periodik: "Semesteran (Februari & Agustus)"
          }}
        />
      </div>

      {/* Main Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Official Data Trend - TPT */}
          {indoChartData.length > 0 && (
            <div className="bg-white border-2 border-gray-900 rounded-none p-4">
              <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-2">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Tren Pengangguran Terbuka (TPT)</h2>
                <a href={chartSourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0D9488] hover:underline">
                  Sumber: {chartSourceLabel} ↗
                </a>
              </div>
              <div className="h-[250px]">
                <LineChart
                  data={indoChartData}
                  xKey="year"
                  lines={[
                    { dataKey: 'Pengangguran (%)', label: 'Pengangguran (%)', color: '#EF4444' }
                  ]}
                  height={250}
                />
              </div>
            </div>
          )}

          {/* Official Data Trend - TPAK */}
          {indoChartData.length > 0 && (
            <div className="bg-white border-2 border-gray-900 rounded-none p-4">
              <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-2">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Tren Partisipasi Angkatan Kerja (TPAK)</h2>
                <a href={chartSourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0D9488] hover:underline">
                  Sumber: {chartSourceLabel} ↗
                </a>
              </div>
              <div className="h-[250px]">
                <LineChart
                  data={indoChartData}
                  xKey="year"
                  lines={[
                    { dataKey: 'TPAK (%)', label: 'TPAK (%)', color: '#0D9488' }
                  ]}
                  height={250}
                />
              </div>
            </div>
          )}

          {/* News Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Berita Terkini</h2>
              <a href="/berita" className="text-sm text-[#0D9488] hover:text-[#14B8A6] font-medium">
                Lihat Semua →
              </a>
            </div>
            <div className="space-y-3">
              {latestNews.map((article) => {
                const sourceInfo = NEWS_SOURCES.find((s) => s.id === article.source);
                const summary = summaries.find((s) => s.article_id === article.id);
                const impact = summary ? getImpactBadge(summary.dampak_tenaga_kerja) : undefined;

                return (
                  <NewsCard
                    key={article.id}
                    title={article.title}
                    date={article.date}
                    source={article.source}
                    sourceName={article.source_name}
                    sourceColor={sourceInfo?.color}
                    excerpt={article.excerpt}
                    sectorTags={article.sector_tags}
                    impactBadge={impact}
                    summary={summary?.ringkasan}
                    url={article._source_url}
                    isEstimated={article.is_estimated}
                  />
                );
              })}
            </div>
          </div>

          {/* Rilis PHK Resmi Kemenaker */}
          <div className="bg-white border-2 border-gray-900 rounded-none p-4">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-2">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                Rilis PHK Resmi Kemenaker
              </h2>
              <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                {kemenakerPHK.length} Rilis
              </span>
            </div>
            {kemenakerPHK.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Tidak ada rilis resmi Kemenaker yang terdeteksi.</p>
            ) : (
              <div className="space-y-4">
                {kemenakerPHK.slice(0, 5).map((article, idx) => (
                  <div key={idx} className="border-b border-gray-100 last:border-0 pb-3.5 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Kemnaker Resmi
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {article.date}
                      </span>
                    </div>
                    <a 
                      href={article.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm font-semibold text-gray-900 hover:text-[#0D9488] hover:underline leading-snug block mb-1"
                    >
                      {article.title}
                    </a>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Berita PHK Umum */}
          <div className="bg-white border-2 border-gray-900 rounded-none p-4">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-2">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                Berita PHK Nasional
              </h2>
              <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                {generalPHK.length} Berita
              </span>
            </div>
            {generalPHK.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Tidak ada berita PHK yang terdeteksi.</p>
            ) : (
              <div className="space-y-4">
                {generalPHK.slice(0, 5).map((article, idx) => {
                  const sourceInfo = NEWS_SOURCES.find((s) => s.id === article.source);
                  return (
                    <div key={idx} className="border-b border-gray-100 last:border-0 pb-3.5 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ color: sourceInfo?.color }}>
                          {article.source_name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(article.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <a 
                        href={article._source_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm font-semibold text-gray-900 hover:text-[#0D9488] hover:underline leading-snug block mb-1"
                      >
                        {article.title}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
