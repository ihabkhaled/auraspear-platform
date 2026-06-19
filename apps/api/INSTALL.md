# AuraSpear SOC Backend -- Installation Guide

## Prerequisites

- Node.js 20+ (24.x recommended)
- npm 10+
- PostgreSQL 15+
- Redis 7+ (optional but recommended for job processing)

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Copy env
cp .env.example .env

# 3. Create database
createdb auraspear_soc

# 4. Run migrations
npm run prisma:migrate:prod

# 5. Seed data
npx prisma db seed

# 6. Start dev
npm run start:dev

# 7. Server runs on http://localhost:4000
```

## Environment Variables

| Variable                | Description                              |
| ----------------------- | ---------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string             |
| `REDIS_HOST`            | Redis host                               |
| `REDIS_PORT`            | Redis port                               |
| `REDIS_PASSWORD`        | Redis password                           |
| `JWT_SECRET`            | 64-char hex string for JWT signing       |
| `CONFIG_ENCRYPTION_KEY` | 64-char hex string for connector secrets |

## Available Scripts

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run start:dev`     | Dev server with watch                            |
| `npm run start`         | Full startup (generate + migrate + seed + start) |
| `npm run build`         | Production build                                 |
| `npm run lint`          | ESLint                                           |
| `npm run typecheck`     | TypeScript check                                 |
| `npm test`              | Jest tests                                       |
| `npm run prisma:studio` | Prisma database UI                               |

## Docs

- docs/AI-AUTOMATION.md -- AI agent system
- docs/AI-ROUTING.md -- Provider routing
- docs/PERMISSIONS.md -- RBAC reference
