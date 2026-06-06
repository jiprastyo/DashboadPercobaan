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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-[2px] border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-14 px-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
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

          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {mounted && theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
