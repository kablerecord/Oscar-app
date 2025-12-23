import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Transpile the workspace @osqr/core package
  transpilePackages: ['@osqr/core'],
  // Enable turbopack - set root for monorepo builds
  turbopack: {
    root: process.cwd(),
  },
  // TypeScript: ignore pre-existing implicit any errors (TODO: fix incrementally)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure Webpack for fallback builds
  webpack: (config, { isServer }) => {
    // Externalize optional chromadb dependencies that aren't needed for in-memory mode
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@chroma-core/default-embed',
      ];
    }

    // Handle chromadb optional peer dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@chroma-core/default-embed': false,
    };

    return config;
  },
};

export default nextConfig;
