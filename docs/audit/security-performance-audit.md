# Security & Performance Audit — AuraSpear Platform

> **GOD MODE §16.1 deliverable.** A read-only, evidence-grounded security and
> performance audit of the AuraSpear monorepo (`apps/api`, `apps/web`,
> `packages/{shared,ai,config}`). Every finding cites a real `file:line` that was
> opened and read during this pass; every claim was spot-checked against source
> before publication.

**Date:** 2026-06-22
**Branch audited:** `chore/godmode-architecture-hardening`
**Auditor posture:** independent, read-only (no code was modified to produce this
report).

---

## Scope

In scope:

- **Security** — multi-tenant isolation, RBAC/permissions, secret handling and
  encryption at rest, authentication/guard chain, AI safety (input redaction,
  approval-policy enforcement).
- **Performance** — backend query shape and fan-out (GOD MODE §14.2), database
  indexing, pagination discipline, and frontend rendering/data-fetching posture
  (GOD MODE §14.1).

Out of scope (covered elsewhere, cross-linked below): dependency CVEs and
CodeQL/Trivy/gitleaks scan results (see
[`vulnerability-remediation.md`](./vulnerability-remediation.md) and the risk
register), clean-code/architecture conformance (see
[`architecture-clean-code-audit.md`](./architecture-clean-code-audit.md)),
AI/docs/rules consistency (see [`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md)),
and edge concerns assumed handled by deployment (TLS/WAF, OS patching, at-rest DB
encryption) per [`../security/THREAT_MODEL.md`](../security/THREAT_MODEL.md).

## Method

This was a **read-only** audit. The approach:

1. Read the existing security narrative (`docs/SECURITY.md`,
   `docs/security/THREAT_MODEL.md`) and the
   [risk register](./02-risk-register.md) to establish the documented baseline.
2. Validated each documented invariant against source with `Read`/`Grep` rather
   than trusting the prose — confirming both the **strengths** (so they are not
   overstated) and the **gaps**.
3. For each gap: assigned a severity, captured the exact `file:line`, named the
   invariant violated, assessed real-world exploitability (not theoretical), and
   proposed a concrete, minimal fix.
4. Marked findings on the live AI path and the auth/permission guard
   (**SEC-01, SEC-02, SEC-04**) as **recommended for human review before
   remediation** — they are correctness-sensitive and need careful testing.

Invariant references use `AGENTS.md` §6 (security) / §7 (AI), the numbered rules
in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md), the audit rules in that same
file, and GOD MODE §13/§14.

Related rules and skills that this audit exercises:
[`rules/security/security-rules.md`](../../rules/security/security-rules.md),
[`rules/security/ai-security.md`](../../rules/security/ai-security.md),
[`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md),
[`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md),
[`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md),
[`skills/qa/validate-release.md`](../../skills/qa/validate-release.md),
[`skills/devsecops/run-security-scan.md`](../../skills/devsecops/run-security-scan.md).

> **Note on cross-links.** Some rule/skill paths referenced in the GOD MODE
> task brief (`rules/security/tenant-isolation.md`, `rules/security/rbac-rules.md`,
> `rules/ai/ai-safety-rules.md`, `rules/global/performance-rules.md`,
> `skills/qa/perform-security-review.md`, `skills/qa/perform-performance-review.md`)
> do **not** exist in the tree. The links above point to the files that actually
> own each concern. This is itself a small docs-consistency gap worth closing in
> the rules/skills set.

---

# Part A — Security

## A.0 Overall posture (lead with the strengths)

**AuraSpear has mature, defense-in-depth security.** This is not a repo with a
thin auth layer bolted on — the core invariants are real, enforced globally, and
backed by code. The findings below are sharp-edged residual gaps in an otherwise
strong design, not a systemic failure.

Confirmed strengths (each read and verified):

- **Six-guard global chain, correct order.** `app.module.ts:149-154` registers
  `ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard →
PermissionsGuard` as global `APP_GUARD`s. Throttle-before-auth shields the
  expensive crypto path; tenant/permission run after identity is established.
- **Auth on every request, no trust in stale tokens.** `AuthGuard`
  (`auth.guard.ts:50-64`) verifies the access token, calls `validateUserActive()`
  (re-checks the user is still an active member on **every** request), rebuilds
  the tenant context, and touches session activity. Blocked/soft-deleted users
  are rejected even with a still-valid JWT.
- **No authentication bypass anywhere.** A grep for
  `skipAuth|bypassAuth|DISABLE_AUTH|fakeUser|X-Role` across `apps/api/src`
  returns **zero** production bypasses. `@Public` appears on exactly the expected
  surfaces (health, auth callback/login, root). The only `NODE_ENV`-gated
  behavior on the security path is the Swagger doc mount
  (`main.ts:119`, dev-only) — appropriate, and it gates disclosure, not auth.
  Satisfies `apps/api` CLAUDE.md rules 23 & 56.
- **Connector secrets encrypted at rest (AES-256-GCM).**
  `encryption.utility.ts:1-43` — 16-byte random IV per encryption, 16-byte GCM
  auth tag, `iv:authTag:ciphertext` base64 format, key-shape re-validated on
  every call, and decryption rejects a wrong auth-tag length (tamper detection).
  Used before persistence in the connector services.
- **Tenant switching is gated on active membership.** `auth.service.ts:396-397`
  resolves the target tenant only from the caller's own `memberships` list; a
  non-member (or non-GLOBAL_ADMIN) cannot pivot into another tenant via the
  `X-Tenant-Id` header.
- **Strong, fail-loud env validation.** `env.validation.ts:33-34` rejects an
  all-zero `JWT_SECRET`; the schema also enforces `CONFIG_ENCRYPTION_KEY` shape,
  no-localhost CORS in production, and all-or-nothing OIDC config. `NODE_ENV`
  defaults to `production` (secure-by-default).
- **Errors are generic-ified and path-stripped.** The exception filter catches
  Prisma error classes and returns generic messages, strips internal file paths,
  and truncates — so table/column/constraint names never leak (satisfies rules
  77, 82, 63).
- **Credential redaction in structured logs.** `app.module.ts:85-92` redacts
  `authorization`, `cookie`, and the password fields from pino output.
- **SSRF validated at input time, DNS-aware.** `connectors.service.ts:336-346`
  resolves and validates connector URLs (`resolveAndValidateUrl`) at create/update
  — malicious URLs (e.g. the cloud metadata endpoint) never persist.
- **No hardcoded secrets; no raw-AI-HTML sink.** Zero hardcoded secrets in
  non-test source; **zero** `dangerouslySetInnerHTML` in `apps/web/src`.
- **RBAC coverage is near-total.** `@RequirePermission` is present on the large
  majority of endpoints; the handful without it are the intentional `@Public` /
  self-service routes (e.g. `/tenants/current`). The _fail-open default_ behind
  that pattern is itself a finding — see **SEC-04**.

### Security metrics (measured this pass)

| Metric                                         | Result                                                                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed **exploitable** cross-tenant queries | **0**                                                                                                                                                                                         |
| Hardcoded secrets in non-test source           | **0**                                                                                                                                                                                         |
| `dangerouslySetInnerHTML` in `apps/web/src`    | **0**                                                                                                                                                                                         |
| Auth-bypass paths in production                | **0**                                                                                                                                                                                         |
| `redact()` calls before model/embedding calls  | **0** ← SEC-01                                                                                                                                                                                |
| `process.env` reads outside `config/`          | 13 lines / 9 files — **all bootstrap-legitimate** (main.ts CORS+NODE_ENV+port, app.module logger, ssrf/axios prod checks, gateway CORS, auth-cookie, platform-admin seed, job-scheduler flag) |

---

## A.1 Security findings

> **Reading the severities.** HIGH = a real safety control is absent on a live
> path. MEDIUM = an invariant is broken but a compensating control currently
> prevents exploitation (defense-in-depth erosion). LOW = narrow, conditional, or
> low-impact.
>
> **SEC-01, SEC-02, and SEC-04 are flagged `HUMAN REVIEW`.** They touch the live
> AI execution path and the central permission guard. They are **not** safe to
> auto-fix: each requires careful behavioral testing (false-positive redaction,
> approval-flow regressions, and breaking legitimate self-service endpoints,
> respectively). Treat the fixes below as _direction_, validated by a human before
> merge.

---

### SEC-01 — AI inputs are sent to model/embedding providers without redaction `HIGH` · `HUMAN REVIEW`

**Severity:** High
**Evidence:**

- `packages/ai/src/redaction.ts:77` exports a `redact()` function explicitly
  designed for "PII / secret redaction for **AI inputs** and transcripts"
  (`redaction.ts:2`). It is the intended input-scrubbing primitive.
- It is **never imported by the API.** `grep '@auraspear/ai'` across
  `apps/api/src` returns **0 matches**.
- The outbound prompt path passes the prompt through unmodified:
  `ai.service.ts:709-739` (`invokeGenericConnector`) forwards `prompt` verbatim to
  the per-provider invoke; `bedrock.service.ts:76-104` (`invoke(config, prompt, …)`)
  sends the raw prompt to AWS Bedrock; `embedding.service.ts:16-24` (and the loop
  at `:33-34`) passes raw `text` to the embedding provider.
- The only redaction that exists is **post-hoc transcript redaction**
  (`ai-transcript.service.ts:163`, `redactThread`) — it scrubs stored history
  _after the fact_, not the data leaving the platform to a third party.

**Invariant violated:** AGENTS.md §7 (AI safety: "redact inputs"); the
THREAT_MODEL row "PII/secret exfiltration via AI" claims
"`@auraspear/ai` `redact()` before model calls" — that claim is currently
**aspirational, not implemented**. Also `apps/api` CLAUDE.md AI-safety intent.

**Exploitability:** Real, and not adversarial — it is the _normal_ path.
Alert bodies, case notes, hunt context, and user-typed prompts routinely contain
IPs, hostnames, credentials pasted into log lines, tokens, and PII. Today all of
that is shipped verbatim to whichever provider the tenant configured (Bedrock /
LLM-APIs / OpenClaw). For a SOC product whose own threat model lists this exact
exfiltration vector, this is the highest-leverage gap. Impact severity scales
with the provider's data-retention terms, which the platform does not control.

**Fix (human-reviewed):** Introduce a single shared AI-egress wrapper that calls
`redact()` from `@auraspear/ai` on every outbound `prompt`/`text` immediately
before the provider invoke (one chokepoint in `invokeGenericConnector` and one in
`EmbeddingService`). Use the `keep`-list **only** for fields that are
intentionally part of an investigation (e.g. the specific IPs/IOCs under analysis)
and only when the caller explicitly opts in. Add an eval/golden case asserting
that a prompt containing a synthetic secret leaves with it redacted. **Test for
over-redaction** before merge — clobbering the very IOCs an analyst is
investigating would silently degrade AI quality.

---

### SEC-02 — Approval-required AI actions are not gated at execution time `HIGH` · `HUMAN REVIEW`

**Severity:** High
**Evidence:**

- `orchestrator.service.ts:75-80` **enqueues the job first**
  (`enqueueAgentJob(...)`, line 75) and only _then_, conditionally, creates the
  approval record (line 79). Job creation does not depend on the approval
  succeeding.
- `createApprovalRecord` (`orchestrator.service.ts:92-120`) wraps the write in a
  `try/catch` that on failure merely calls `logger.warn` (line 118) and returns.
  So an approval-required action can be enqueued **even if the approval record is
  never persisted**.
- The handler never gates on approval. `ai-agent-task.handler.ts:21-184` reads
  the payload (`:22`) and unconditionally executes:
  `runAgentTask(...)` for user-triggered tasks (`:73`), and
  `executeAndPersist(...)` (`:138`) + `writebackService.processSystemTriggeredResult(...)`
  (`:159`) for system-triggered tasks. It never inspects
  `payload.requiresApproval` and never queries `AiApprovalRequest` for an
  `approved` status before running.

**Invariant violated:** `apps/api` CLAUDE.md **rule 97** ("EVERY approval-required
action MUST create an ApprovalRequest record **before execution**; never execute
without persisted approval") and AGENTS.md §7 (destructive AI actions are
`approval-required`). The order is inverted (execute-path is armed before the
approval exists) and the consumer never checks the gate.

**Exploitability:** The destructive/auto-allowed split exists in policy, but the
**enforcement point is missing**: an approval-required job that reaches the
handler runs to completion (including write-back to incidents/cases) regardless of
approval state. A transient DB failure on the approval write (or a race) yields an
executed-but-unapproved action with only a warning in the logs. This is a control
that is _documented as present_ but is effectively advisory.

**Fix (human-reviewed):** (1) Create the approval record **before** `enqueue`, in
the same transaction or with a hard failure (no swallow) when approval is
required. (2) In the handler, for approval-required categories, look up the
`AiApprovalRequest` and **refuse to execute** unless its status is `approved`;
for `pending`/`rejected`, no-op and finalize the session accordingly. Add tests
covering pending → blocked, approved → runs, rejected → no-op. Because this
changes live agent behavior, validate against the existing eval harness and the
SOAR/write-back flows before merge.

---

### SEC-03 — Repository `update`/`delete` keyed by `id` alone (invariant broken; not currently exploitable) `MEDIUM`

**Severity:** Medium
**Evidence:**

- `ai-agents.repository.ts:313-322` — `updateTool` and `deleteTool` use
  `where: { id }` (no `tenantId`).
- `ai-writeback.repository.ts:391-394` — `aiExecutionFinding.update` uses
  `where: { id }`.
- `knowledge.repository.ts:72-75` — `runbook.update` uses `where: { id }` inside
  a `$transaction` (it does pair a `findFirstOrThrow({ id, tenantId })` in the
  same transaction, which partially mitigates).
- Contrast the **correct** pattern: `alerts.repository.ts:35-37` uses
  `updateMany({ where: { id, tenantId } })`; `ai-writeback.repository.ts:412-416`
  (`bulkUpdateStatus`) correctly scopes by `{ id: { in: ids }, tenantId }`.

**Invariant violated:** `apps/api` CLAUDE.md **rule 26** and **audit rule 21**
(every repository `update`/`delete` must include `tenantId` in the `where`); also
§14b (repositories take `tenantId`).

**Exploitability:** **Not exploitable today** — every caller of these methods
enforces tenant ownership at the service layer before invoking them, so no
cross-tenant write path is reachable. The risk is _future_: this defeats the
"secure by construction" guarantee at the data layer, so a new caller that forgets
the service-layer check would silently get a cross-tenant write. Confirmed
exploitable cross-tenant queries this pass: **0**.

**Fix:** Convert each to the `updateMany`/`deleteMany` with
`where: { id, tenantId }` pattern already used in `alerts.repository.ts`; return
`findFirst({ id, tenantId })` where a record is needed. Low-risk, mechanical, and
restores the data-layer invariant.

---

### SEC-04 — `PermissionsGuard` fails **open** when `@RequirePermission` is absent `MEDIUM` · `HUMAN REVIEW`

**Severity:** Medium
**Evidence:** `permissions.guard.ts:26-29` — when no `@RequirePermission`
decorator is present, `canActivate` returns `true`. Any endpoint that ships
without the decorator is reachable by **any authenticated user** in any tenant
(subject only to Auth/Tenant guards).

**Invariant violated:** Secure-by-default (AGENTS.md §6) and the spirit of
`apps/api` CLAUDE.md **rule 25** ("EVERY endpoint MUST have
`@RequirePermission()`"). The current design relies on every author remembering
the decorator; the guard itself does not enforce it.

**Exploitability:** Conditional. Coverage is currently near-total and the
uncovered routes are intentional self-service/`@Public` endpoints, so there is no
known reachable over-privilege today. But the failure mode is the worst kind: a
_new_ endpoint that simply forgets the decorator is exposed silently, with no
test or guard catching it. The blast radius is "any future endpoint."

**Fix (human-reviewed):** Flip to **fail-closed** — deny when no permission
metadata is found — and add an explicit `@AuthenticatedOnly()` (or reuse
`@Public()`) opt-out marker on the legitimate self-service endpoints. This must be
done carefully: enumerate and annotate every currently-decorator-less route
(`/tenants/current`, health, etc.) **first**, then flip the default, or the change
will 403 legitimate traffic. Pair with a CI check that fails the build on any
controller method lacking either `@RequirePermission` or the opt-out marker.

---

### SEC-05 — Case-owner bypass reads the case cross-tenant `LOW`

**Severity:** Low
**Evidence:** `permissions.guard.ts:69-76` — the `@AllowCaseOwner()` escape hatch
does `prisma.case.findUnique({ where: { id: caseId }, select: { ownerUserId } })`
**without** `tenantId`, then grants access when
`caseRecord.ownerUserId === user.sub` (line 75).

**Invariant violated:** Tenant-isolation (AGENTS.md §6; `apps/api` CLAUDE.md rule
8/26 — queries scoped by `tenantId`). The lookup crosses the tenant boundary even
though the subsequent owner-match check narrows the grant.

**Exploitability:** Very low. The grant only fires when the queried case's
`ownerUserId` equals the caller's own `sub`; a user owning a case in another
tenant is an unusual state. Still, the read itself is unscoped and the pattern is
a latent footgun.

**Fix:** Scope the lookup: `prisma.case.findFirst({ where: { id: caseId, tenantId:
user.tenantId }, select: { ownerUserId: true } })`. One-line change, no behavior
change for legitimate same-tenant owners.

---

### SEC-06 — AI write-back to incident/case children skips parent tenant re-check `LOW`

**Severity:** Low
**Evidence:** `ai-writeback.repository.ts:431-438` — `createIncidentTimelineEntry`
and `createCaseNote` create child rows directly from `payload`-supplied IDs with
no parent `{ id, tenantId }` verification. Contrast `updateAlertAiFields`
(`:419-428`), which correctly scopes the parent update by `{ id: alertId, tenantId }`.

**Invariant violated:** `apps/api` CLAUDE.md **rule 75** (sub-resource endpoints
must validate parent ownership before touching the child) and tenant-isolation
(§6).

**Exploitability:** Low — the IDs originate from system-triggered AI write-back
whose upstream context is tenant-derived, so an attacker-controlled cross-tenant
ID is not a normal input. But repository-level enforcement is absent, so the
guarantee depends entirely on upstream correctness.

**Fix:** Before creating the child, verify the parent incident/case exists under
`{ id, tenantId }` (a cheap `findFirst` or a guarded `create` via the parent
relation). Mirrors the pattern already used in `updateAlertAiFields`.

---

# Part B — Performance

## B.0 Overall posture (lead with the strengths)

**The data layer is well-indexed and pagination discipline is the norm.** Hot
read paths are query-driven, not fetch-all-and-reduce. The findings are a small
set of unbounded/N+1 paths and a frontend rendering posture that leaves Next 16 /
React 19 server rendering on the table — real, but contained.

Confirmed strengths (each read and verified):

- **231 `@@index` across 84 Prisma models**, with composite
  `(tenantId, …)` indexes on the hot tables: `Alert`
  (`schema.prisma:818-822` — `(tenantId, severity)`, `(tenantId, status)`,
  `(tenantId, timestamp)`, `(tenantId, source)`), `AiExecutionFinding`
  (`:2393-2400`), and `Job` (`:2057-2058`). FK and filter fields are indexed per
  audit rule 26.
- **List endpoints are consistently paginated** with the
  `[data, total] = Promise.all([findMany({ skip, take }), count])` pattern:
  `jobs.repository.ts:114-122`, `cases.repository.ts:76-82`,
  `entities.repository.ts:11-21`.
- **Deliberate `select`/`include`** — projections are scoped rather than
  `SELECT *` by default; bounded fan-out over fixed-size arrays.
- **Aggregations are query-driven** — counts/`groupBy` at the DB rather than
  fetch-all-then-`reduce` in JS (audit rules 23/24).
- **Frontend has the right primitives** — `VirtualizedList` + `DataTable` with
  mandated backend-driven pagination; `exportFindings` even caps itself at
  `take: 5000` (`ai-writeback.repository.ts:363-367`), showing the pattern is
  understood.

---

## B.1 Performance findings

### PERF-01 — Unbounded N+1 inside `Promise.all` in tenant risk recalculation `HIGH`

**Severity:** High
**Evidence:** `risk-scoring.service.ts:65-79` (`recalculateForTenant`):

```
const entities = await this.entitiesRepository.findAllByTenant(tenantId)   // :66
const updateResults = await Promise.all(
  entities.map(async entity => {
    const relations = await this.entitiesRepository.findRelationsForEntity(entity.id, tenantId) // :70
    ...
    await this.entitiesRepository.updateRiskScore(entity.id, tenantId, newScore)               // :74
  })
)
```

`findAllByTenant` (`entities.repository.ts:102-104`) is
`findMany({ where: { tenantId } })` — **no `take`, no `select`**. The service then
fires one relation query **and** one update **per entity**, all at once via
`Promise.all` over the unbounded array. Endpoint: `POST entities/recalculate-risk`
(`entities.controller.ts:91-97`, throttled `2/min`).

**Invariant violated:** GOD MODE §14.2; `apps/api` CLAUDE.md **rule 36** (batch in
chunks of 50 via `Promise.allSettled`) and **audit rule 24** (every `findMany`
needs `take`/`skip`).

**Exploitability/impact:** A tenant with thousands of entities triggers thousands
of concurrent queries plus thousands of concurrent updates in a single request —
connection-pool exhaustion (pool is bounded at 20 per rule 46) and a latency
cliff. The `2/min` throttle limits frequency but not the per-call blast radius.

**Fix:** Replace the per-entity relation query with **one grouped relation-count
query**; add `take` + `select` to `findAllByTenant`; and chunk the updates in
batches of 50 with `Promise.allSettled` (the rule-36 pattern). For very large
tenants, page the recalculation or move it to a background job.

---

### PERF-02 — Global scheduler scans are unbounded and cross-tenant `MEDIUM`

**Severity:** Medium
**Evidence:** `job-scheduler.service.ts:63-66`
(`detectionRule.findMany({ where: { status: 'active' } })`) and `:91-94`
(`correlationRule.findMany({ where: { status: 'active' } })`) — **no `take`, no
`tenantId`** (a deliberate cross-tenant scan), each feeding a `Promise.allSettled`
over the unbounded result (`:69-79`, `:97-107`). The in-code TODOs at `:61` and
`:89` already flag that these belong in repositories.

**Invariant violated:** GOD MODE §14.2; audit rule 24 (`findMany` needs bounds);
§14b/rule 33 (direct Prisma in a service — also called out by the TODOs).

**Exploitability/impact:** Not user-triggered, but it grows linearly with total
platform-wide active rules across **all** tenants on every scheduler tick.
Additionally, the `(tenantId, status)` composite index cannot serve a
`status`-only `where`, so this is a sequential-ish scan; at scale the tick gets
slower and the fan-out larger.

**Fix:** Move both into repositories (as the TODOs ask) and page in fixed batches;
add a standalone `@@index([status])` (or `@@index([status, tenantId])`) so the
status-only filter is index-served.

---

### PERF-03 — Two entity-keyed endpoints return unbounded `findMany` `MEDIUM`

**Severity:** Medium
**Evidence:**

- `ai-writeback.repository.ts:338-351` (`findingsByEntity`, backing
  `GET /ai/writeback/by-entity/...`) — `findMany` with `where` + `orderBy` but
  **no `take`**.
- `ai-handoff.service.ts:268-273` (`getFindingLinks`, backing
  `GET .../findings/:id/links`) — `findMany({ where, orderBy })` with **no
  `take`**. (The paginated path in the same file, `:183-200`, correctly uses
  `take`/`skip` — so the cap is understood, just missing here.)
- Contrast: `exportFindings` (`:363-367`) caps `take: 5000`.

**Invariant violated:** Audit rule 24 (every `findMany` paginated or capped).

**Exploitability/impact:** An entity (alert/incident/case) that accumulates a
large number of AI findings or output-links returns the whole set in one
response — memory and payload growth, slow response. Bounded by how many findings
a single entity realistically accrues, hence Medium not High.

**Fix:** Add a `take: 500` safety cap (or proper pagination) to both, matching the
`exportFindings` precedent.

---

### PERF-04 — Frontend opts out of React Server Components almost everywhere `MEDIUM`

**Severity:** Medium
**Evidence:** **507** `'use client'` directives across `apps/web/src`; **59 of 61**
`page.tsx` files are client components. `apps/web/CLAUDE.md:764` explicitly states
"**Server Components are the default** — only add `'use client'` when the component
uses hooks, events, or browser APIs." The codebase contradicts its own rule.

**Invariant violated:** `apps/web` CLAUDE.md (Server Components default); GOD MODE
§14.1 (frontend rendering). Cross-references **FE-01** in
[`architecture-clean-code-audit.md`](./architecture-clean-code-audit.md).

**Exploitability/impact:** Not a security issue — a rendering-efficiency one. With
nearly every page client-rendered, the app forfeits Next 16 / React 19 server
rendering benefits (smaller JS payloads, server-side data fetching, faster TTI).
The effect is larger bundles and more client work, not a correctness bug.

**Fix:** Push `'use client'` down to the **leaf** components that actually need
interactivity, keep page/layout shells as Server Components, and introduce a
client-component budget (lint/CI check) to stop the regression from creeping back.
This is a sizeable, incremental refactor — schedule it, don't rush it.

---

### PERF-05 — Polling hooks keep firing in background (hidden) tabs `LOW`

**Severity:** Low
**Evidence:** **19** `refetchInterval` usages across `apps/web/src/hooks`
(`useDashboard.ts` ×6 + `useAdmin.ts`, `useSystemHealth.ts` ×4,
`useUsersControl.ts` ×3, plus `useNotifications.ts`, `useConnectors.ts`,
`useAiOpsWorkspace.ts`, `usePermissionSync.ts`). **Only**
`usePermissionSync.ts:30` sets `refetchIntervalInBackground: false`; every other
poll keeps running when the tab is hidden.

**Invariant violated:** GOD MODE §14.1 (frontend efficiency); the dashboard/health
polling clusters multiply requests.

**Exploitability/impact:** Low. Hidden/background tabs continue to poll the API
(dashboard + system-health + users-control on intervals), wasting client battery,
network, and backend rate-limit budget for data nobody is looking at. Multiple
independent dashboard polls also fan out where one consolidated call or the
existing WebSocket gateway would do.

**Fix:** Add `refetchIntervalInBackground: false` to the polling hooks;
consolidate the dashboard polls into fewer queries; and prefer the existing
notifications WebSocket gateway over interval polling for near-real-time data.

---

## Prioritized remediation table

| ID      | Title                                               | Severity | Area      | Exploitable today?            | Human review? | Fix effort |
| ------- | --------------------------------------------------- | -------- | --------- | ----------------------------- | ------------- | ---------- |
| SEC-01  | AI inputs sent to providers without `redact()`      | High     | AI safety | Yes (normal path)             | **Yes**       | Medium     |
| SEC-02  | Approval policy not enforced at execution           | High     | AI safety | Yes (control absent)          | **Yes**       | Medium     |
| PERF-01 | Unbounded N+1 in tenant risk recalculation          | High     | Backend   | DoS-class (large tenants)     | No            | Medium     |
| SEC-03  | Repo `update`/`delete` keyed by `id` alone          | Medium   | Tenancy   | No (service-layer scoped)     | No            | Low        |
| SEC-04  | `PermissionsGuard` fails open without decorator     | Medium   | RBAC      | No today / silent future risk | **Yes**       | Medium     |
| PERF-02 | Unbounded cross-tenant scheduler scans              | Medium   | Backend   | Scale degradation             | No            | Low–Med    |
| PERF-03 | Two unbounded entity-keyed `findMany` endpoints     | Medium   | Backend   | Scale degradation             | No            | Low        |
| PERF-04 | Frontend opts out of RSC (507 `'use client'`)       | Medium   | Frontend  | No (efficiency)               | No            | High       |
| SEC-05  | Case-owner bypass reads case cross-tenant           | Low      | Tenancy   | Very low                      | No            | Low        |
| SEC-06  | AI write-back to children skips parent tenant check | Low      | Tenancy   | Low                           | No            | Low        |
| PERF-05 | Polling hooks fire in background tabs               | Low      | Frontend  | No (waste)                    | No            | Low        |

Suggested order: **SEC-03, SEC-05, SEC-06, PERF-03, PERF-05** (mechanical,
low-risk, immediate) → **PERF-01, PERF-02** (backend, testable in isolation) →
**SEC-01, SEC-02, SEC-04** (human-reviewed, behavioral) → **PERF-04** (scheduled
refactor).

---

## Top human-decision items

1. **SEC-01 — AI redaction policy.** Decide the redaction default and the
   keep-list contract. Redacting too aggressively degrades investigation quality
   (clobbering the IOCs under analysis); redacting too little defeats the control.
   A human must own the keep-list semantics and the per-feature opt-in. **Test for
   over-redaction before merge.**
2. **SEC-02 — Approval enforcement.** Confirm which AI action categories are truly
   `approval-required`, and the desired handler behavior for `pending`/`rejected`
   (block + finalize vs. retry-on-approve). This changes live agent execution and
   SOAR write-back — validate against the eval harness.
3. **SEC-04 — Fail-closed permissions.** Enumerate and annotate every currently
   decorator-less route **before** flipping the default, or legitimate traffic
   will 403. Decide the opt-out marker (`@AuthenticatedOnly()` vs. reusing
   `@Public()`).
4. **PERF-04 — RSC migration scope.** A real refactor with a real budget. Decide
   whether to do it incrementally (leaf-first) and add a CI client-component
   budget, or defer to a dedicated frontend-performance milestone.

---

## Verdict

**AuraSpear's security foundation is strong and largely matches its own
documentation.** The global six-guard chain, per-request user/tenant revalidation,
AES-256-GCM secret encryption, input-time DNS-aware SSRF defense, fail-loud env
validation, generic-ified Prisma errors, and a clean zero on auth bypasses,
hardcoded secrets, and raw-AI-HTML sinks are all **real and verified**. The
performance posture is similarly healthy: 231 indexes across 84 models, composite
`(tenantId, …)` indexes on hot tables, and consistent `Promise.all([findMany,
count])` pagination.

The residual risk concentrates in **two places**: the **AI safety path** (SEC-01
input redaction is unimplemented; SEC-02 approval enforcement is documented but
not wired at execution) and a small set of **unbounded/N+1 query paths**
(PERF-01/02/03). The tenancy findings (SEC-03/05/06) are invariant-erosion, not
live cross-tenant leaks — confirmed exploitable cross-tenant queries this pass:
**0**.

**Disposition:** **Conditional pass.** Safe to continue development. Before any
production launch, remediate **SEC-01, SEC-02, and PERF-01**, and route
**SEC-01/SEC-02/SEC-04** through human review with behavioral tests. The remaining
medium/low items are scheduled hardening, not blockers.

---

### See also

- [`architecture-clean-code-audit.md`](./architecture-clean-code-audit.md) — clean-code / architecture conformance (FE-01 cross-ref).
- [`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md) — AI/docs/rules consistency.
- [`vulnerability-remediation.md`](./vulnerability-remediation.md) — dependency CVEs, CodeQL, scan status.
- [`02-risk-register.md`](./02-risk-register.md) — owned risks (lint/CI/Docker/contract debt).
- [`README.md`](./README.md) — audit index.
- [`../SECURITY.md`](../SECURITY.md) · [`../security/THREAT_MODEL.md`](../security/THREAT_MODEL.md) — the security baseline this audit validated against.
