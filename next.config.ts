import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We removed output: "export" and basePath so this can deploy to Vercel with API routes
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Ensure the 70MB database is included in the Vercel serverless function bundle
  outputFileTracingIncludes: {
    '/api/news': ['./data/news/**/*'],
  },
};

export default nextConfig;
