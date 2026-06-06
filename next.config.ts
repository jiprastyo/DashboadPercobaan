import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: "export" and basePath for Vercel deployment with API routes
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
