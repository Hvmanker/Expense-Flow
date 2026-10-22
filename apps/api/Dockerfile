# Multi-stage Dockerfile for @expenseflow/api
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy workspace configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/parser-engine/package.json ./packages/parser-engine/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/ai-prompts/package.json ./packages/ai-prompts/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY packages/shared-ui/package.json ./packages/shared-ui/package.json
COPY packages/testing/package.json ./packages/testing/package.json

RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build shared packages and API
RUN pnpm --filter @expenseflow/shared-types build
RUN pnpm --filter @expenseflow/logger build
RUN pnpm --filter @expenseflow/database build
RUN pnpm --filter @expenseflow/parser-engine build
RUN pnpm --filter @expenseflow/api build

# Prune devDependencies for production
RUN pnpm --filter @expenseflow/api --prod deploy pruned-api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expenseflow

# Copy built artifacts and production dependencies
COPY --from=builder --chown=expenseflow:nodejs /app/pruned-api ./
COPY --from=builder --chown=expenseflow:nodejs /app/apps/api/dist ./dist

USER expenseflow

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
