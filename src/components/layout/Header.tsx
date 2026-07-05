'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_ITEMS, type HealthStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface HeaderProps {
  // D1: build-time worst-status rollup across all scrapers (getGlobalOpsStatus()
  // in data-loader-server.ts), passed down from the server RootLayout. No
  // client-side fetching or polling -- this is frozen at build time like
  // every other computed value in this static export.
  opsStatus?: HealthStatus;
}

// Real semantic state only (design-taste: "badges only for real semantic
// state", the SourceFreshnessBadge precedent) -- no dot at all when
// status is 'ok' (absence = healthy), token colors only when it isn't.
const OPS_DOT_COLOR: Partial<Record<HealthStatus, string>> = {
  warning: 'var(--app-warning)',
  error: 'var(--app-danger)',
};

export default function Header({ opsStatus }: HeaderProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [todayLabel, setTodayLabel] = useState('');

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setTodayLabel(
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date())
    );
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--app-border-strong)] bg-[color:color-mix(in_srgb,var(--app-header)_94%,transparent)] backdrop-blur">
      <div className="border-b border-[var(--app-border)]">
        <div className="mx-auto grid w-full max-w-[1760px] grid-cols-[1fr_auto] items-center gap-2 px-3 py-1.5 sm:px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 md:py-2">
          <div className="hidden min-w-0 text-[10px] uppercase tracking-[0.1em] text-[var(--app-subtle)] sm:block md:text-[11px]">
            <span className="truncate">{todayLabel}</span>
          </div>

          <Link href="/" className="min-w-0 text-left focus-visible:app-focus sm:text-center">
            <div className="truncate text-lg font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl md:text-3xl">
              Monitoring Tak Resmi
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center justify-self-end border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)] focus-visible:app-focus md:h-8 md:w-8"
            aria-label={isDark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            title={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-[1760px] md:block">
        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 text-[11px] sm:px-4 md:px-6 xl:gap-2 xl:text-[13px]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.external
              ? false
              : item.href === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(item.href);

            const className = cn(
              'whitespace-nowrap border px-1.5 py-1 text-[11px] font-semibold transition-colors focus-visible:app-focus xl:px-2.5 xl:text-[13px]',
              isActive
                ? 'border-[var(--app-text)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]'
            );

            const opsDotColor = item.href === '/operasional' && opsStatus ? OPS_DOT_COLOR[opsStatus] : undefined;
            const label = opsDotColor ? (
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: opsDotColor }}
                />
              </span>
            ) : (
              item.label
            );

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={className}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
