'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  FileText,
  Flag,
  Globe,
  Menu,
  Newspaper,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, type HealthStatus } from '@/lib/constants';

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  Flag,
  Globe,
  TrendingUp,
  Newspaper,
  FileText,
  Settings,
  BookOpen,
};

interface MobileNavProps {
  // D1: build-time worst-status rollup, passed down from the server
  // RootLayout (see Header.tsx for the same contract). No client-side
  // fetching or polling.
  opsStatus?: HealthStatus;
}

// Real semantic state only (design-taste: "badges only for real semantic
// state") -- no dot when status is 'ok' (absence = healthy).
const OPS_DOT_COLOR: Partial<Record<HealthStatus, string>> = {
  warning: 'var(--app-warning)',
  error: 'var(--app-danger)',
};

export default function MobileNav({ opsStatus }: MobileNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainTabs = NAV_ITEMS.filter((item) =>
    ['/', '/makro-indonesia', '/berita', '/riset-akademik'].includes(item.href)
  );

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--app-bg)] md:hidden">
          <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-header)] px-4">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Navigasi</h2>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] focus-visible:app-focus"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="grid gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon] || BarChart3;
                const isActive = item.external ? false : item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const className = cn(
                  'flex min-h-12 items-center gap-3 border px-3 py-2 text-sm font-semibold transition-colors focus-visible:app-focus',
                  isActive
                    ? 'border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                    : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]'
                );

                const opsDotColor = item.href === '/operasional' && opsStatus ? OPS_DOT_COLOR[opsStatus] : undefined;
                const labelNode = opsDotColor ? (
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
                    onClick={() => setMenuOpen(false)}
                    className={className}
                  >
                    <Icon className="h-5 w-5" />
                    {labelNode}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={className}
                  >
                    <Icon className="h-5 w-5" />
                    {labelNode}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-[var(--app-border)] bg-[var(--app-surface)] md:hidden">
        <div className="grid h-14 grid-cols-5 px-1">
          {mainTabs.map((tab) => {
            const Icon = iconMap[tab.icon] || BarChart3;
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-0.5 border-t-2 px-1 text-[9px] font-semibold transition-colors focus-visible:app-focus',
                  isActive
                    ? 'border-[var(--app-link)] text-[var(--app-text)]'
                    : 'border-transparent text-[var(--app-subtle)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent px-1 text-[9px] font-semibold text-[var(--app-subtle)] focus-visible:app-focus"
            aria-label="Buka menu"
          >
            <Menu className="h-4 w-4 shrink-0" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </>
  );
}
