# Environment Variables — AuraSpear Platform

Authoritative reference for every environment variable, derived from the
backend's enforced schema (`apps/api/src/config/env.validation.ts`), the web
app's `next.config.ts` / `.env.example`, and the Docker Compose files.

## Files & precedence

| File                      | Used by                             | Committed?   |
| ------------------------- | ----------------------------------- | ------------ |
| `.env` (root)             | `docker compose` interpolation      | ❌ (ignored) |
| `.env.example` (root)     | template for the above              | ✅           |
| `.env.production.example` | production hardening template       | ✅           |
| `apps/api/.env`           | NestJS local dev (`@nestjs/config`) | ❌           |
| `apps/api/.env.example`   | template for the api                | ✅           |
| `apps/web/.env`           | Next.js local dev                   | ❌           |
| `apps/web/.env.example`   | template for the web                | ✅           |

> **Rule:** only `*.example` env files are ever committed. Real values live in
> gitignored `.env` files (root and per-app). Generate secrets with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Backend (`@auraspear/api`)

| Variable                                                                                                                                                                                 | Required  | Secret | Default                                  | Validation (enforced at boot)                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                                                                                                                                                                           | ✅        | ✅     | —                                        | must be a valid URL                                                |
| `REDIS_HOST`                                                                                                                                                                             | —         | —      | `localhost`                              |                                                                    |
| `REDIS_PORT`                                                                                                                                                                             | —         | —      | `6379`                                   | coerced number                                                     |
| `REDIS_PASSWORD`                                                                                                                                                                         | prod-only | ✅     | `''`                                     | **≥ 16 chars when `NODE_ENV=production`**                          |
| `JWT_SECRET`                                                                                                                                                                             | ✅        | ✅     | —                                        | **≥ 64 hex chars, not all zeros**                                  |
| `JWT_ACCESS_EXPIRY`                                                                                                                                                                      | —         | —      | `15m`                                    |                                                                    |
| `JWT_REFRESH_EXPIRY`                                                                                                                                                                     | —         | —      | `7d`                                     |                                                                    |
| `CONFIG_ENCRYPTION_KEY`                                                                                                                                                                  | ✅        | ✅     | —                                        | **exactly 64 hex chars (AES-256), not all zeros**                  |
| `PLATFORM_ADMIN_PASSWORD`                                                                                                                                                                | optional  | ✅     | —                                        | ≥ 12 chars when set                                                |
| `CORS_ORIGINS`                                                                                                                                                                           | —         | —      | `http://localhost:3000`                  | valid http/https URLs; **no localhost in prod**; non-empty in prod |
| `PORT`                                                                                                                                                                                   | —         | —      | `4000`                                   | coerced number                                                     |
| `NODE_ENV`                                                                                                                                                                               | —         | —      | **`production`**                         | enum (dev/prod/test)                                               |
| `LOG_LEVEL`                                                                                                                                                                              | —         | —      | `info`                                   | enum                                                               |
| `RATE_LIMIT_THROTTLE_TTL`                                                                                                                                                                | —         | —      | `60000`                                  | coerced number                                                     |
| `RATE_LIMIT_THROTTLE_LIMIT`                                                                                                                                                              | —         | —      | `250`                                    | coerced number                                                     |
| `OIDC_ISSUER_URL` / `OIDC_AUDIENCE` / `OIDC_JWKS_URI` / `OIDC_CLIENT_ID`                                                                                                                 | optional  | partly | —                                        | **all-or-nothing** (group-validated)                               |
| `WAZUH_MANAGER_URL`, `WAZUH_INDEXER_URL`, `GRAYLOG_BASE_URL`, `LOGSTASH_BASE_URL`, `VELOCIRAPTOR_BASE_URL`, `GRAFANA_BASE_URL`, `INFLUXDB_BASE_URL`, `MISP_BASE_URL`, `SHUFFLE_BASE_URL` | optional  | —      | —                                        | valid URL if set (per-tenant config stored encrypted in DB)        |
| `AWS_REGION`                                                                                                                                                                             | —         | —      | `us-east-1`                              |                                                                    |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`                                                                                                                                            | optional  | ✅     | —                                        | needed only when Bedrock AI is enabled                             |
| `AWS_BEDROCK_MODEL_ID`                                                                                                                                                                   | —         | —      | `global.anthropic.claude-sonnet-4-5-...` |                                                                    |

### Seeding (used by `prisma db seed`)

| Variable                                                                                                                                                                                                 | Required    | Secret | Notes                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------- |
| `SEED_DEFAULT_PASSWORD`                                                                                                                                                                                  | ✅ for seed | ✅     | **no fallback** — seed fails loudly if unset (prevents weak default admin) |
| `SEED_WAZUH_PASSWORD`, `SEED_WAZUH_INDEXER_PASSWORD`, `SEED_GRAYLOG_PASSWORD`, `SEED_VELOCIRAPTOR_PASSWORD`, `SEED_GRAFANA_API_KEY`, `SEED_INFLUXDB_TOKEN`, `SEED_MISP_AUTH_KEY`, `SEED_SHUFFLE_API_KEY` | optional    | ✅     | demo connector credentials                                                 |

### Docker-compose-only (interpolation)

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`,
`PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `PGADMIN_PORT` — consumed by the compose
files to provision Postgres/pgAdmin and to compose `DATABASE_URL`.

## Frontend (`@auraspear/web`)

| Variable                                                                                      | Scope           | Secret | Notes                                                                        |
| --------------------------------------------------------------------------------------------- | --------------- | ------ | ---------------------------------------------------------------------------- |
| `BACKEND_API_URL`                                                                             | **server-only** | —      | URL the Next server/proxy uses to reach the API. Not exposed to the browser. |
| `NEXT_PUBLIC_API_URL`                                                                         | browser         | —      | client Axios base path (default `/api`, proxied)                             |
| `NEXT_PUBLIC_APP_NAME`                                                                        | browser         | —      | app title                                                                    |
| `NEXT_PUBLIC_APP_ENV`                                                                         | browser         | —      | `development` \| `staging` \| `production`                                   |
| `NEXT_PUBLIC_ENABLE_MSW`                                                                      | browser         | —      | enable Mock Service Worker (dev/demo only)                                   |
| `NEXT_PUBLIC_OIDC_AUTHORITY` / `NEXT_PUBLIC_OIDC_CLIENT_ID` / `NEXT_PUBLIC_OIDC_REDIRECT_URI` | browser         | —      | OIDC SPA config (optional)                                                   |

> **Frontend rule:** anything browser-exposed **must** be prefixed `NEXT_PUBLIC_`;
> server-only values (like `BACKEND_API_URL`) must **not** carry that prefix.
> `next.config.ts` derives the CSP `connect-src` allowlist from these URLs.

## Quick checklist before first run

- [ ] `CONFIG_ENCRYPTION_KEY` = 64 hex chars
- [ ] `JWT_SECRET` = ≥ 64 hex chars
- [ ] `SEED_DEFAULT_PASSWORD` set (12+ chars)
- [ ] `REDIS_PASSWORD` set (≥ 16 chars) if `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to real origins (no localhost) in production
- [ ] OIDC vars all set or all empty
