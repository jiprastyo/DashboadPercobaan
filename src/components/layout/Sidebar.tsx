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
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-gray-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate leading-tight">
              Monitor
            </h1>
            <p className="text-xs text-gray-500 truncate leading-tight">
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#CCFBF1] text-[#0D9488]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', isActive ? 'text-[#0D9488]' : 'text-gray-400')} />
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
