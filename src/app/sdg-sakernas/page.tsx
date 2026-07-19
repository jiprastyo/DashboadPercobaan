'use client';

// Legacy route. The canonical SDG page is /sdg (NAV_ITEMS points there).
// Static export cannot server-redirect, so this is a client-side redirect that
// preserves any external bookmarks to /sdg-sakernas.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SDGSakernasRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sdg');
  }, [router]);

  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-muted)]">
      Halaman ini telah dipindahkan ke{' '}
      <Link href="/sdg" className="text-[var(--app-link)] hover:underline focus-visible:app-focus">
        /sdg
      </Link>
      . Mengalihkan otomatis...
    </div>
  );
}
