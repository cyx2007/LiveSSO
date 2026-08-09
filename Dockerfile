FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV DEPLOYMENT_MODE=self_hosted
ENV BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=container-build-only-secret-at-least-32-characters
ENV SECURITY_HASH_SECRET=container-build-only-hash-secret-at-least-32-characters
ENV OUTBOX_WORKER_SECRET=container-build-only-worker-secret-at-least-32-characters
ENV CRON_SECRET=container-build-only-cron-secret-at-least-32-characters
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DIRECT_DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV MAIL_ENABLED=false
ENV OBJECT_STORAGE_ENABLED=false

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM dependencies AS migrator

WORKDIR /app
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

CMD ["pnpm", "prisma", "migrate", "deploy"]

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
