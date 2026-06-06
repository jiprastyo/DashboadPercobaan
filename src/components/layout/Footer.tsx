export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-4 px-6 mt-auto">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <p>
          Sumber data utama:{' '}
          <a
            href="https://www.bps.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-[#0D9488] transition-colors"
          >
            Badan Pusat Statistik (BPS)
          </a>
        </p>
        <p>Dashboard Monitoring Ketenagakerjaan © 2026</p>
      </div>
    </footer>
  );
}
