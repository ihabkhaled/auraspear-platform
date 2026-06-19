# Audit 01 — File Map

Annotated directory map of the two application source trees:
`apps/web/src` (`@auraspear/web`, Next.js 16 App Router) and
`apps/api/src` (`@auraspear/api`, NestJS 11).

Every folder below was confirmed against the real filesystem. Counts are
approximate snapshots of the directory at audit time, not contractual numbers.

> Note: the per-app `CLAUDE.md` files describe a smaller, idealized layout. The
> live tree is substantially larger (43 web component domains, 38 API modules).
> Where the docs and the code diverge, this map follows the **code**.

---

## `apps/web/src` — Next.js frontend

Top-level children: `app/`, `components/`, `enums/`, `hooks/`, `i18n/`,
`lib/`, `services/`, `stores/`, `types/`. There are **no files at the `src`
root** and **no `src/middleware.ts`** (the CLAUDE.md references a middleware
file, but none exists in the tree — route protection is handled via the
`(portal)` layout and the API proxy, not Next middleware).

```
apps/web/src/
├── app/                      # Next.js App Router (routes + server API proxy)
│   ├── (auth)/               # Auth route group — unauthenticated shell
│   │   ├── login/            # Login page
│   │   └── callback/         # OIDC callback page
│   ├── (portal)/             # Main authenticated portal (41 route folders)
│   │   ├── admin/            # role-settings, system, tenant, users-control
│   │   ├── alerts/           # Alert list
│   │   ├── cases/            # Cases list, [id] detail, cycles
│   │   ├── incidents/        # Incident management
│   │   ├── connectors/       # Connector mgmt, [type], llm
│   │   ├── correlation/      # Correlation rules
│   │   ├── detection-rules/  # Detection rule management
│   │   ├── normalization/    # Normalization pipelines
│   │   ├── dashboard/        # Main dashboard + mssp
│   │   ├── hunt/             # Threat hunting
│   │   ├── intel/            # Threat intelligence
│   │   ├── jobs/             # Background job monitor
│   │   ├── explorer/         # Data explorer (logs, endpoints, metrics,
│   │   │                     #   pipelines, dashboards, sync-jobs,
│   │   │                     #   threat-intel, automation)
│   │   ├── soar/             # SOAR playbooks
│   │   ├── ueba/             # User & entity behavior analytics
│   │   ├── entities/         # Entity inventory
│   │   ├── attack-paths/     # Attack path graphs
│   │   ├── cloud-security/   # Cloud security posture
│   │   ├── compliance/       # Compliance views
│   │   ├── vulnerabilities/  # Vulnerability management
│   │   ├── knowledge/        # Knowledge base
│   │   ├── reports/          # Reporting
│   │   ├── notifications/    # Notification center
│   │   ├── system-health/    # System health
│   │   ├── profile/          # User profile
│   │   ├── settings/         # User settings
│   │   └── ai-*/             # AI surfaces: ai-chat, ai-agents,
│   │                         #   ai-agent-graph, ai-config, ai-eval,
│   │                         #   ai-findings, ai-finops, ai-handoffs,
│   │                         #   ai-history, ai-memory, ai-ops, ai-rag,
│   │                         #   ai-search, ai-simulations, ai-transcripts
│   ├── api/                  # Server-side route handlers — backend proxies
│   │                         #   (~50 folders: alerts, cases, connectors,
│   │                         #   incidents, ai, ai-agents, rag, osint,
│   │                         #   role-settings, members, user-memory, …)
│   ├── serwist/              # Service-worker route (PWA via Serwist)
│   ├── layout.tsx            # Root layout (i18n, fonts, providers, Toaster)
│   ├── providers.tsx         # Client providers (QueryClient, Theme, i18n)
│   ├── page.tsx              # Home redirect
│   ├── globals.css           # Global CSS + status/severity class system
│   ├── sw.ts                 # Service-worker entry (excluded from main tsc)
│   └── favicon.ico
│
├── components/               # React components, grouped by domain (43 folders)
│   ├── ui/                   # shadcn/ui base primitives (barrel: @/components/ui)
│   ├── common/               # DataTable, PageHeader, Toast, SweetAlert,
│   │                         #   AiConnectorSelect, etc. (barrel: @/components/common)
│   ├── layout/               # App chrome (Sidebar, Topbar, …)
│   ├── charts/               # recharts visualizations
│   ├── <domain>/             # One folder per feature domain — mirrors the
│   │                         #   portal routes: alerts, cases, incidents,
│   │                         #   connectors, correlation, detection-rules,
│   │                         #   normalization, dashboard, hunt, intel, jobs,
│   │                         #   explorer, soar, ueba, entities, attack-paths,
│   │                         #   cloud-security, compliance, vulnerabilities,
│   │                         #   knowledge, reports, notifications,
│   │                         #   system-health, profile, settings, admin
│   └── ai-*/                 # AI component domains: ai-agents, ai-agent-graph,
│                             #   ai-config, ai-eval, ai-findings, ai-finops,
│                             #   ai-handoffs, ai-memory, ai-ops, ai-search,
│                             #   ai-simulations, ai-transcripts, ai-renderer,
│                             #   rag-observability
│
├── hooks/                    # ~384 custom hooks (one per file, barrel @/hooks).
│                             #   ALL hook calls extracted here; .tsx files hold
│                             #   only JSX. Page hooks orchestrate query/mutation/
│                             #   form/state per page.
│
├── services/                # ~45 API service singletons — call the Axios
│                             #   instance, hit the Next.js /api proxy routes
│                             #   (barrel: @/services)
│
├── stores/                  # Zustand global stores (barrel: @/stores)
│   ├── auth.store.ts         # JWT tokens + user info (auth-storage)
│   ├── tenant.store.ts       # Switched tenant ID for GLOBAL_ADMIN
│   ├── ai-connector.store.ts # Globally shared AI connector selection
│   ├── filter.store.ts       # Shared filter state
│   ├── hunt.store.ts         # Hunt UI state
│   ├── notification.store.ts # Notification UI state
│   ├── ui.store.ts           # Misc UI state
│   └── index.ts              # Barrel
│
├── enums/                   # ~53 enum files — ALL string-literal types live
│                             #   here (barrel @/enums); no inline string unions
│
├── types/                   # ~45 domain type files — ALL interfaces/types
│                             #   (barrel @/types); none inline in hooks/services
│
├── lib/                     # Utilities, API clients, constants, validation
│   ├── api.ts                # Pre-configured Axios instance
│   ├── api-error.ts          # getErrorKey() — extract i18n keys from errors
│   ├── backend-client.ts /   # Server-side backend HTTP clients +
│   │   backend-proxy.ts      #   proxyToBackend() used by /api route handlers
│   ├── auth-session.ts,      # Session, cookies, persisted-storage helpers
│   │   cookies.ts,
│   │   persist-storage.ts
│   ├── dayjs.ts              # Date formatting (NEVER import dayjs directly)
│   ├── utils.ts              # cn(), lookup(), shared helpers
│   ├── column-renderers.tsx  # DataTable cell renderers
│   ├── <domain>.utils.ts     # Per-domain pure helpers (alert, case, incident,
│   │                         #   connector, dashboard, intel, hunt, osint, …)
│   ├── permissions.ts,       # RBAC client helpers
│   │   roles.ts
│   ├── constants/            # ~37 domain constant files (@/lib/constants/*)
│   ├── validation/           # ~17 Zod schema files (<domain>.schema.ts)
│   └── types/                # 1 lib-local type file
│
└── i18n/                    # next-intl config + 6 locale JSON files
                              #   (en, ar, es, fr, de, it) + index.ts
```

