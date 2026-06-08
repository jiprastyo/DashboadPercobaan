import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

import MobileNav from '@/components/layout/MobileNav';

import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Monitor Ketenagakerjaan',
  description:
    'Dashboard monitoring isu ketenagakerjaan Indonesia — memantau indikator makro, tren pencarian, berita, dan data ASEAN secara terpadu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-[#F9FAFB] dark:bg-gray-900 text-gray-700 dark:text-gray-300 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Sidebar />
          {/* Main content area — shifts right on desktop to accommodate sidebar */}
          <div className="md:ml-52 min-h-screen flex flex-col transition-all duration-200 pb-16 md:pb-0">
            <Header />
            <main className="flex-1 p-2 md:p-4">{children}</main>
            <Footer />
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
