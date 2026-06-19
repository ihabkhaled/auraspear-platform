# PRODUCT_CONTEXT.md — AuraSpear product surfaces

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code. This file is step 3 for any task
> that touches product behavior, modules, or the SOC/AI user-facing surface. Do
> not edit before you have read the rules and skills linked below.

This is the **product orientation** file: what AuraSpear is, what modules exist,
and where the product surfaces live in code. For deep narrative (personas,
workflows, differentiators, gaps), read [`../docs/PRODUCT.md`](../docs/PRODUCT.md)
— this file is the concise map; that doc is the full story.

---

## What this area is

AuraSpear is an **AI-first, multi-tenant SOC platform** (SIEM alerts, cases,
incidents, threat hunting, intel/IOC enrichment, detection engineering, SOAR,
cloud security, compliance, vulnerabilities) with an AI layer (chat with memory,
a searchable findings workspace, and a fleet of governed agents) woven into the
investigation lifecycle. See the 60-second version in
[`../AGENTS.md`](../AGENTS.md) §2.

Architecture is **Backend-for-Frontend (BFF)**:

- **`apps/web`** (`@auraspear/web`) — Next.js 16 / React 19 / Tailwind 4 SOC
  console. It **never** calls Wazuh/OpenSearch/MISP/Shuffle directly; it proxies
  every backend call through `apps/web/src/app/api/*` routes (`proxyToBackend()`).
- **`apps/api`** (`@auraspear/api`) — NestJS 11 / Prisma 7 / PostgreSQL / Redis
  BFF. The single integration point for every downstream tool, AI provider, and
  the database.

Roles (most → least privileged): `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`,
`TENANT_ADMIN`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`,
`EXECUTIVE_READONLY` (`apps/api/src/modules/role-settings/constants/default-permissions.ts`).
`GLOBAL_ADMIN` bypasses permission checks and can switch tenant via `X-Tenant-Id`.

---

## Where files live

**Backend domain modules** — `apps/api/src/modules/<module>/` (each module
follows the strict `controller → service → repository → prisma` layering plus
`*.utilities.ts` / `*.types.ts` / `*.enums.ts` / `*.constants.ts` / `dto/`;
see [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md)):

| Domain                  | Backend module(s)                                            | Web route(s)                                      |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Alerts (SIEM)           | `alerts`                                                     | `alerts`                                          |
| Cases                   | `cases`, `case-cycles`                                       | `cases`                                           |
| Incidents               | `incidents`                                                  | `incidents`                                       |
| Threat hunting          | `hunts`                                                      | `hunt`, `explorer` (`data-explorer`)              |
| Threat intel            | `intel`                                                      | `intel`                                           |
| Correlation/detection   | `correlation`, `detection-rules`, `normalization`            | `correlation`, `detection-rules`, `normalization` |
| SOAR                    | `soar`                                                       | `soar`                                            |
| Connectors              | `connectors`, `connector-sync`, `connector-workspaces`       | `connectors`                                      |
| Cloud security          | `cloud-security`                                             | `cloud-security`                                  |
| Compliance / vulns      | `compliance`, `vulnerabilities`                              | `compliance`, `vulnerabilities`                   |
| Attack paths / entities | `attack-paths`, `entities`, `ueba`                           | `attack-paths`, `entities`, `ueba`                |
| Knowledge / reports     | `knowledge`, `reports`                                       | `knowledge`, `reports`                            |
| Dashboards / jobs       | `dashboards`, `jobs`                                         | `dashboard`, `jobs`                               |
| AI                      | `ai`, `ai-agents`, `agent-config`, `osint-executor`          | `ai-*` (see below)                                |
| Notifications           | `notifications`                                              | `notifications`                                   |
| Admin / governance      | `tenants`, `users`, `users-control`, `role-settings`, `auth` | `admin`, `settings`, `profile`                    |
| Observability           | `health`, `system-health`, `app-logs`, `audit-logs`          | `system-health`                                   |

Run `ls apps/api/src/modules` and `ls "apps/web/src/app/(portal)"` for the live
list — module/route sets grow; treat the table as a map, not an inventory.

**AI workspace surfaces (web `(portal)`):** `ai-chat`, `ai-findings`,
`ai-search`, `ai-agents`, `ai-agent-graph`, `ai-config`, `ai-memory`,
`ai-history`, `ai-transcripts`, `ai-handoffs`, `ai-ops`, `ai-finops`, `ai-eval`,
`ai-rag`, `ai-simulations`. AI foundations (safety/redaction/routing/eval/
prompts) live in `packages/ai` (`@auraspear/ai`).

**Frontend structure** (`apps/web/src`, see [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md)):
pages in `app/(portal)/<route>/`, proxy routes in `app/api/`, components in
`components/<domain>/`, page logic in `hooks/`, API calls in `services/`, global
state in `stores/`, enums in `enums/`, types in `types/`, i18n in `i18n/`.

**Cross-cutting:** DB schema/migrations/seed in `apps/api/prisma`; AI agent
catalog in `apps/api/src/common/enums/ai-agent-config.enum.ts`; permission enum
in `apps/api/src/common/enums/permission.enum.ts`.

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the area rules for your task:

- **Global:** [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
  [`branch-safety.md`](../rules/global/branch-safety.md),
  [`repo-navigation.md`](../rules/global/repo-navigation.md),
  [`validation-gates.md`](../rules/global/validation-gates.md).
- **Frontend (product UI):** [`../rules/frontend/`](../rules/frontend/) —
  `component-rules.md`, `hook-service-rules.md`, `api-client-rules.md`,
  `i18n-rules.md`, `ai-ui-rules.md`.
- **Backend (modules/endpoints):** [`../rules/backend/`](../rules/backend/) —
  `api-rules.md`, `layering-rules.md`, `tenant-permission-rules.md`,
  `dto-validation-rules.md`, `prisma-rules.md`.
- **AI:** [`../rules/ai/`](../rules/ai/) — `ai-output-rules.md`,
  `ai-approval-rules.md`, `ai-agent-rules.md`, `ai-memory-rules.md`,
  `ai-governance.md`.
- **Security:** [`../rules/security/`](../rules/security/) — `security-rules.md`,
  `secret-handling.md`, `ai-security.md`, `docker-security.md`,
  `dependency-audit.md`.

**Invariants that govern every product change (from [`../AGENTS.md`](../AGENTS.md) §6–7):**

- **Tenant isolation** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId` (`where: { id, tenantId }`). No cross-tenant data, ever.
- **RBAC** — every backend endpoint has `@RequirePermission(...)`; every new
  frontend surface mirrors the permission enum + proxy route. Never bypass.
