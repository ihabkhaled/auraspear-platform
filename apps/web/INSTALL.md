# AuraSpear SOC Frontend -- Installation Guide

## Prerequisites

- Node.js 20+ (24.x recommended)
- pnpm 10+ (package manager)
- Backend running on port 4000

## Quick Start

```bash
# 1. Clone and install
pnpm install

# 2. Copy env
cp .env.development .env.local

# 3. Start dev server
pnpm dev

# 4. Open http://localhost:3000
```

## Environment Variables

| Variable                     | Description                | Default                        |
| ---------------------------- | -------------------------- | ------------------------------ |
| `BACKEND_API_URL`            | Backend server URL         | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_ENABLE_MSW`     | Enable mock service worker | `false`                        |
| `NEXT_PUBLIC_OIDC_AUTHORITY` | OIDC provider URL          | --                             |
| `NEXT_PUBLIC_OIDC_CLIENT_ID` | OIDC client ID             | --                             |

## Available Scripts

| Command            | Description               |
| ------------------ | ------------------------- |
| `pnpm dev`         | Start dev server          |
| `pnpm build`       | Production build          |
| `pnpm lint`        | ESLint                    |
| `pnpm lint:strict` | ESLint with zero warnings |
| `pnpm typecheck`   | TypeScript check          |
| `pnpm test`        | Run vitest                |
| `pnpm format`      | Prettier                  |

## New Routes

- `/ai-chat` — AI Chat (requires `AI_CHAT_ACCESS` permission)
- `/ai-findings` — AI Findings search (requires `AI_AGENTS_VIEW` permission)
- `/settings` — now includes AI Memory management section

## Architecture

See docs/ARCHITECTURE.md

## Login Credentials (dev)

| Email                         | Password      |
| ----------------------------- | ------------- |
| `admin@aura-finance.io`       | `password123` |
| `platform-admin@auraspear.io` | `password123` |