---

## `apps/api/src` — NestJS BFF backend

Backend-for-Frontend: the frontend never calls Wazuh/OpenSearch/MISP directly.
Strict layering — `Controller → Service → Repository → Prisma`, with all
business logic in `*.utilities.ts`.

```
apps/api/src/
├── main.ts                  # Bootstrap (Helmet, CORS, body limit, throttling,
│                            #   X-Request-ID, request timeout)
├── app.module.ts            # Root module (pino logging + redaction, global wiring)
├── app.controller.ts        # Root controller
│
├── common/                  # Cross-cutting framework concerns
│   ├── decorators/           # @CurrentUser, @Roles, @Public, @TenantId,
│   │                         #   @RequirePermission
│   ├── guards/               # auth, tenant, roles, permissions, csrf guards
│   ├── interceptors/         # audit.interceptor (credential-redacting audit log)
│   ├── filters/              # GlobalExceptionFilter (sanitizes paths, Prisma errors)
│   ├── pipes/                # ZodValidationPipe
│   ├── middleware/           # rls.middleware (row-level-security context)
│   ├── interfaces/           # Shared interfaces (AuthenticatedRequest, JwtPayload)
│   ├── enums/                # Shared enums (incl. Permission enum)
│   ├── constants/            # Shared constants
│   ├── dto/                  # Shared DTOs
│   ├── exceptions/           # BusinessException + related
│   ├── services/             # app-logger.*, service-logger, startup-health.*
│   ├── modules/              # Reusable infra modules (axios, websocket)
│   ├── ocsf/                 # OCSF schema: enums, interfaces, mapper
│   └── utils/                # Common utilities (.utility.ts):
│                             #   encryption (AES-256-GCM), ssrf, mask, redaction,
│                             #   es-sanitize, query, batch, date-time, rls,
│                             #   role, sequence-number, status-transitions,
│                             #   error-extraction (+ matching .constants/.types)
│
├── config/                  # env.validation.ts — Zod env schema (fail-fast)
│
├── prisma/                  # prisma.module.ts, prisma.service.ts (pooled),
│                            #   prisma.constants.ts
│
├── redis/                   # redis.module.ts, redis.constants.ts, index.ts
│
└── modules/                 # 38 feature modules (see per-module pattern below)
    ├── auth/                 # OIDC callback, token exchange, token-blacklist
    ├── tenants/              # Tenant management
    ├── users/                # User profile + preferences
    ├── users-control/        # User admin (block/unblock, soft delete/restore)
    ├── role-settings/        # Dynamic RBAC / permission definitions
    ├── alerts/               # Wazuh alert management
    ├── cases/                # Case mgmt + AI case copilot
    ├── case-cycles/          # Case lifecycle cycles
    ├── incidents/            # Incident management
    ├── connectors/           # Connector configs + service adapters
    ├── connector-sync/       # Connector sync jobs
    ├── connector-workspaces/ # Connector workspace grouping
    ├── correlation/          # Correlation rule engine
    ├── detection-rules/      # Detection rules
    ├── normalization/        # Normalization pipelines
    ├── hunts/                # Threat hunting (state-machine runs)
    ├── intel/                # Threat intelligence (MISP)
    ├── entities/             # Entity inventory
    ├── attack-paths/         # Attack path analysis
    ├── ueba/                 # User & entity behavior analytics
    ├── cloud-security/       # Cloud security posture
    ├── compliance/           # Compliance
    ├── vulnerabilities/      # Vulnerability management
    ├── knowledge/            # Knowledge base
    ├── soar/                 # SOAR playbooks
    ├── data-explorer/        # Data exploration endpoints
    ├── dashboards/           # Dashboard aggregation
    ├── reports/              # Report generation
    ├── notifications/        # Notifications (WebSocket gateway)
    ├── jobs/                 # Background job system + handlers
    ├── health/               # Health checks
    ├── system-health/        # System health aggregation
    ├── audit-logs/           # Audit log query
    ├── app-logs/             # Application log query
    ├── ai/                   # AI analysis (hunt, investigate, explain)
    ├── ai-agents/            # Multi-agent AI execution
    ├── agent-config/         # AI agent configuration
    └── osint-executor/       # OSINT source execution
```

