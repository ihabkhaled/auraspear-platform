# syntax=docker/dockerfile:1
# AuraSpear API (NestJS) — pnpm workspace image.
# BUILD CONTEXT = repo root (see infra/docker/*.yml). All COPY paths are
# relative to the monorepo root.

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

# ---- deps: install with the authoritative root lockfile, filtered to the api ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
# Prisma schema must exist before install — the api's postinstall runs
# `prisma generate`.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
# Build-time only: prisma.config.ts resolves DATABASE_URL eagerly. `prisma
# generate` never connects — the real URL is injected at runtime by compose/env.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
# `--filter @auraspear/api...` installs the api plus its workspace deps only
RUN pnpm install --frozen-lockfile --filter @auraspear/api...

# ---- build: prisma client + nest build ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @auraspear/api exec prisma generate \
 && pnpm --filter @auraspear/api run build

# ---- production: run the compiled app; migrate + seed handled by entrypoint ----
# The entrypoint runs `prisma migrate deploy` + `db seed` at boot, which need the
# Prisma CLI and the ts seed runner, so the built workspace node_modules is
# carried over intact. Image-size pruning (pnpm deploy --prod) is a follow-up.
FROM base AS production
ENV NODE_ENV=production
WORKDIR /repo
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=build --chown=nestjs:nodejs /repo ./
WORKDIR /repo/apps/api
RUN chmod +x docker-entrypoint.sh
USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
