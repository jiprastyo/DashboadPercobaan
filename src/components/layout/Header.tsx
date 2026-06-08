'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_ITEMS, SURVEY_PERIODS } from '@/lib/constants';
import Select from '@/components/ui/Select';

export default function Header() {
  const pathname = usePathname();
  const [period, setPeriod] = useState(SURVEY_PERIODS[0].id);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/'
      ? pathname === '/' || pathname === ''
      : pathname.startsWith(item.href)
  );

  const pageTitle = currentNav?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-bg-header)] backdrop-blur-[2px] border-b border-gray-200">
      <div className="flex items-center justify-between h-12 px-4">
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs text-gray-500 hidden sm:inline">Periode Survei:</span>
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

        </div>
      </div>
    </header>
  );
}
