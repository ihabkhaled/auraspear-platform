# AuraSpear SOC Backend

A multi-tenant **Security Information and Event Management (SIEM) Backend-for-Frontend** API built with NestJS 11. Powers the AuraSpear SOC dashboard with alert management, case tracking, threat hunting, threat intelligence, connector integrations, and AI-assisted analysis — all scoped to isolated tenants.
Operational dashboard contracts in this repo stay query-driven and reusable so the frontend can build executive and operator views from real backend aggregates rather than page-local placeholder math.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Modules](#api-modules)
- [Authentication & Authorization](#authentication--authorization)
- [Security Hardening](#security-hardening)
- [Connector Integrations](#connector-integrations)
- [Database & Seed Data](#database--seed-data)
- [Docker](#docker)
- [NPM Scripts](#npm-scripts)
- [Code Quality](#code-quality)

---

## Tech Stack

| Category         | Technology               | Version |
| ---------------- | ------------------------ | ------- |
| Runtime          | Node.js                  | 22      |
| Framework        | NestJS                   | 11      |
| Language         | TypeScript (strict mode) | 5.7     |
| ORM              | Prisma                   | 6       |
| Database         | PostgreSQL               | 16      |
| Cache            | Redis (ioredis)          | 7       |
| Validation       | Zod                      | 3.23    |
| Auth             | JWT + JWKS               | 9       |
| Logging          | nestjs-pino              | 4       |
| Rate Limiting    | @nestjs/throttler        | 6       |
| Security Headers | Helmet                   | 8       |
| API Docs         | @nestjs/swagger          | 11      |

---

## Architecture

```
Frontend (Next.js) ──► BFF (NestJS) ──┬──► Wazuh Manager       (SIEM)
                                      ├──► Wazuh Indexer        (Alert search)
                                      ├──► Graylog              (Log management)
                                      ├──► Velociraptor         (EDR / DFIR)
                                      ├──► Grafana              (Dashboards)
                                      ├──► InfluxDB             (Time-series)
                                      ├──► MISP                 (Threat intel)
                                      ├──► Shuffle              (SOAR)
                                      ├──► AWS Bedrock          (AI analysis)
                                      └──► PostgreSQL + Redis   (State & cache)
```

### Request Pipeline

Every request passes through a guard chain:

1. **ThrottlerGuard** — Rate limiting per IP
2. **AuthGuard** — JWT verification + user active check + token blacklist
3. **TenantGuard** — Tenant context validation
4. **PermissionsGuard** — Dynamic permission-based authorization (replaces static RolesGuard)
5. **AuditInterceptor** — Mutation logging (async)

### Layering

```
Controller → Service → Repository → Prisma
               ↓
           Utilities
```

- **Controllers** — HTTP routing, validation, response. No business logic.
- **Services** — Thin orchestrators. Call repository + utility functions.
- **Repositories** — Pure Prisma data access. Every query scoped by `tenantId`.
- **Utilities** — All business logic: mappers, builders, validators, formatters.

---

## Getting Started

### Prerequisites

- Node.js >= 18, npm >= 9
- Docker + Docker Compose

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, CONFIG_ENCRYPTION_KEY, SEED_DEFAULT_PASSWORD

# 3. Start infrastructure (Postgres + Redis + PgAdmin)
npm run docker:infra

# 4. Run migrations and seed
npm run prisma:migrate
npm run prisma:seed

# 5. Start dev server
npm run start:dev
```

- **API**: `http://localhost:4000/api/v1`
- **Swagger**: `http://localhost:4000/api/docs` (dev only)
- **PgAdmin**: `http://localhost:5050`

### Production

```bash
npm run build
npm start  # Runs migrations + seed + production server
```

---

## Environment Variables

Copy `.env.example` to `.env`. All variables are documented there.

### Required

| Variable                | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                    |
| `JWT_SECRET`            | Min 64 hex chars for HS256 signing              |
| `CONFIG_ENCRYPTION_KEY` | Exactly 64 hex chars (32 bytes) for AES-256-GCM |
| `SEED_DEFAULT_PASSWORD` | Strong password for seeded admin (no fallback)  |

### Application (with defaults)

| Variable             | Default                 | Description                     |
| -------------------- | ----------------------- | ------------------------------- |
| `PORT`               | `4000`                  | HTTP server port                |
| `NODE_ENV`           | `production`            | `production` / `development`    |
| `LOG_LEVEL`          | `info`                  | Pino log level                  |
| `CORS_ORIGINS`       | `http://localhost:3000` | Comma-separated allowed origins |
| `JWT_ACCESS_EXPIRY`  | `15m`                   | Access token TTL                |
| `JWT_REFRESH_EXPIRY` | `7d`                    | Refresh token TTL               |
| `REDIS_HOST`         | `localhost`             | Redis host                      |
| `REDIS_PORT`         | `6379`                  | Redis port                      |

### OIDC (optional — all-or-nothing)

| Variable            | Description                        |
| ------------------- | ---------------------------------- |
| `OIDC_AUTHORITY`    | Entra ID authority URL             |
| `OIDC_CLIENT_ID`    | OAuth client ID                    |
| `OIDC_REDIRECT_URI` | Post-login redirect URI            |
| `OIDC_JWKS_URI`     | JWKS endpoint for RS256 validation |

> All 4 OIDC variables must be set together or all omitted. Partial config is rejected at startup.

### Connector URLs (optional — overridden per-tenant in DB)

`WAZUH_MANAGER_URL`, `WAZUH_INDEXER_URL`, `GRAYLOG_BASE_URL`, `VELOCIRAPTOR_BASE_URL`, `GRAFANA_BASE_URL`, `INFLUXDB_BASE_URL`, `MISP_BASE_URL`, `SHUFFLE_BASE_URL`

### AWS Bedrock (optional)

`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BEDROCK_MODEL_ID`

### Seed Connector Credentials (optional)

`SEED_WAZUH_PASSWORD`, `SEED_WAZUH_INDEXER_PASSWORD`, `SEED_GRAYLOG_PASSWORD`, `SEED_VELOCIRAPTOR_PASSWORD`, `SEED_GRAFANA_API_KEY`, `SEED_INFLUXDB_TOKEN`, `SEED_MISP_AUTH_KEY`, `SEED_SHUFFLE_API_KEY`

---

## Project Structure

```
src/
├── main.ts                    # Bootstrap (Helmet, CORS, Swagger, rate limits)
├── app.module.ts              # Root module
├── common/
│   ├── decorators/            # @CurrentUser, @RequirePermission, @Public, @TenantId
│   ├── filters/               # GlobalExceptionFilter (error sanitization)
│   ├── guards/                # AuthGuard, TenantGuard, PermissionsGuard
│   ├── interceptors/          # AuditInterceptor
│   ├── interfaces/            # JwtPayload, AuthenticatedRequest
│   ├── pipes/                 # ZodValidationPipe
│   ├── enums/                 # Shared enums
│   ├── constants/             # Shared constants
│   └── utils/                 # encryption, mask, ssrf, es-sanitize, query
├── config/                    # env.validation.ts (Zod env schema)
├── modules/                   # 32 API modules (see below)
└── prisma/                    # PrismaModule, PrismaService
```

### Module Structure

Each module follows this pattern:

```
src/modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.repository.ts
├── <module>.utilities.ts
├── <module>.types.ts
├── <module>.enums.ts
├── <module>.constants.ts
└── dto/
    └── <module>.dto.ts
```

---

## API Modules

| Module                   | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| **auth**                 | Login, JWT refresh, logout, token blacklist, /me with permissions |
| **alerts**               | Alert search, triage, investigation, ingestion, bulk ops          |
| **cases**                | Case CRUD, notes, timeline, linked alerts, artifacts              |
| **role-settings**        | Dynamic RBAC permission matrix management                         |
| **case-cycles**          | Case cycle management                                             |
| **incidents**            | Incident lifecycle management                                     |
| **hunts**                | Threat hunting sessions with AI                                   |
| **intel**                | MISP threat intel, IOC search and matching                        |
| **connectors**           | Connector CRUD, test, toggle (9 types)                            |
| **connector-sync**       | Connector data synchronization                                    |
| **connector-workspaces** | Workspace-specific operations (Wazuh, Graylog)                    |
| **dashboards**           | KPIs, trends, MITRE stats, pipeline health                        |
| **data-explorer**        | Log/event search across connectors                                |
| **correlation**          | Correlation rule engine                                           |
| **detection-rules**      | Detection rule management                                         |
| **normalization**        | Log normalization pipelines                                       |
| **attack-paths**         | Attack path analysis                                              |
| **cloud-security**       | Cloud account findings                                            |
| **compliance**           | Compliance framework tracking                                     |
| **vulnerabilities**      | Vulnerability tracking                                            |
| **ueba**                 | User and Entity Behavior Analytics                                |
| **soar**                 | Shuffle SOAR playbook management                                  |
| **ai-agents**            | AI agent management                                               |
| **ai**                   | AI-powered analysis (Bedrock)                                     |
| **reports**              | Report generation (PDF, CSV, HTML)                                |
| **notifications**        | WebSocket real-time notifications                                 |
| **tenants**              | Multi-tenant CRUD                                                 |
| **users**                | User profile and preferences                                      |
| **audit-logs**           | Audit trail queries                                               |
| **app-logs**             | Application logging                                               |
| **health**               | System health checks                                              |
| **system-health**        | Detailed service monitoring                                       |

---

## Authentication & Authorization

### Token Lifecycle

1. **Login** — Issues access token (15m) + refresh token (7d), both with `jti` and `tokenType`. Response includes `permissions[]` array based on tenant + role
2. **Refresh** — Verifies token type + blacklist, issues new pair, blacklists old refresh JTI
3. **Logout** — Blacklists both access and refresh JTIs in Redis
4. **Every request** — Verifies JWT, checks `tokenType === 'access'`, checks Redis blacklist, validates user is active

### Role Hierarchy

| Role                 | Level | Description         |
| -------------------- | ----- | ------------------- |
| `GLOBAL_ADMIN`       | 1     | Platform admin      |
| `TENANT_ADMIN`       | 2     | Tenant admin        |
| `SOC_ANALYST_L2`     | 3     | Senior analyst      |
| `THREAT_HUNTER`      | 4     | Threat hunter       |
| `SOC_ANALYST_L1`     | 5     | Junior analyst      |
| `EXECUTIVE_READONLY` | 6     | Read-only executive |

### Dynamic RBAC & Permission System

AuraSpear uses a **database-backed permission matrix** replacing static role checks. The system consists of two Prisma models — `PermissionDefinition` (the catalog of ~70 granular permissions) and `RolePermission` (the per-tenant, per-role grant table).

**Key behaviors:**

- **`@RequirePermission()` decorator** on all endpoints replaces the old `@Roles()` approach. The `PermissionsGuard` resolves the current user's role + tenant, looks up granted permissions, and allows or denies access.
- **GLOBAL_ADMIN always has full access** — the guard short-circuits for this role.
- **In-memory cache with 5-minute TTL** for permission lookups, avoiding a database hit on every request.
- **Login and `/auth/me` return a `permissions[]` array** so the frontend can drive UI visibility from the actual permission set.

#### Permission Categories (~70 permissions)

Permissions follow a `MODULE_ACTION` naming convention. Examples:

| Permission                | Description                     |
| ------------------------- | ------------------------------- |
| `ALERTS_VIEW`             | View alert list and details     |
| `ALERTS_ESCALATE`         | Escalate alerts to incidents    |
| `ALERTS_BULK_ACKNOWLEDGE` | Bulk acknowledge alerts         |
| `ALERTS_BULK_CLOSE`       | Bulk close alerts               |
| `INCIDENTS_VIEW`          | View incident list and details  |
| `INCIDENTS_CHANGE_STATUS` | Change incident status          |
| `INCIDENTS_ADD_TIMELINE`  | Add timeline entries            |
| `CASES_CREATE`            | Create new cases                |
| `HUNTS_EXECUTE`           | Execute threat hunting sessions |
| `CONNECTORS_MANAGE`       | Create/update/delete connectors |
| `USERS_MANAGE`            | Manage tenant users             |
| `ROLE_SETTINGS_VIEW`      | View role permission matrix     |
| `ROLE_SETTINGS_MANAGE`    | Update role permissions         |

#### Role Settings API

| Method | Endpoint               | Description                                 |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/role-settings`       | Retrieve the full permission matrix         |
| PUT    | `/role-settings`       | Update role permissions (GLOBAL_ADMIN only) |
| POST   | `/role-settings/reset` | Reset permissions to seeded defaults        |

The seeder populates default permissions for all roles, ensuring every fresh deployment has a working RBAC baseline.

### Bulk Alert Operations

| Method | Endpoint                   | Description                      |
| ------ | -------------------------- | -------------------------------- |
| POST   | `/alerts/bulk/acknowledge` | Bulk acknowledge multiple alerts |
| POST   | `/alerts/bulk/close`       | Bulk close multiple alerts       |

Both endpoints accept an array of alert IDs and require the corresponding bulk permission.

### GLOBAL_ADMIN Tenant Switching

GLOBAL_ADMIN users can send `X-Tenant-Id` header to switch tenant context. The auth guard overrides `request.user.tenantId` so all `@TenantId()` decorators return the switched tenant automatically.

### User Management

- **Soft delete**: `status: 'inactive'` (restorable)
- **Block**: `status: 'suspended'` (unblockable)
- **Protected users**: Seeded GLOBAL_ADMINs have `isProtected: true` — cannot be deleted, blocked, or role-changed

---

## Security Hardening

| Feature                      | Implementation                                                   |
| ---------------------------- | ---------------------------------------------------------------- |
| **Rate limiting**            | Tiered: Auth 5/min, CRUD 30/min, Bulk 5/min, AI 10/min           |
| **Token revocation**         | Redis-backed JTI blacklist with TTL                              |
| **Encryption at rest**       | AES-256-GCM for connector configs                                |
| **SSRF protection**          | URL validation at input time + private IP blocking               |
| **ES query sanitization**    | Strips `script`, `_search`, `_mapping`, `_cluster` patterns      |
| **Timing attack prevention** | Constant-time bcrypt comparison for missing users                |
| **Error sanitization**       | File paths stripped, messages truncated to 500 chars             |
| **Security headers**         | Helmet (CSP, HSTS 1yr, X-Frame-Options: DENY)                    |
| **Body size limit**          | 1MB global, 64KB per JSON field                                  |
| **Request tracing**          | X-Request-ID middleware (UUID per request)                       |
| **Password redaction**       | Pino `redact` array covers all credential fields in logs         |
| **Audit logging**            | All mutations logged via AuditInterceptor                        |
| **Source maps**              | Disabled in production                                           |
| **Env validation**           | Zod schema rejects zero-entropy keys and localhost in production |

---

## Connector Integrations

| Connector     | Purpose               | Auth Type         |
| ------------- | --------------------- | ----------------- |
| Wazuh Manager | SIEM alerts & agents  | Username/Password |
| Wazuh Indexer | OpenSearch log search | Username/Password |
| Graylog       | Log management        | Username/Password |
| Velociraptor  | EDR / DFIR            | Username/Password |
| Grafana       | Metrics dashboards    | API Key           |
| InfluxDB      | Time-series data      | Token             |
| MISP          | Threat intelligence   | Auth Key          |
| Shuffle       | SOAR workflows        | API Key           |
| AWS Bedrock   | AI analysis           | IAM credentials   |

All connector configs are encrypted with AES-256-GCM and validated with per-type Zod schemas before storage.

---

## Database & Seed Data

### Schema

PostgreSQL via Prisma with 20+ models including: `Tenant`, `TenantUser`, `TenantMembership`, `ConnectorConfig`, `Alert`, `Case`, `CaseNote`, `CaseTimeline`, `HuntSession`, `HuntEvent`, `IntelIOC`, `IntelMispEvent`, `AuditLog`, `AiAuditLog`, `Incident`, `SavedQuery`, `PermissionDefinition`, `RolePermission`, and domain-specific models for compliance, vulnerabilities, UEBA, SOAR, detection rules, and correlation.

### Seeding

Seeds are **idempotent** — safe to run multiple times. They create:

- Default tenants with deterministic UUIDs
- Protected GLOBAL_ADMIN users
- Default permission definitions (~70 granular permissions)
- Default role-permission assignments for all roles per tenant
- Sample connector configs (credentials from env vars, no hardcoded passwords)
- Sample alerts, cases, and lookup data

```bash
npm run prisma:seed
```

---

## Docker

### Compose Files

| File                            | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `docker-compose.yml`            | Production (Postgres + Redis + Backend)          |
| `docker-compose.dev.yml`        | Development (+ PgAdmin, hot-reload)              |
| `docker-compose.prod.yml`       | Production build (only port 4000 exposed)        |
| `docker-compose.infra.yml`      | Infrastructure only (Postgres + Redis + PgAdmin) |
| `docker-compose.connectors.yml` | Security connectors (Wazuh, Graylog, etc.)       |

### Quick Commands

```bash
npm run docker:infra       # Start Postgres + Redis + PgAdmin
npm run docker:dev         # Full dev environment
npm run docker:prod        # Production build
npm run docker:connectors  # Security tool containers
npm run docker:all         # Everything
```

> **Production**: Internal ports (5432, 6379, 5050) are not exposed. Only API port 4000 is accessible.

---

## NPM Scripts

```bash
# Development
npm run start:dev          # Dev with watch mode
npm run start:debug        # Debug with watch

# Build & Production
npm run build              # Production build
npm start                  # Migrations + seed + production server

# Validation (run before committing)
npm run validate           # typecheck + lint:strict + format:check
npm run validate:full      # validate + tests + production build
npm run validate:fix       # lint:fix + format

# Database
npm run prisma:migrate     # Run migrations (dev)
npm run prisma:seed        # Seed database
npm run prisma:studio      # Open Prisma Studio

# Testing
npm test                   # Unit tests
npm run test:cov           # With coverage
npm run test:e2e           # End-to-end tests
```

## Contributor Guides

- Migrations and seeds: [`docs/migrations-and-seeds.md`](./docs/migrations-and-seeds.md)
- Permissions and roles: [`docs/permissions-and-roles.md`](./docs/permissions-and-roles.md)
- Adding connectors: [`docs/adding-connectors.md`](./docs/adding-connectors.md)
- AI agent safety: [`docs/ai-agent-safety.md`](./docs/ai-agent-safety.md)
- AI automation system: [`docs/AI-AUTOMATION.md`](./docs/AI-AUTOMATION.md) -- 28-agent catalog, execution flows, configuration, safety
- AI provider routing: [`docs/AI-ROUTING.md`](./docs/AI-ROUTING.md) -- Bedrock/LLM APIs/OpenClaw selection, fallbacks, capability matrix
- Permissions reference: [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md) -- Complete 136-permission matrix across 12 roles
- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Install and local environment: [`INSTALL.md`](./INSTALL.md)

---

## Code Quality

### Enforced Rules

- **No `any`** — Use `unknown`, generics, or proper types
- **No ESLint disables** — Fix root causes
- **No `console.log`** — Use NestJS `Logger`
- **No raw string literals** — Use enums
- **No inline types** — All in `*.types.ts`
- **No inline constants/enums** — All in `*.constants.ts` / `*.enums.ts`
- **No Prisma in services** — All through repository
- **No business logic in controllers** — Delegate to services
- **No logic in repositories** — Pure data access
- **Explicit return types** on all functions
- **`.max()` on all Zod string/array fields**
- **`BusinessException` with `messageKey`** for all errors (i18n in 6 languages)
- **`tenantId` in every `update()`/`delete()` where clause**

### Pre-Commit Hooks

Husky + lint-staged runs on every commit:

1. ESLint on staged `.ts` files
2. TypeScript type check (`tsc --noEmit`)
3. Prettier formatting

### Commit Convention

Conventional Commits enforced by commitlint: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
