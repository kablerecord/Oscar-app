# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build stage - install deps and build
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy workspace config files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all package sources (needed for workspace resolution)
COPY packages/core/ ./packages/core/
COPY packages/app-web/ ./packages/app-web/

# Install all dependencies with workspace linking from root
RUN pnpm install --frozen-lockfile

# Build @osqr/core first (dist/ is gitignored, so we need to build it)
RUN cd packages/core && pnpm exec tsc

# Generate Prisma client
RUN cd packages/app-web && pnpm prisma generate

# Set dummy DATABASE_URL for build (Prisma needs it at build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build the application from root using pnpm filter
RUN pnpm --filter @osqr/app-web build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling on Railway
# Install openssl for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# In pnpm monorepo, standalone output preserves the packages structure
COPY --from=builder --chown=nextjs:nodejs /app/packages/app-web/.next/standalone ./
COPY --from=builder /app/packages/app-web/public ./packages/app-web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/app-web/.next/static ./packages/app-web/.next/static

# Copy Prisma schema and migrations for runtime migrations
# In pnpm monorepo, prisma deps are in packages/app-web/node_modules
COPY --from=builder /app/packages/app-web/prisma ./packages/app-web/prisma
COPY --from=builder /app/packages/app-web/node_modules/.prisma ./packages/app-web/node_modules/.prisma
COPY --from=builder /app/packages/app-web/node_modules/@prisma ./packages/app-web/node_modules/@prisma
COPY --from=builder /app/packages/app-web/node_modules/prisma ./packages/app-web/node_modules/prisma

# Create startup script that runs migrations then starts the server
# Migrations are optional - if they fail, server still starts (for db push setups)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Attempting Prisma migrations..."' >> /app/start.sh && \
    echo 'cd /app/packages/app-web && npx prisma migrate deploy 2>&1 || echo "Migration skipped (may be using db push)"' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'exec node /app/packages/app-web/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs

# Railway automatically injects PORT - no EXPOSE needed
# The HOSTNAME must be 0.0.0.0 to listen on all interfaces
ENV HOSTNAME="0.0.0.0"

# Use dumb-init as PID 1 to properly handle signals
# This fixes the SIGTERM issue on Railway
ENTRYPOINT ["dumb-init", "--"]
# Run migrations and start server
CMD ["/app/start.sh"]
