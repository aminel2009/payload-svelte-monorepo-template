FROM node:22.23.4-slim AS base

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cms/node_modules ./apps/cms/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && \
    pnpm run build && \
    mkdir -p apps/cms/public && \
    pnpm --filter web deploy --prod --legacy /app/web-prod

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/payload.db"
ENV MEDIA_DIR="/app/media"
ENV PUBLIC_GRAPHQL_ENDPOINT="/_/api/graphql"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

RUN mkdir -p /app/data /app/media /app/apps/cms/.next /app/apps/web && \
    chown -R appuser:nodejs /app

COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=appuser:nodejs /app/server.mjs ./server.mjs
COPY --from=builder --chown=appuser:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=appuser:nodejs /app/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=builder --chown=appuser:nodejs /app/apps/cms/public ./apps/cms/public
COPY --from=builder --chown=appuser:nodejs /app/apps/cms/next.config.mjs ./apps/cms/next.config.mjs
COPY --from=builder --chown=appuser:nodejs /app/apps/web/build ./apps/web/build
COPY --from=builder --chown=appuser:nodejs /app/web-prod/package.json ./apps/web/package.json
COPY --from=builder --chown=appuser:nodejs /app/web-prod/node_modules ./apps/web/node_modules

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]
