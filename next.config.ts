import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Disable experimental features that might cause issues
  },
};

export default nextConfig;
