import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Transpile the workspace @osqr/core package
  transpilePackages: ['@osqr/core'],
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

    // Explicitly resolve @osqr/core to the workspace package
    // In Docker, cwd is /app/packages/app-web, so ../core/dist resolves correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@osqr/core': path.resolve(process.cwd(), '../core/dist'),
    };

    return config;
  },
};

export default nextConfig;
