# AuraSpear — User Journeys (mapped to routes, endpoints, permissions)

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point — it defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This file is a **business
> artifact** that describes how a human analyst moves through the product; it is
> **not** a source of truth for routing, authorization, or AI behavior. Those live
> in code (cited inline). **When this doc and the code disagree, the code wins**
> and this doc should be corrected.

## How to read this file

Each journey is a sequence of steps a real SOC user takes. Every step cites the
concrete artifacts that make it work:

- **Page** — a frontend route under
  `apps/web/src/app/(portal)/` (App Router, portal route group). The portal shell
  is `apps/web/src/app/(portal)/layout.tsx`; the login/callback screens live in
  the `(auth)` group (`apps/web/src/app/(auth)/`).
- **Proxy** — the Next.js BFF proxy route under `apps/web/src/app/api/`. The
  frontend **never** calls the NestJS API or Wazuh/OpenSearch/MISP directly — it
  proxies through `proxyToBackend()` (`apps/api/CLAUDE.md` rule 86 / `apps/web`
  rule 33). A missing proxy route returns 404 HTML, not JSON.
- **Endpoint** — the NestJS controller method in `apps/api/src/modules/<module>/`.
- **Permission** — the `@RequirePermission(Permission.X)` gate on that endpoint
  (`apps/api/src/common/enums/permission.enum.ts`). `GLOBAL_ADMIN` always passes
  (`apps/api/CLAUDE.md` rule 25); everyone else is gated by the dynamic,
  DB-backed permission matrix
  (`apps/api/src/modules/role-settings/constants/default-permissions.ts`).

Personas referenced below (Lina/L1, Marco/L2, Hana/Threat Hunter, etc.) are
defined in [`PERSONAS.md`](./PERSONAS.md). Business context is in
[`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md), [`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md),
and [`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md). The product surface is catalogued in
[`docs/PRODUCT.md`](../PRODUCT.md); the AI subsystem in [`docs/AI.md`](../AI.md)
(+ [`docs/ai/`](../ai/)); architecture in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

### Invariants that constrain every journey

These hold no matter which path the user takes (see [`AGENTS.md`](../../AGENTS.md)
§6–7, [`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/),
and the AI policy docs [`docs/ai/AI_APPROVAL_POLICY.md`](../ai/AI_APPROVAL_POLICY.md) /
[`docs/ai/AI_GOVERNANCE.md`](../ai/AI_GOVERNANCE.md)):

- **Tenant isolation** — every step only ever reads/writes the caller's own
  tenant's data; every query / `update` / `delete` is `tenantId`-scoped
  (`apps/api/CLAUDE.md` rules 8, 26). No journey crosses tenants.
- **RBAC** — every step that hits the API passes a `@RequirePermission(...)` gate.
  If the user lacks the permission, the step fails with a localized
  `BusinessException` (`messageKey`), even if the UI is reached another way.
- **No auth/secret/permission bypass** — there is no dev-mode shortcut, fake user,
  or env-gated skip anywhere in any journey (`apps/api/CLAUDE.md` rules 23, 56, 76).
- **AI suggests; humans approve destructive actions** — AI may analyze and
  propose, but any destructive action is `approval-required` and creates a
  persisted `ApprovalRequest` before execution
  (`apps/api/CLAUDE.md` rule 97; `AiActionCategory` in `apps/web`).
- **Raw AI output is never rendered as HTML** — AI is shown as markdown (safe
  renderer) or plain text, always with provenance (provider/model/confidence) and
  a regenerate/dismiss affordance (`apps/web` rules 42–43, 47).

Journeys are written in the order a new analyst typically encounters them.

---

## Journey 1 — Login and tenant selection

**Who:** every user. **Goal:** authenticate and land in the right tenant context.

| Step                               | Page / Proxy                                                     | Endpoint                                  | Permission                      |
| ---------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| 1. Enter email + password          | `apps/web/src/app/(auth)/login/page.tsx` (drives `useLoginPage`) | —                                         | `@Public()` route               |
| 2. Submit credentials              | `apps/web/src/app/api/auth/login`                                | `POST /auth/login` (`auth.controller.ts`) | `@Public()`                     |
| 3. Load identity                   | —                                                                | `GET /auth/me`                            | authenticated                   |
| 4. (Admin) list switchable tenants | —                                                                | `GET /auth/tenants`                       | `GLOBAL_ADMIN` / platform roles |
| 5. Enter portal                    | `apps/web/src/app/(portal)/layout.tsx`                           | —                                         | —                               |

