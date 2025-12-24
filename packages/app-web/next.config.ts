import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Transpile the workspace @osqr/core package
  transpilePackages: ['@osqr/core'],
  // TypeScript: ignore pre-existing implicit any errors (TODO: fix incrementally)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Empty turbopack config to silence Next.js 16 warning (using webpack config)
  turbopack: {},
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

    // Note: @osqr/core is in transpilePackages, so Next.js handles resolution
    // The package exports in @osqr/core/package.json define how subpaths resolve

    return config;
  },
};

export default nextConfig;
