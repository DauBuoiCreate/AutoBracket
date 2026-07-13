# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.14.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /workspace
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.12.0 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY scripts/require-pnpm.mjs ./scripts/require-pnpm.mjs
COPY apps/web/package.json ./apps/web/package.json
COPY apps/realtime/package.json ./apps/realtime/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/testkit/package.json ./packages/testkit/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN corepack pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN corepack pnpm build \
  && mkdir -p /deploy \
  && corepack pnpm --filter @autobracket/worker deploy --prod --legacy /deploy/worker \
  && corepack pnpm --filter @autobracket/realtime deploy --prod --legacy /deploy/realtime

FROM build AS migration
CMD ["sh", "-c", "cd packages/db && export PATH=$PWD/node_modules/.bin:$PATH && node node_modules/prisma/build/index.js migrate deploy --config prisma.config.ts && node node_modules/prisma/build/index.js db seed --config prisma.config.ts"]

FROM node:${NODE_VERSION}-bookworm-slim AS web
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone/ ./
USER node
EXPOSE 3000
CMD ["node", "start-container.mjs"]

FROM node:${NODE_VERSION}-bookworm-slim AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /deploy/worker/ ./
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]

FROM node:${NODE_VERSION}-bookworm-slim AS realtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /deploy/realtime/ ./
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
