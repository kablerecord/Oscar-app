# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files from monorepo subdirectory
COPY packages/app-web/package.json packages/app-web/package-lock.json* ./
COPY packages/app-web/prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy app-web source
COPY packages/app-web/ .

# Set dummy DATABASE_URL for build (Prisma needs it at build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build the application
RUN npm run build

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
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway automatically injects PORT - no EXPOSE needed
# The HOSTNAME must be 0.0.0.0 to listen on all interfaces
ENV HOSTNAME="0.0.0.0"

# Use dumb-init as PID 1 to properly handle signals
# This fixes the SIGTERM issue on Railway
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
