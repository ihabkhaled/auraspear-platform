# Tenant-isolation rules — every tenant-owned row is scoped by `tenantId`

> **Read `AGENTS.md` first** (repo root) — §6 "Security invariants" and the one
> rule: _no AI agent may edit first and understand later._ Then
> `apps/api/CLAUDE.md` (rules 8, 26, 75; "Key Principles"). This file is the
> dedicated home for tenant isolation referenced by `../backend/layering-rules.md`
> and `security-rules.md` §1. GOD MODE §13.1 is the source. A violation here is a
> **cross-tenant data breach**, not a style nit — every claim maps to real code.

AuraSpear is a **multi-tenant SOC platform**. The single most important
invariant: **no request ever reads or writes another tenant's data.** This is
enforced by scoping every tenant-owned query — and never trusting the client for
the tenant identity. Sibling depth: `../backend/tenant-permission-rules.md`
(guard chain), `rbac-rules.md` (the permission layer on top), `../ai/ai-safety-rules.md`
(AI memory/approvals are tenant-scoped too).

---

## 1. `tenantId` flows from the JWT, never from the client body/query

- **`tenantId` comes from the validated auth context only** — controller reads it
  via `@TenantId()`, which the `AuthGuard` populates from the JWT
  (`apps/api/src/common/guards/auth.guard.ts`). **Never** read `tenantId` from
  `@Body()` / `@Query()` / a client field (`apps/api/CLAUDE.md` "Key Principles";
  `security-rules.md` §3).
- **The only honored client tenant header is `X-Tenant-Id`, and only for
  `GLOBAL_ADMIN`.** The `AuthGuard` reads `request.headers['x-tenant-id']`
  (`auth.guard.ts:56`) and overrides `request.user.tenantId` **only** when the
  caller is `GLOBAL_ADMIN`; non-admins cannot switch tenants
  (`apps/api/CLAUDE.md` "Key Principles" #8). Never replicate this override
  outside the guard.

## 2. Every tenant-owned read/write is scoped by `tenantId`

- **`tenantId` flows controller → service → repository and lands in the
  `where`.** Every repository method takes `tenantId`
  (`apps/api/CLAUDE.md` rule 14b; `../backend/layering-rules.md` §3).
- **`update()` and `delete()` MUST include `tenantId` in the `where`** — never by
  `id` alone (`apps/api/CLAUDE.md` rule 26; **audit rule 21**). Because Prisma
  `.update()` only accepts unique fields (and would silently drop `tenantId`),
  the codebase uses `updateMany`/`deleteMany` with `where: { id, tenantId }`
  (returns `count: 0` instead of leaking that the row exists in another tenant).
- **Correct pattern to copy:** `apps/api/src/modules/alerts/alerts.repository.ts`
  (`updateByIdAndTenant`, `:35-37`) does
  `updateMany({ where: { id, tenantId } })` then returns
  `findFirst({ where: { id, tenantId } })`; `ai-writeback.repository.ts`
  (`bulkUpdateStatus`) scopes by `{ id: { in: ids }, tenantId }`.
- **A bare `findUnique({ where: { id } })` on a tenant-owned model is a review
  blocker** unless the row is genuinely global. Use `findFirst({ where: { id,
tenantId } })`.

## 3. The SEC-03 invariant — restore it, never undo it

The audit found repo `update`/`delete` keyed by `id` alone — **not exploitable
today** (every caller scopes at the service layer) but a latent footgun: a future
caller that forgets the service check would silently get a cross-tenant write
(`docs/audit/security-performance-audit.md` SEC-03).

- **Offenders (to fix, never to clone):** `ai-agents.repository.ts` `updateTool`/
  `deleteTool` (`:313-322`), `ai-writeback.repository.ts`
  `aiExecutionFinding.update` (`:391-394`), `knowledge.repository.ts`
  `runbook.update` (`:72-75`).
- **The fix is mechanical:** convert to `updateMany`/`deleteMany` with
  `where: { id, tenantId }`, mirroring `alerts.repository.ts`. New code must use
  the scoped pattern from the start.

## 4. Validate parent ownership before touching child resources

- **Sub-resource endpoints validate the parent's tenant first**
  (`apps/api/CLAUDE.md` rule 75): a valid child id never implies valid parent
  access. E.g. `/cases/:caseId/artifacts/:artifactId` verifies the case belongs
  to the caller's tenant before querying the artifact.
- **Cross-tenant escape hatches must still be scoped.** The `@AllowCaseOwner`
  lookup is the cautionary SEC-05 case: it queried the case `findUnique({ where:
{ id } })` **without** `tenantId` before the owner match — scope it
  (`findFirst({ where: { id, tenantId } })`)
  (`docs/audit/security-performance-audit.md` SEC-05; `rbac-rules.md` §5).
- **AI write-back to incident/case children must re-check the parent tenant**
  (SEC-06) — don't create child rows from payload-supplied IDs without re-scoping.

## 5. Jobs, AI memory, and async work preserve tenant context

- **Background jobs carry `tenantId`** — every job's payload and every query it
  runs is tenant-scoped; a scheduler that scans across tenants still processes
  per-tenant (`../global/performance-rules.md` §5; PERF-02 offender
  `job-scheduler.service.ts`).
- **AI memory is tenant-scoped and stores no secrets** — `UserMemory` retrieval/
  storage is scoped by `tenantId`; redact before persisting
  (`apps/api/CLAUDE.md` rule 48; `../ai/ai-memory-rules.md`,
  `../ai/ai-safety-rules.md`). AI investigation validates alert/resource tenant
  ownership before acting (rule 48). Every `ApprovalRequest` is tenant-scoped
  (`../ai/ai-approval-rules.md` §4).

---

## Self-check before you commit a tenant-touching change

- [ ] `tenantId` comes from `@TenantId()` / the guard context — never from a body,
      query, or client field (except the `GLOBAL_ADMIN`-only `X-Tenant-Id`
      handled in the guard).
- [ ] Every repository method takes `tenantId`; every read/`update`/`delete` is
      scoped by `{ id, tenantId }` (use `updateMany`/`deleteMany`, never `id`
      alone).
- [ ] No `findUnique({ where: { id } })` on a tenant-owned model.
- [ ] Sub-resources validate parent ownership first; escape hatches stay scoped.
- [ ] Jobs/AI memory/approvals carry and scope by `tenantId`; AI inputs redacted.
- [ ] No `any`, no `eslint-disable`; `pnpm typecheck` green (blocking gate,
      `../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).

## Related

- `../../AGENTS.md` §6 (security invariants), §7 (AI tenancy/secrets).
- `../../apps/api/CLAUDE.md` rules 8, 26, 48, 75; "Key Principles" #1, #8.
- `../backend/layering-rules.md` §3, `../backend/tenant-permission-rules.md`
  (guard chain depth), `rbac-rules.md`, `security-rules.md` §1.
- `docs/audit/security-performance-audit.md` SEC-03/05/06; `docs/architecture/TENANCY.md`.
