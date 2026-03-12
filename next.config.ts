import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/admin/:path*",
        destination: "/admin/:path*",
      },
      {
        source: "/dashboard/:path*",
        destination: "/dashboard/:path*",
      },
    ];
  },
};

export default nextConfig;
