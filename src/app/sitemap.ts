import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

// Canonical origin is the Vercel deploy; the GitHub Pages mirror lives under
// a basePath and is intentionally not advertised as canonical.
const ORIGIN = 'https://dashboardtakresmi.vercel.app';

const ROUTES: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
  ['', 'daily', 1],
  ['/makro-indonesia', 'daily', 0.9],
  ['/berita', 'daily', 0.9],
  ['/brs', 'weekly', 0.8],
  ['/riset-akademik', 'weekly', 0.7],
  ['/makro-asean', 'weekly', 0.7],
  ['/tren', 'weekly', 0.6],
  ['/sdg', 'weekly', 0.7],
  ['/operasional', 'monthly', 0.3],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(([route, changeFrequency, priority]) => ({
    url: `${ORIGIN}${route}/`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
