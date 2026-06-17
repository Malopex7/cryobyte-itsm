import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore typescript errors during build to avoid OOM in memory-restricted environment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore lint errors during build to avoid OOM in memory-restricted environment
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

