# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build stage - install deps and build
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace config files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy marketing site source
COPY websites/marketing/ ./websites/marketing/

# Install all dependencies with workspace linking from root
RUN pnpm install --frozen-lockfile

# Build the marketing site
RUN pnpm --filter @osqr/marketing build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling on Railway
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# In pnpm monorepo, standalone output preserves the websites structure
COPY --from=builder --chown=nextjs:nodejs /app/websites/marketing/.next/standalone ./
COPY --from=builder /app/websites/marketing/public ./websites/marketing/public
COPY --from=builder --chown=nextjs:nodejs /app/websites/marketing/.next/static ./websites/marketing/.next/static

USER nextjs

# Railway automatically injects PORT - no EXPOSE needed
# The HOSTNAME must be 0.0.0.0 to listen on all interfaces
ENV HOSTNAME="0.0.0.0"

# Use dumb-init as PID 1 to properly handle signals
ENTRYPOINT ["dumb-init", "--"]
# In pnpm monorepo, standalone server.js is at websites/marketing/server.js
CMD ["node", "websites/marketing/server.js"]
