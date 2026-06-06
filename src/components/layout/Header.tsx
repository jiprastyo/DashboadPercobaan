'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NAV_ITEMS, SURVEY_PERIODS } from '@/lib/constants';
import Select from '@/components/ui/Select';

export default function Header() {
  const pathname = usePathname();
  const [period, setPeriod] = useState(SURVEY_PERIODS[0].id);

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/'
      ? pathname === '/' || pathname === ''
      : pathname.startsWith(item.href)
  );

  const pageTitle = currentNav?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-[2px] border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </header>
  );
}
