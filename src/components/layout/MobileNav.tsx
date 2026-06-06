'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Factory,
  TrendingUp,
  Newspaper,
  Menu,
  X,
  Flag,
  Globe,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';

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

export default function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The 4 main items for the bottom bar
  const mainTabs = [
    { href: '/', label: 'Ikhtisar', icon: BarChart3 },
    { href: '/sektoral', label: 'Sektoral', icon: Factory },
    { href: '/tren', label: 'Tren', icon: TrendingUp },
    { href: '/berita', label: 'Berita', icon: Newspaper },
  ];

  return (
    <>
      {/* Full screen overlay menu for the rest of the items */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Menu Dasbor</h2>
            <button onClick={() => setMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon] || BarChart3;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl font-medium transition-colors',
                    isActive ? 'bg-[#CCFBF1] text-[#0D9488]' : 'bg-gray-50 text-gray-700'
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-[#0D9488]" : "text-gray-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {mainTabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
                  isActive ? 'text-[#0D9488]' : 'text-gray-500'
                )}
              >
                <tab.icon className={cn('w-5 h-5', isActive && 'fill-current')} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>
    </>
  );
}