- **No auth / secret / permission bypass** in any environment (no `NODE_ENV`
  shortcuts); secrets are env-loaded with no fallbacks; connector creds are
  AES-256-GCM encrypted at rest.
- **AI safety** — destructive AI actions are **approval-required** (persist an
  `ApprovalRequest` before executing); **never render raw AI output as HTML**
  (markdown via a safe renderer or plain text); AI output carries provenance;
  redact PII/secrets before model calls.
- **No `any`** (`@typescript-eslint/no-explicit-any: error`); **pnpm only**;
  **Node 22**.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/`](../skills/):

- Add a frontend page → [`../skills/frontend/add-page.md`](../skills/frontend/add-page.md)
- Add a component / hook / API client / i18n key →
  [`../skills/frontend/`](../skills/frontend/) (`add-component.md`,
  `add-hook.md`, `add-api-client.md`, `add-i18n-key.md`)
- Add an API endpoint / module → [`../skills/backend/add-endpoint.md`](../skills/backend/add-endpoint.md),
  [`add-module.md`](../skills/backend/add-module.md)
- Add a permission (end-to-end) → [`../skills/backend/add-permission.md`](../skills/backend/add-permission.md)
- Add a Prisma model / connector / background job →
  [`../skills/backend/`](../skills/backend/) (`add-prisma-model.md`,
  `add-connector.md`, `add-background-job.md`)
- Add an AI feature / agent / panel →
  [`../skills/ai/add-ai-feature.md`](../skills/ai/add-ai-feature.md),
  [`add-ai-agent.md`](../skills/ai/add-ai-agent.md),
  [`../skills/frontend/add-ai-panel.md`](../skills/frontend/add-ai-panel.md)
- Validate a release → [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md)

---

## What docs to read

- [`../docs/PRODUCT.md`](../docs/PRODUCT.md) — full product narrative (personas,
  workflows, differentiators, gaps). Primary companion to this file.
- [`../docs/DOCS_INDEX.md`](../docs/DOCS_INDEX.md) — central docs index.
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (+ `docs/architecture/`) —
  BFF structure, layering, data flow.
- [`../docs/AI.md`](../docs/AI.md) (+ `docs/ai/`) — AI subsystem, providers,
  agents, memory, governance.
- [`../docs/SECURITY.md`](../docs/SECURITY.md) (+ `docs/security/`) — security
  model and invariants.
- [`../memory/BUSINESS_MEMORY.md`](../memory/BUSINESS_MEMORY.md) and
  [`../memory/PROJECT_MEMORY.md`](../memory/PROJECT_MEMORY.md) — stable business
  and project truths.

---

## Common mistakes

- **Adding a backend endpoint without its Next.js proxy route** — the web app
  proxies all backend calls through `apps/web/src/app/api/`; a missing route
  returns 404 HTML, not JSON. (`apps/web/CLAUDE.md` rule 33.)
- **Adding a permission partially** — a new permission must be wired end-to-end
  in one change (backend enum, `permission-definitions.ts`, `default-permissions.ts`,
  `@RequirePermission()`, Prisma migration with `WHERE NOT EXISTS`, frontend enum
  mirror, proxy route, i18n in all 6 locales, `prisma db seed`). See
  [`../skills/backend/add-permission.md`](../skills/backend/add-permission.md).
- **Querying/mutating without `tenantId`** — every Prisma `update`/`delete` needs
  `where: { id, tenantId }`; AI investigation must validate alert tenant ownership.
- **Rendering raw AI output as HTML** — banned. Use a safe markdown renderer; AI
  surfaces must also show loading/error/confidence/provider and a regenerate
  affordance.
- **Hardcoding a single AI provider** — routing must cascade
  (Bedrock → LLM APIs → OpenClaw Gateway) and fall back to a clearly-labeled
  `rule-based` response only when none are configured.
- **Hardcoding user-facing strings or string-literal types** — use `t()`
  (next-intl, 6 locales) and enums in `apps/web/src/enums/` (frontend) or
  `<module>.enums.ts` (backend); never raw `'active'` or `'foo' | 'bar'`.
- **Assuming the module table here is exhaustive** — confirm against the live
  `apps/api/src/modules` and `apps/web/src/app/(portal)` directories.

---

## Validation commands

Run from repo root (**pnpm only, Node 22**). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm typecheck          # blocking gate
pnpm build              # blocking gate
pnpm lint               # advisory (run + annotate)
pnpm format:check       # advisory
pnpm test               # unit tests (advisory)
pnpm test:e2e           # Playwright e2e (advisory)
pnpm validate           # typecheck + lint + format:check
pnpm validate:full      # extended validation
```

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
· gitleaks (no secrets) · CodeQL. **Advisory** gates are non-blocking today due
to tracked debt — still run and annotate. See
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md) and
[`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md).

> **Never claim a gate is green without running it.** Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
> </content>
> </invoke>
