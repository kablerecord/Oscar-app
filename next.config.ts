import type { NextConfig } from "next";
import path from "path";

// Absolute path to the @osqr/core package
const OSQR_CORE_PATH = '/Users/kablerecord/Desktop/osqr/dist/index.js';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Transpile the symlinked @osqr/core package
  transpilePackages: ['@osqr/core'],
  // Configure Turbopack to resolve the symlinked package (Next.js 16+)
  turbopack: {
    resolveAlias: {
      '@osqr/core': OSQR_CORE_PATH,
    },
  },
  // Also configure Webpack for --webpack builds
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@osqr/core': OSQR_CORE_PATH,
    };
    config.resolve.symlinks = false;

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
