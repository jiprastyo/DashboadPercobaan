'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Header() {
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
        <nav className="flex items-center gap-2 overflow-x-auto px-3 py-1.5 text-[13px] sm:px-4 md:px-6">
          {NAV_ITEMS.map((item) => {
            const isActive = item.external
              ? false
              : item.href === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(item.href);

            const className = cn(
              'whitespace-nowrap border px-2.5 py-1 text-[13px] font-semibold transition-colors focus-visible:app-focus',
              isActive
                ? 'border-[var(--app-text)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]'
            );

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={className}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