**What happens under the hood:**

- The OIDC/JWT exchange issues an **access token (15m)** + **refresh token (7d)**,
  each carrying a `jti` and `tokenType` claim (`apps/api/CLAUDE.md` §"Token
  Lifecycle", rules 38, 45). Tokens are HS256-signed with an explicit algorithm
  (rule 29). Login is rate-limited to **5/min** (rule 32) and runs a constant-time
  bcrypt comparison even for non-existent emails to prevent enumeration (rule 52).
- On every subsequent request the `AuthGuard` re-validates: verifies the token,
  checks `tokenType === 'access'`, checks the Redis JTI blacklist, and confirms
  the user still exists and has an **active membership** (rules 31, 37; guard chain
  `AuthGuard → TenantGuard → RolesGuard`). A blocked/deleted user gets 401 and the
  frontend forces logout via `clearAuthAndRedirect()`.
- **Tenant selection (GLOBAL_ADMIN / platform operators only):** the
  `TenantSwitcher` component (`apps/web/src/components/layout/TenantSwitcher.tsx`)
  writes the chosen tenant into `useTenantStore` (`tenant-storage`). The Axios
  interceptor sends it as the `X-Tenant-Id` header; the `AuthGuard` overrides
  `request.user.tenantId` for GLOBAL_ADMIN only, so `@TenantId()` resolves to the
  switched tenant (`apps/web` CLAUDE.md "Tenant switching"; `apps/api` Key
  Principle 8). **Non-admin users cannot switch tenants** — the header is ignored.
  Client-supplied role headers are never trusted (`apps/api/CLAUDE.md` rule 76).

**Failure / edge cases:** invalid credentials → `errors.auth.invalidCredentials`;
suspended/inactive membership → 401; missing tenant context for a single-tenant
user → their JWT tenant is used directly (no switcher shown).

---

## Journey 2 — Dashboard triage (start of shift)

**Who:** SOC analysts, executives (read-only). **Goal:** get situational awareness
and decide what to work first.

| Step                   | Page / Proxy                           | Endpoint                   | Permission                  |
| ---------------------- | -------------------------------------- | -------------------------- | --------------------------- |
| Open the SOC dashboard | `apps/web/src/app/(portal)/dashboard/` | `dashboards.controller.ts` | `Permission.DASHBOARD_VIEW` |

The dashboard composes several read-only aggregations, each `tenantId`-scoped and
all gated by `DASHBOARD_VIEW`:

- `GET /dashboards/summary`, `/analytics-overview`, `/operations-overview`
- `GET /dashboards/alert-trend`, `/severity-distribution`
- `GET /dashboards/mitre-top-techniques`, `/top-targeted-assets`
- `GET /dashboards/pipeline-health`, `/recent-activity`

**Notes:** MSSP owners get a cross-customer roll-up at
`apps/web/src/app/(portal)/dashboard/mssp/` (one tenant context at a time — there
is no single cross-tenant view; see Journey 1 tenant switching). KPI cards,
severity bars, and the MITRE chart follow the design-system status/severity class
rules (`apps/web` rules 3, 40) — never static Tailwind colors. From here the user
pivots into alerts (Journey 3) for the highest-severity items.

---

## Journey 3 — Alert investigation

**Who:** L1/L2 analysts. **Goal:** decide whether an alert is benign, needs
ack/close, or must be escalated.

| Step                                | Page / Proxy                        | Endpoint                                                        | Permission                      |
| ----------------------------------- | ----------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| 1. Browse/filter alerts             | `apps/web/src/app/(portal)/alerts/` | `GET /alerts`                                                   | `Permission.ALERTS_VIEW`        |
| 2. Open one alert                   | `alerts/[id]`                       | `GET /alerts/:id`                                               | `Permission.ALERTS_VIEW`        |
| 3. Acknowledge (or bulk)            | —                                   | `POST /alerts/:id/acknowledge`, `POST /alerts/bulk/acknowledge` | `Permission.ALERTS_ACKNOWLEDGE` |
| 4. AI-assisted investigation        | —                                   | `POST /alerts/:id/investigate`                                  | `Permission.ALERTS_INVESTIGATE` |
| 5a. Close (false positive / benign) | —                                   | `POST /alerts/:id/close`, `POST /alerts/bulk/close`             | `Permission.ALERTS_CLOSE`       |
| 5b. Escalate (real threat)          | —                                   | `POST /alerts/:id/escalate`                                     | `Permission.ALERTS_ESCALATE`    |

**Key behaviors:**

- All search/filter/sort is **backend-driven** and debounced (`apps/web`
  "Search, Filter & Pagination"); the `<DataTable>` from `@/components/common` is
  used (never a raw `<table>`).
- **AI investigation (step 4)** must first verify the alert belongs to the
  caller's tenant before any model call (`apps/api/CLAUDE.md` rule 48). The
  response is `analysis-only` — it summarizes, suggests, and attributes a
  provider/model/confidence; it does **not** mutate the alert. Closing/escalating
  remains an explicit human action behind its own permission.
- Escalation (step 5b) is the bridge into case creation (Journey 4) or incident
  handling (Journey 5). Acknowledged/closed transitions are audit-logged.

---

## Journey 4 — Case creation and management

**Who:** L2 analysts, incident responders. **Goal:** turn one or more related
alerts into a tracked investigation with owner, notes, tasks, and artifacts.

| Step                     | Page / Proxy                       | Endpoint                                             | Permission                                         |
| ------------------------ | ---------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| 1. List/triage cases     | `apps/web/src/app/(portal)/cases/` | `GET /cases`, `GET /cases/stats`                     | `Permission.CASES_VIEW`                            |
| 2. Create a case         | —                                  | `POST /cases`                                        | `Permission.CASES_CREATE`                          |
| 3. Open a case           | `cases/[id]`                       | `GET /cases/:id`                                     | `Permission.CASES_VIEW`                            |
| 4. Link alerts           | —                                  | `POST /cases/:id/link-alert`                         | `Permission.CASES_UPDATE`                          |
| 5. Assign owner          | —                                  | `PATCH /cases/:id/assign`                            | `Permission.CASES_ASSIGN`                          |
| 6. Add notes / comments  | —                                  | `POST /cases/:id/notes`, `POST /cases/:id/comments`  | `Permission.CASES_ADD_COMMENT`                     |
| 7. Add tasks / artifacts | —                                  | `POST /cases/:id/tasks`, `POST /cases/:id/artifacts` | `Permission.CASES_ADD_TASK` / `CASES_ADD_ARTIFACT` |

**Integrity rules enforced server-side:**

- The **case number** is generated under a PostgreSQL advisory lock inside a
  transaction (`pg_advisory_xact_lock`) to avoid duplicate sequential numbers
  (`apps/api/CLAUDE.md` rule 43).
- A case **owner** must be an active member of the same tenant —
  `validateOwnerInTenant(ownerUserId, tenantId)` runs before create/update
  (rule 41). **Linked alerts** must belong to the same tenant (rule 42).
- **Sub-resources** (`/cases/:id/tasks/:taskId`, `/artifacts/:artifactId`,
  `/comments/:commentId`) validate parent-case ownership before touching the child
  (rule 75). Deletes carry their own permissions (`CASES_DELETE_COMMENT`,
  `CASES_DELETE_TASK`, `CASES_DELETE_ARTIFACT`).
- Case lifecycle/cycles live at `cases/cycles` and use the `CaseCycleStatus` enum
  (never raw strings — `apps/api/CLAUDE.md` rule 12).

---

## Journey 5 — Incident escalation

**Who:** L2 / incident responders / shift leads. **Goal:** promote a confirmed
threat into a managed incident with a timeline and a controlled status lifecycle.

| Step                                             | Page / Proxy                           | Endpoint                                     | Permission                                             |
| ------------------------------------------------ | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| 1. View incidents                                | `apps/web/src/app/(portal)/incidents/` | `GET /incidents`, `GET /incidents/stats`     | `Permission.INCIDENTS_VIEW`                            |
| 2. Create an incident                            | —                                      | `POST /incidents`                            | `Permission.INCIDENTS_CREATE`                          |
| 3. Open / update details                         | `incidents/[id]`                       | `GET /incidents/:id`, `PATCH /incidents/:id` | `Permission.INCIDENTS_VIEW` / `INCIDENTS_UPDATE`       |
| 4. Advance status (escalate / contain / resolve) | —                                      | `PATCH /incidents/:id/status`                | `Permission.INCIDENTS_CHANGE_STATUS`                   |
| 5. Append timeline entries                       | —                                      | `GET/POST /incidents/:id/timeline`           | `Permission.INCIDENTS_VIEW` / `INCIDENTS_ADD_TIMELINE` |

**Notes:** status changes are a **dedicated permission** (`INCIDENTS_CHANGE_STATUS`)
separate from generic edit, so an analyst can annotate without being able to drive
the severity/escalation lifecycle. Every status transition and timeline entry is
audit-logged. Deletion (`DELETE /incidents/:id`, `INCIDENTS_DELETE`) is restricted.
Incidents typically reference the originating case(s) (Journey 4) and may pull in
IOC enrichment (Journey 6) and AI findings (Journey 9) as timeline evidence.

---

## Journey 6 — IOC enrichment (threat intelligence)

**Who:** analysts, threat-intel analysts. **Goal:** check observables against
threat intel and find which alerts match known-bad indicators.

| Step                         | Page / Proxy                       | Endpoint                                       | Permission                   |
| ---------------------------- | ---------------------------------- | ---------------------------------------------- | ---------------------------- |
| 1. Open the intel feed       | `apps/web/src/app/(portal)/intel/` | `GET /intel/stats`, `GET /intel/events/recent` | `Permission.INTEL_VIEW`      |
| 2. Search IOCs               | —                                  | `GET /intel/iocs/search`                       | `Permission.INTEL_VIEW`      |
| 3. Match IOCs against alerts | —                                  | `POST /intel/iocs/match-alerts`                | `Permission.INTEL_VIEW`      |
| 4. (Admin) sync MISP         | —                                  | `POST /intel/sync/misp`                        | `Permission.CONNECTORS_SYNC` |

**Notes:** the MISP integration is reached only through the BFF — the frontend
never calls MISP directly (`apps/api` BFF pattern). The MISP connector, like every
connector, stores its credentials AES-256-GCM-encrypted at rest, is SSRF-validated
at input time (`apps/api/CLAUDE.md` rule 59), and can only be configured by a
`TENANT_ADMIN` (rule 55). Pulling fresh intel (step 4) is gated by
`CONNECTORS_SYNC`, deliberately distinct from read-only `INTEL_VIEW`. Enrichment
results feed alert triage (Journey 3) and incident timelines (Journey 5).

---

## Journey 7 — Threat hunting

**Who:** threat hunters. **Goal:** run a hypothesis-driven query across telemetry
and review the matching events.

| Step                          | Page / Proxy                      | Endpoint                                            | Permission                |
| ----------------------------- | --------------------------------- | --------------------------------------------------- | ------------------------- |
| 1. Open the hunt workspace    | `apps/web/src/app/(portal)/hunt/` | `GET /hunts/runs`                                   | `Permission.HUNT_VIEW`    |
| 2. Launch a hunt run          | —                                 | `POST /hunts/run`                                   | `Permission.HUNT_EXECUTE` |
| 3. Inspect a run + its events | —                                 | `GET /hunts/runs/:id`, `GET /hunts/runs/:id/events` | `Permission.HUNT_VIEW`    |
| 4. Delete a run               | —                                 | `DELETE /hunts/runs/:id`                            | `Permission.HUNT_DELETE`  |

**Key behaviors:**

- A hunt run follows a strict **state machine**: only `running → completed` and
  `running → error` are valid transitions; invalid transitions are rejected with a
  `BusinessException` (`apps/api/CLAUDE.md` rule 40). Long-running hunts execute
  as `HUNT_EXECUTION` jobs (`apps/web` Job Types table) and stale `RUNNING` jobs
  auto-recover after the stale window (rule 91).
- Underlying Elasticsearch/OpenSearch queries are sanitized through the shared
  `sanitizeEsQueryString()` utility (rules 35, 79) — `script`, `_search`,
  `_cluster`, etc. patterns are stripped and leading wildcards disallowed. Hunters
  can describe a hunt in natural language and run it via AI (`POST /ai/hunt`,
  Journey 8) which produces a `suggested` query for the analyst to execute.

---

## Journey 8 — AI chat (conversational investigation)

**Who:** any user with chat access. **Goal:** ask the assistant questions, reason
over context, and carry memory across conversations.

| Step                      | Page / Proxy                         | Endpoint                                | Permission                  |
| ------------------------- | ------------------------------------ | --------------------------------------- | --------------------------- |
| 1. Open AI chat           | `apps/web/src/app/(portal)/ai-chat/` | `GET /ai-chat/threads`                  | `Permission.AI_CHAT_ACCESS` |
| 2. Start a thread         | —                                    | `POST /ai-chat/threads`                 | `Permission.AI_CHAT_ACCESS` |
| 3. Send a message         | —                                    | `POST /ai-chat/threads/:id/messages`    | `Permission.AI_CHAT_ACCESS` |
| 4. Read history           | —                                    | `GET /ai-chat/threads/:id/messages`     | `Permission.AI_CHAT_ACCESS` |
| 5. Rename / delete thread | —                                    | `PATCH` / `DELETE /ai-chat/threads/:id` | `Permission.AI_CHAT_ACCESS` |

**Key behaviors:**

- **Provider routing:** the request tries all configured AI connectors in order
  (`bedrock → llm_apis → openclaw_gateway`, plus custom LLM connectors) and only
  falls back to a rule-based response if every connector fails or none is
  configured (`apps/api/CLAUDE.md` rules 88–89; `apps/web` AI Connector Strategy).
  The chosen provider/model is recorded in the audit log. AI endpoints are
  rate-limited to **10/min** (rule 33).
- **Cross-chat memory:** after each message a `MEMORY_EXTRACTION` job extracts
  durable facts/preferences into the tenant-scoped `UserMemory` store; relevant
  memories are re-injected into the system prompt on later calls. Memory **must
  not store secrets** and PII/secrets are redacted before model calls via
  `@auraspear/ai` `redact()` (`AGENTS.md` §7; `apps/web` Cross-Chat Memory).
  Users manage their own memory in Settings → AI Memory
  (`apps/web/src/app/(portal)/ai-memory/`, `Permission.AI_MEMORY_VIEW` /
  `AI_MEMORY_EDIT`).
- **Rendering:** chat is rendered through a safe markdown renderer — **never** raw
  AI HTML — with provider attribution, confidence (when available), a regenerate
  affordance, and a dismiss/close control (`apps/web` rules 42–43, 47).
- AI transcripts are **never** stored in `localStorage` (`apps/web` rule 46);
  history is server-side.

---

## Journey 9 — AI finding review (human-in-the-loop)

**Who:** analysts and reviewers. **Goal:** triage AI-generated findings and decide
whether to apply or dismiss them — the human-in-the-loop control point.

| Step                           | Page / Proxy                             | Endpoint                                                         | Permission                  |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| 1. Open the findings workspace | `apps/web/src/app/(portal)/ai-findings/` | `GET /ai/findings`, `GET /ai/findings/stats`                     | `Permission.AI_AGENTS_VIEW` |
| 2. Filter by entity            | —                                        | `GET /ai/findings/by-entity/:entityType/:entityId`               | `Permission.AI_AGENTS_VIEW` |
| 3. Open a finding              | —                                        | `GET /ai/findings/:id`                                           | `Permission.AI_AGENTS_VIEW` |
| 4. Apply / dismiss             | —                                        | `PATCH /ai/findings/:id/status`, `POST /ai/findings/bulk-status` | `Permission.AI_AGENTS_VIEW` |
| 5. Export                      | —                                        | `GET /ai/findings/export`                                        | `Permission.AI_AGENTS_VIEW` |

**Key behaviors:**

- `/ai-findings` is the central, full-text-searchable workspace for everything the
  AI produced (PostgreSQL `tsvector` weighted ranking; filters for agent, module,
  severity, status, finding type, confidence range, date range; 8 sortable
  columns; KPI cards for total/proposed/applied/dismissed/high-confidence — see
  `apps/web` "AI Findings Page").
- A finding moves `proposed → applied | dismissed` (or `failed → dismissed`). The
  finding carries **provenance** (agent/module, provider/model, confidence,
  evidence JSON) and is rendered through the standardized
  `src/components/ai-renderer/` blocks — no ad-hoc inline rendering, no raw AI HTML
  (`apps/web` rules 43, 53, 58).
- **Destructive AI actions are approval-gated.** Anything beyond a benign
  write-back creates a persisted `ApprovalRequest` first (`apps/api/CLAUDE.md`
  rule 97; managed via agent-config approvals, `Permission.AI_APPROVALS_MANAGE`).
  Pending approvals are shown with a distinct status badge (`apps/web` rules 44,
  59). This is the enforcement point for the platform invariant that **AI suggests
  and humans decide**. Approval policy: [`docs/ai/AI_APPROVAL_POLICY.md`](../ai/AI_APPROVAL_POLICY.md).

---

## Journey 10 — Reporting

**Who:** shift leads, executives, MSSP owners. **Goal:** produce and export SOC
reports for stakeholders and compliance.

| Step                               | Page / Proxy                         | Endpoint                                       | Permission                                   |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------- | -------------------------------------------- |
| 1. List reports                    | `apps/web/src/app/(portal)/reports/` | `GET /reports`, `GET /reports/stats`           | `Permission.REPORTS_VIEW`                    |
| 2. Browse templates                | —                                    | `GET /reports/templates`                       | `Permission.REPORTS_VIEW`                    |
| 3. Create (blank or from template) | —                                    | `POST /reports`, `POST /reports/from-template` | `Permission.REPORTS_CREATE`                  |
| 4. Open / edit                     | —                                    | `GET /reports/:id`, `PATCH /reports/:id`       | `Permission.REPORTS_VIEW` / `REPORTS_UPDATE` |
| 5. Export                          | —                                    | `POST /reports/:id/export`                     | `Permission.REPORTS_EXPORT`                  |
| 6. Download                        | —                                    | `GET /reports/:id/download`                    | `Permission.REPORTS_VIEW`                    |

**Key behaviors:**

- Report generation runs as a `REPORT_GENERATION` job (`apps/web` Job Types
  table), so large exports do not block the request.
- `REPORTS_EXPORT` is a **dedicated permission** distinct from `REPORTS_CREATE`,
  letting a tenant allow authoring without allowing data exfiltration via export.
  `EXECUTIVE_READONLY` personas typically get view-only access. Every report is
  `tenantId`-scoped — an MSSP owner exports per customer tenant (one context at a
  time; see Journey 1).

---

## Cross-journey notes

- **Everything is multi-tenant.** No journey above ever reads or writes another
  tenant's data; `GLOBAL_ADMIN`/platform operators change _context_, not visibility
  (Journey 1).
- **Permissions are defaults, not ceilings.** The tables list the seed-time gate.
  A `TENANT_ADMIN`/`GLOBAL_ADMIN` can re-grant or revoke any permission per role
  via Role Settings (`apps/web/src/app/(portal)/admin/role-settings/`,
  `Permission.ROLE_SETTINGS_UPDATE`). Treat each journey's permission as the
  default posture, and verify against
  `apps/api/src/modules/role-settings/constants/default-permissions.ts`.
- **Adding a step to a journey is an end-to-end change.** A new backend endpoint
  needs a matching Next.js proxy route, and a new permission must be added in **one
  atomic change** across backend enum, permission-definitions, default-permissions,
  the `@RequirePermission()` decorator, a Prisma migration (`WHERE NOT EXISTS`),
  the frontend permission mirror + proxy route, i18n keys in **all 6 locale
  files**, and `prisma db seed` (`apps/api/CLAUDE.md` rules 85–86; `apps/web` rules
  33–34). See [`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md)
  and [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md).
- **Never claim a gate green without running it.** If you change any flow above,
  the required gates (`pnpm typecheck`, `pnpm build`, Docker build, gitleaks,
  CodeQL) must actually pass before you say so (`AGENTS.md` §5).
