'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Flag,
  Globe,
  Factory,
  TrendingUp,
  Newspaper,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  BookOpen,
} from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  Flag,
  Globe,
  Factory,
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
        'hidden md:flex fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex-col z-40 transition-all duration-200',
        collapsed ? 'w-14' : 'w-52'
      )}
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-2 px-3.5 h-12 bg-[var(--color-bg-header)] border-b border-gray-200 flex-shrink-0">
        <div className="w-6.5 h-6.5 rounded bg-[#0D9488] flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-gray-900 truncate leading-none">
              Monitor
            </h1>
            <p className="text-[10px] text-gray-500 truncate leading-none mt-0.5">
              Ketenagakerjaan
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || BarChart3;
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#CCFBF1] text-[#0D9488]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#0D9488]' : 'text-gray-400')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-100 p-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer"
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Ciutkan</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
