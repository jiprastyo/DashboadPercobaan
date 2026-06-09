import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import PlatformFontProvider from '@/components/layout/PlatformFontProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Monitoring tak resmi',
  description:
    'Riset Sakernas, statistik ketenagakerjaan Indonesia, perbandingan ASEAN, dan arsip berita.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PlatformFontProvider />
          <Sidebar />
          <div className="min-h-screen pb-16 transition-[margin] duration-200 md:ml-60 md:pb-0">
            <Header />
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 px-3 py-3 sm:px-4 md:px-6 md:py-5">
              <div className="w-full min-w-0">{children}</div>
            </main>
            <Footer />
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
