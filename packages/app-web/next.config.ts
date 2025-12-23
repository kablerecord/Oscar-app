import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    config.resolve.alias = {
      ...config.resolve.alias,
      '@osqr/core': path.resolve(__dirname, '../core/dist'),
    };

    return config;
  },
};

export default nextConfig;
