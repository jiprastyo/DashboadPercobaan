import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
    <html lang="id">
      <body className="bg-[#F9FAFB] text-gray-700 antialiased">
        <Sidebar />
        {/* Main content area — shifts right to accommodate sidebar */}
        <div className="ml-60 min-h-screen flex flex-col transition-all duration-200">
          <Header />
          <main className="flex-1 p-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
