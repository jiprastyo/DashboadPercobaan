import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: "export" and basePath for Vercel deployment with API routes
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
