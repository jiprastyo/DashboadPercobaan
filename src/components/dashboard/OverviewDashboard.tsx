import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import DataNotice from '@/components/dashboard/DataNotice';
import EditorialPageShell from '@/components/layout/EditorialPageShell';
import type { OverviewDashboardData } from '@/lib/overview-data';
import { formatDate, formatNumber, formatPercent, truncateText } from '@/lib/utils';

interface OverviewDashboardProps {
  data: OverviewDashboardData;
}

function SectionHeading({
  id,
  title,
  meta,
  href,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  href?: string;
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-2 border-b border-[var(--app-border)] px-3 py-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <h2 className="text-base font-semibold text-[var(--app-text)]">
        {href ? (
          <Link href={href} className="hover:text-[var(--app-link)] hover:underline focus-visible:app-focus">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      {meta ? <div className="text-xs text-[var(--app-subtle)]">{meta}</div> : null}
    </div>
  );
}

function DataRow({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const content = (
    <div className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-start">
      <div className="text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">{label}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--app-text)]">{value}</div>
        {note ? <div className="mt-0.5 text-xs text-[var(--app-muted)]">{note}</div> : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition hover:bg-[var(--app-bg-soft)] focus-visible:app-focus"
    >
      {content}
    </a>
  );
}

export default function OverviewDashboard({ data }: OverviewDashboardProps) {
  const researchRows = data.researchEntries.slice(0, 6);
  const aseanRows = data.aseanSnapshot
    .slice()
    .sort(
      (a, b) =>
        (a.indicators.unemployment_rate?.value ?? Number.POSITIVE_INFINITY) -
        (b.indicators.unemployment_rate?.value ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, 6);

  const summaryRows = [
    {
      label: 'TPT Indonesia',
      value: formatPercent(data.tptValue),
      note: data.tptPeriod,
      href: 'https://www.bps.go.id',
    },
    {
      label: 'PMI manufaktur',
      value: formatNumber(data.latestPMI.pmi_value, 1),
      note: data.latestPMI.period,
      href: data.latestPMI._source_url,
    },
    {
      label: 'Inflasi bulanan',
      value:
        data.latestIHK?.change_mom !== undefined
          ? `${data.latestIHK.change_mom > 0 ? '+' : ''}${formatNumber(data.latestIHK.change_mom, 2)}%`
          : '-',
      note: data.latestIHK?.period || '-',
      href: data.latestIHK?._source_url,
    },
    {
      label: 'Rilis PHK resmi',
      value: formatNumber(data.kemenakerPHK.length),
      note: data.latestPHK?.title || 'Data rilis berjalan',
      href: data.latestPHK?._source_url,
    },
  ];

  return (
    <EditorialPageShell
      eyebrow="Ikhtisar"
      title="Ruang kerja ketenagakerjaan"
      description="Ringkasan editorial untuk membaca statistik inti, riset Sakernas, arsip berita, dan perbandingan kawasan tanpa sidebar navigasi tetap."
      summary={
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--app-text)]">{formatPercent(data.tptValue)}</div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            {data.researchEntries.length} entri riset, {data.latestNews.length} berita terbaru, dan {data.aseanSnapshot.length} snapshot kawasan.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {data.showWarning ? <DataNotice bpsSource={data.bpsSource} tptSource={data.tptSource} /> : null}

        <div className="grid gap-4 xl:grid-cols-3">
        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] xl:order-1">
          <SectionHeading id="berita" title="Berita & Isu Terkini" href="/berita" meta={`${data.latestNews.length} entri terbaru`} />
          <div className="divide-y divide-[var(--app-border)]">
            {data.latestNews.map((article) => (
              <article key={article.id} className="grid gap-2 px-3 py-3">
                <div className="space-y-1 text-xs text-[var(--app-subtle)]">
                  <div>{article.source_name}</div>
                  <div>{formatDate(article.date)}</div>
                  {article.is_estimated ? <div>tanggal estimasi</div> : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-sm font-semibold leading-snug text-[var(--app-text)]">
                    <a
                      href={article._source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1 hover:text-[var(--app-link)] focus-visible:app-focus"
                    >
                      <span>{article.title}</span>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    </a>
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--app-muted)]">{truncateText(article.excerpt, 170)}</p>
                  <div className="flex flex-wrap gap-1">
                    {article.sector_tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--app-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-[var(--app-border)] px-3 py-2 text-xs">
            <Link href="/berita" className="text-[var(--app-link)] hover:underline focus-visible:app-focus">
              Buka arsip berita
            </Link>
          </div>
        </section>

        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] xl:order-2">
          <SectionHeading id="riset" title="Jurnal Penelitian" href="/riset-akademik" meta={`${researchRows.length} entri ditampilkan`} />
          <div className="divide-y divide-[var(--app-border)]">
            {researchRows.map((item) => (
              <article key={item.id} className="grid gap-2 px-3 py-3">
                <div className="space-y-1 text-xs text-[var(--app-subtle)]">
                  <div>{item.source}</div>
                  <div>{item.dateRange}</div>
                  {item.publishDate ? <div>{formatDate(item.publishDate)}</div> : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-sm font-semibold leading-snug text-[var(--app-text)]">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1 hover:text-[var(--app-link)] focus-visible:app-focus"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--app-muted)]">{truncateText(item.summary, 180)}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--app-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-[var(--app-border)] px-3 py-2 text-xs">
            <Link href="/riset-akademik" className="text-[var(--app-link)] hover:underline focus-visible:app-focus">
              Lihat seluruh riset
            </Link>
          </div>
        </section>

        <section className="border border-[var(--app-border)] bg-[var(--app-surface)] xl:order-3">
          <SectionHeading id="statistik" title="Statistik Indonesia" href="/makro-indonesia" meta="Ringkasan indikator inti" />
          <div className="divide-y divide-[var(--app-border)]">
            {summaryRows.map((row) => (
              <DataRow key={row.label} {...row} />
            ))}
          </div>

          <div className="border-t border-[var(--app-border)]">
            <SectionHeading id="asean" title="ASEAN & Internasional" href="/makro-asean" meta="Cuplikan indikator pengangguran dan TPAK" />
            <div className="p-3">
              <div className="space-y-3 md:hidden">
                {aseanRows.map((country) => (
                  <article
                    key={country.country_code}
                    className="space-y-2 border border-[var(--app-border)] bg-[var(--app-surface)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">
                          {country.flag_emoji} {country.country_name_id}
                        </div>
                        <div className="text-xs text-[var(--app-subtle)]">{country.data_tier}</div>
                      </div>
                      <a
                        href={country.nso_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--app-link)] hover:underline focus-visible:app-focus"
                      >
                        {country.nso_name}
                      </a>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--app-subtle)]">Pengangguran</div>
                        <div className="font-semibold text-[var(--app-text)]">
                          {country.indicators.unemployment_rate
                            ? formatPercent(country.indicators.unemployment_rate.value, 2)
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--app-subtle)]">TPAK</div>
                        <div className="font-semibold text-[var(--app-text)]">
                          {country.indicators.lfpr ? formatPercent(country.indicators.lfpr.value, 2) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--app-subtle)]">Periode</div>
                        <div className="font-semibold text-[var(--app-text)]">
                          {country.indicators.unemployment_rate?.period || country.indicators.lfpr?.period || '-'}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-[var(--app-border)] bg-[var(--app-bg-soft)] text-left text-xs uppercase tracking-[0.06em] text-[var(--app-subtle)]">
                      <th className="px-3 py-2 font-medium">Negara</th>
                      <th className="px-3 py-2 font-medium">Pengangguran</th>
                      <th className="px-3 py-2 font-medium">TPAK</th>
                      <th className="px-3 py-2 font-medium">Periode</th>
                      <th className="px-3 py-2 font-medium">Sumber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aseanRows.map((country) => (
                      <tr key={country.country_code} className="border-b border-[var(--app-border)] align-top">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-[var(--app-text)]">
                            {country.flag_emoji} {country.country_name_id}
                          </div>
                          <div className="text-xs text-[var(--app-subtle)]">{country.data_tier}</div>
                        </td>
                        <td className="px-3 py-2 text-[var(--app-text)]">
                          {country.indicators.unemployment_rate
                            ? formatPercent(country.indicators.unemployment_rate.value, 2)
                            : '-'}
                        </td>
                        <td className="px-3 py-2 text-[var(--app-text)]">
                          {country.indicators.lfpr ? formatPercent(country.indicators.lfpr.value, 2) : '-'}
                        </td>
                        <td className="px-3 py-2 text-[var(--app-muted)]">
                          {country.indicators.unemployment_rate?.period || country.indicators.lfpr?.period || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={country.nso_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--app-link)] hover:underline focus-visible:app-focus"
                          >
                            {country.nso_name}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        </div>
      </div>
    </EditorialPageShell>
  );
}
