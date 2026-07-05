import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getGlobalOpsStatus } from '@/lib/data-loader-server';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--app-font-sans',
});

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
  // Build-time only (D1): computed once per deploy from committed data/,
  // never refetched client-side. Threaded as a prop into the two client
  // nav components so they can render a dot with no polling.
  const globalOpsStatus = getGlobalOpsStatus();

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geist.className} ${geist.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen pb-14 md:pb-0">
            <Header opsStatus={globalOpsStatus} />
            <main className="mx-auto flex w-full max-w-[1760px] flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6">
              <div className="w-full min-w-0">{children}</div>
            </main>
            <Footer />
          </div>
          <MobileNav opsStatus={globalOpsStatus} />
        </ThemeProvider>
      </body>
    </html>
  );
}