### Per-module file pattern (NestJS)

Each module follows the strict layered convention. Example — `modules/cases/`:

```
cases/
├── cases.module.ts          # Module wiring
├── cases.controller.ts      # HTTP routing + delegation only (no logic)
├── cases.service.ts         # Thin orchestrator (no Prisma, no inline logic)
├── cases.repository.ts      # Pure Prisma data access (every method takes tenantId)
├── cases.utilities.ts       # All business logic (mappers, validators, builders)
├── cases.types.ts           # Interfaces/types for the module
├── cases.constants.ts       # Module constants
├── ai-case-copilot.controller.ts / .service.ts   # Sub-feature (AI copilot)
└── dto/                     # Zod DTO schemas (one per request shape):
    ├── create-case.dto.ts, update-case.dto.ts, assign-case.dto.ts
    ├── create-note.dto.ts, create-comment.dto.ts, update-comment.dto.ts
    ├── create-task.dto.ts, update-task.dto.ts, create-artifact.dto.ts
    ├── link-alert.dto.ts
    └── list-cases-query.dto.ts, list-comments-query.dto.ts,
        list-notes-query.dto.ts, search-mentionable-users-query.dto.ts
```

Not every module contains all files (e.g. `dashboards/` and `health/` are
lighter; `connectors/` adds a `services/` subfolder of per-vendor adapters such
as wazuh, opensearch, misp, shuffle, bedrock). Some modules add extra
controllers/services for sub-features alongside the core set above.

---

## Cross-cutting notes

- **Frontend ↔ backend contract**: every backend endpoint the UI calls has a
  matching `apps/web/src/app/api/.../route.ts` proxy (~50 proxy folders mirror
  the ~38 API modules; some proxies cover sub-features like `osint`, `rag`,
  `members`, `user-memory`, `llm-connectors`).
- **i18n parity**: 6 locale files exist on the web side
  (`en/ar/es/fr/de/it`); backend `BusinessException` messageKeys must mirror
  into these locale files.
- **AI surfaces** are a first-class, heavily-represented domain on both sides —
  ~15 `ai-*` portal routes, ~14 `ai-*` component folders, and 4 AI-related
  backend modules (`ai`, `ai-agents`, `agent-config`, `osint-executor`).
