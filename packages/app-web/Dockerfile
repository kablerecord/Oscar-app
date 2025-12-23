# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files from monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/app-web/package.json ./packages/app-web/
COPY packages/app-web/prisma ./packages/app-web/prisma/

# Install dependencies for app-web only
RUN pnpm install --filter @osqr/app-web --frozen-lockfile

# Generate Prisma client
RUN cd packages/app-web && pnpm prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/app-web/node_modules ./packages/app-web/node_modules

# Copy app-web source
COPY packages/app-web/ ./packages/app-web/

WORKDIR /app/packages/app-web

# Set dummy DATABASE_URL for build (Prisma needs it at build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling on Railway
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/packages/app-web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/app-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/app-web/.next/static ./.next/static

USER nextjs

# Railway automatically injects PORT - no EXPOSE needed
# The HOSTNAME must be 0.0.0.0 to listen on all interfaces
ENV HOSTNAME="0.0.0.0"

# Use dumb-init as PID 1 to properly handle signals
# This fixes the SIGTERM issue on Railway
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
