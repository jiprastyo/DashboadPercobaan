import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/DashboadPercobaan",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
