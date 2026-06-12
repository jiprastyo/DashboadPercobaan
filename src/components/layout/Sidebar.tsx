'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Globe,
  Newspaper,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="border-b border-[var(--app-border)] bg-[var(--app-header)] px-3 py-3">
        {!collapsed && (
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-sm font-semibold text-[var(--app-text)]">
              Monitoring tak resmi
            </h1>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-subtle)]">
              Navigasi
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || BarChart3;
            const isActive = item.external
              ? false
              : item.href === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(item.href);
            const className = cn(
              'flex min-h-9 items-center gap-2.5 border px-2.5 py-2 text-sm transition-colors focus-visible:app-focus',
              isActive
                ? 'border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-[var(--app-surface-raised)] hover:text-[var(--app-text)]'
            );

            return (
              <li key={item.href}>
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={className}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-[var(--app-border)] p-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 border border-transparent px-3 py-2 text-sm text-[var(--app-subtle)] transition hover:border-[var(--app-border)] hover:bg-[var(--app-surface-raised)] hover:text-[var(--app-text)] focus-visible:app-focus"
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Ciutkan</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
