'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarDays, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_ITEMS, SURVEY_PERIODS } from '@/lib/constants';
import Select from '@/components/ui/Select';

export default function Header() {
  const pathname = usePathname();
  const [period, setPeriod] = useState(SURVEY_PERIODS[0].id);
  const { resolvedTheme, setTheme } = useTheme();

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/'
      ? pathname === '/' || pathname === ''
      : pathname.startsWith(item.href)
  );

  const isDark = resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-header)]">
      <div className="mx-auto flex min-h-14 w-full max-w-[1440px] items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
        <div className="min-w-0">
          <p className="hidden text-[11px] uppercase tracking-[0.08em] text-[var(--app-subtle)] sm:block">
            Monitoring tak resmi
          </p>
          <h1 className="truncate text-base font-semibold text-[var(--app-text)]">
            {currentNav?.label || 'Dashboard'}
          </h1>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 text-[var(--app-subtle)] sm:flex">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs">Periode</span>
          </div>
          <Select
            options={SURVEY_PERIODS.map((p) => ({
              value: p.id,
              label: p.label,
            }))}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)] focus-visible:app-focus"
            aria-label={isDark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            title={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
