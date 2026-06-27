# Skill: Perform a security review (this platform's checklist, evidence-backed)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — §6 (security invariants), §7 (AI
> safety), and the one rule: _no AI agent may edit first and understand later._
> This skill is **read-only verification** (it finds and reports; it does not fix).
> The invariant homes you check against:
> [`rules/security/tenant-isolation.md`](../../rules/security/tenant-isolation.md),
> [`rules/security/rbac-rules.md`](../../rules/security/rbac-rules.md),
> [`rules/security/security-rules.md`](../../rules/security/security-rules.md),
> [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md),
> [`rules/ai/ai-safety-rules.md`](../../rules/ai/ai-safety-rules.md), and
> [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md).
> The **evidence baseline** — known gaps, strengths, and exact `file:line`s — is
> [`docs/audit/security-performance-audit.md`](../../docs/audit/security-performance-audit.md)
> Part A (SEC-01 … SEC-06). Sibling recipes:
> [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) (the
> dependency/secret/Trivy scanners), [`skills/qa/validate-release.md`](validate-release.md),
> [`skills/qa/perform-performance-review.md`](perform-performance-review.md).
>
> There is also a built-in **`/security-review`** slash command (reviews the pending
> diff on the current branch) — run it as an automated complement, but the checklist
> below is the platform-specific gate that command does not know about. When the work
> is non-trivial, route it through the [`devsecops-security-agent`](../../.claude/agents/devsecops-security-agent.md)
> and the [`qa-gatekeeper`](../../.claude/agents) (which rejects any claim without
> pasted evidence).

This recipe is the **manual, platform-specific security review** for a change (or a
branch) on a multi-tenant SOC platform: tenant scoping, RBAC fail-closed intent, AI
redaction + approval enforcement, secrets/encryption, SSRF, raw-AI-HTML, and audit
logging — each verified against real code, not assumed.

---

## When to use

Use this skill when a change touches auth/RBAC, tenant-scoped data, AI execution or
egress, connectors/secrets, user-supplied URLs, or any data-exposure surface — and
before merging anything in those areas. Also use it for a periodic posture pass.

**Do not** use this skill for: running the dependency/secret/Trivy scanners (→
[`run-security-scan.md`](run-security-scan.md)); _fixing_ a finding (that goes to the
owning specialist — `backend-architect`, `ai-platform-agent`, etc.; this skill only
verifies); the full release gate run (→ [`validate-release.md`](validate-release.md)).

---

## Files to inspect first

| Concern                                                       | Where to look                                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **The audit baseline (SEC-01..06, strengths, file:line)**     | `docs/audit/security-performance-audit.md` Part A                                                                                            |
| Tenant scoping — correct pattern to compare against           | `apps/api/src/modules/alerts/alerts.repository.ts` (`updateByIdAndTenant`, `updateMany({ where: { id, tenantId } })`)                        |
| Tenant-isolation rule (id-alone is SEC-03)                    | `rules/security/tenant-isolation.md`                                                                                                         |
| The single permission enforcement point + GLOBAL_ADMIN bypass | `apps/api/src/common/guards/permissions.guard.ts`; `rules/security/rbac-rules.md`                                                            |
| The six-guard chain order                                     | `apps/api/src/app.module.ts` (`ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard`)                        |
| AI redaction primitive (SEC-01: never imported by api today)  | `packages/ai/src/redaction.ts` (`redact()`)                                                                                                  |
| AI approval policy + the missing execution gate (SEC-02)      | `packages/ai/src/safety.ts` (`evaluateApproval`); `apps/api/src/modules/ai/orchestrator/orchestrator.service.ts`; `ai-agent-task.handler.ts` |
| Connector secret encryption at rest                           | `apps/api/src/.../encryption.utility.ts` (AES-256-GCM)                                                                                       |
| SSRF validation at input time                                 | the connectors service `resolveAndValidateUrl` / `ssrf.utility.ts`                                                                           |
| Raw-AI-HTML ban (web)                                         | `apps/web/src` (`react/no-danger` is `error`; rules 36, 43)                                                                                  |

---

## Exact step-by-step review (each step: grep/read, then judge against the rule)

Run from repo root. For each item, find the evidence with `Grep`/`Read` and record
PASS / FINDING with the `file:line`. The known gaps below are real — confirm whether
the change under review touches or worsens them.

### 1. Tenant isolation — every tenant-owned query/update/delete scoped by `tenantId` (SEC-03)

- `tenantId` must flow from the JWT (`@TenantId()`), **never** from `@Body()`/
  `@Query()`/a client field (`tenant-isolation.md` §1). Only `X-Tenant-Id` for
  `GLOBAL_ADMIN`, honored only in `auth.guard.ts`.
- Every repository `update`/`delete` includes `tenantId` in the `where` —
  `updateMany`/`deleteMany({ where: { id, tenantId } })`, never `where: { id }`
  alone (rule 26; SEC-03). Find offenders:

  ```bash
  grep -rnE "\.(update|delete)\(\{[^}]*where:\s*\{\s*id\s*[},]" apps/api/src --include="*.repository.ts"
  ```

  Known SEC-03 sites (id-alone): `ai-agents.repository.ts:313-322`,
  `ai-writeback.repository.ts:391-394`, `knowledge.repository.ts:72-75`. Compare to
  the correct `alerts.repository.ts:35-37`.

- Sub-resource writes re-check parent ownership `{ id, tenantId }` (rule 75; SEC-06
  is the AI write-back gap at `ai-writeback.repository.ts:431-438`).
- Owner-bypass lookups are scoped (SEC-05: `permissions.guard.ts:69-76` reads the
  case without `tenantId`).

### 2. RBAC — `@RequirePermission` on every endpoint; fail-closed intent (SEC-04)

- Every controller method carries `@RequirePermission(Permission.MODULE_ACTION)`
  (rule 25), plus `@Throttle(...)` on mutations (rules 74, 80). Find bare routes:

  ```bash
  grep -rnE "@(Get|Post|Patch|Put|Delete)\(" apps/api/src --include="*.controller.ts" -A3 | grep -B1 -v "RequirePermission\|@Public"
  ```

- The `PermissionsGuard` is the **only** enforcement point and currently **fails
  open** when the decorator is absent (`permissions.guard.ts:26-29` → SEC-04). So a
  decorator-less endpoint is reachable by any authenticated user — flag any new
  route lacking `@RequirePermission` or a documented `@Public`.
- The `GLOBAL_ADMIN` bypass exists in exactly one place (`permissions.guard.ts:46`)
  — flag any replicated `if (role === GLOBAL_ADMIN)` in services/repos/utilities
  (`rbac-rules.md` §3).
- No `@Roles()` on new endpoints (legacy; `rbac-rules.md` §1).

### 3. AI input redaction — `redact()` before every model/embedding call (SEC-01)

- Outbound `prompt`/`text` must pass through `redact()` from `@auraspear/ai`
  immediately before the provider invoke (`ai-safety-rules.md` §3; `AGENTS.md` §7).
- **Known gap SEC-01 (HIGH):** the API has **zero** `@auraspear/ai` imports today —
  prompts go out verbatim (`ai.service.ts:709-739`, `bedrock.service.ts:76-104`,
  `embedding.service.ts:16-34`). Confirm and flag any **new** raw-egress path:

  ```bash
  grep -rn "@auraspear/ai" apps/api/src        # expect 0 today — SEC-01
  ```

### 4. AI approval enforced before destructive execution (SEC-02)

- Destructive/approval-required actions need a **persisted `ApprovalRequest` before
  execution**, and the executor must refuse to run unless status is `approved`
  (rule 97; `ai-safety-rules.md` §1–§2).
- **Known gap SEC-02 (HIGH):** the orchestrator enqueues the job _before_
  conditionally creating the approval and swallows a write failure
  (`orchestrator.service.ts:75-80`, `createApprovalRecord` warn at `:118`); the
  handler never checks approval (`ai-agent-task.handler.ts:73,138,159`). Flag any
  new code path that executes on `pending`/`rejected`/`expired` or widens the
  swallow.

### 5. Secrets, encryption, SSRF, raw-AI-HTML, audit logging

- **No hardcoded/fallback secrets**; `.env.example` secret slots are **empty**
  (`secret-handling.md`). Connector secrets are AES-256-GCM encrypted at rest before
  persistence (`encryption.utility.ts`).
- **SSRF:** any user-supplied URL validated at input time (`resolveAndValidateUrl` /
  `ssrf.utility.ts`) before storage/use (rule 59).
- **No raw AI HTML:** `dangerouslySetInnerHTML` must not appear with AI content
  (`react/no-danger` is `error`; rules 36, 43). Verify:

  ```bash
  grep -rn "dangerouslySetInnerHTML" apps/web/src    # expect 0
  ```

- **No auth/secret/permission bypass:** no `NODE_ENV`-gated auth skips (rules 23,
  56), no client-forwarded role headers (web proxy rule 41 / api rule 76):

  ```bash
  grep -rnE "skipAuth|bypassAuth|DISABLE_AUTH|fakeUser|BEDROCK_MOCK" apps/api/src   # expect 0 in prod paths
  ```

- **Errors & logs:** only `BusinessException` with `messageKey` (no raw paths/stack/
  table names — rules 44, 77, 81); credentials redacted in structured logs
  (`app.module.ts` pino redaction); destructive mutations audited.

### 6. Run the scanners as a complement (not a substitute for the checklist)

```bash
pnpm audit:security      # pnpm audit (low) + Trivy fs (read the table, not the exit code)
pnpm scan:secrets        # gitleaks — hard gate; a committed secret anywhere in history fails
pnpm scan:trivy          # vuln + secret + misconfig (HIGH,CRITICAL)
```

Full scanner procedure: [`run-security-scan.md`](../devsecops/run-security-scan.md).

---

## Validation commands (real pnpm commands, from repo root)

This is a review — the deliverable is an evidence-backed finding list, not a code
change. Confirm the change itself still passes the hard gates, then run the scanners:

```bash
pnpm typecheck           # HARD gate
pnpm build               # HARD gate
pnpm scan:secrets        # gitleaks (hard) — read the output, don't assume
pnpm audit:security      # pnpm audit + Trivy (read the findings table)
```

**Never claim "secure" / "no findings" without the grep/read evidence and the
scanner output** (`AGENTS.md` §5, §13). For Trivy/audit, "clean" means an empty
findings table — not exit code 0.

---

## Common mistakes

- **Trusting the prose over the code** — verify each invariant with `Grep`/`Read`
  against the cited `file:line`; the audit confirms both strengths and gaps.
- **Reading `tenantId` from the request body/query/header** anywhere but the
  `GLOBAL_ADMIN` `X-Tenant-Id` path in `auth.guard.ts` (tenant-isolation §1).
- **`update`/`delete` by `id` alone** in a repository (SEC-03) — must be
  `{ id, tenantId }`.
- **A new endpoint without `@RequirePermission`** — the guard fails open (SEC-04).
- **Replicating the `GLOBAL_ADMIN` bypass** outside `permissions.guard.ts:46`.
- **A new AI egress path that skips `redact()`** (SEC-01) or executes a destructive
  action without a checked, persisted approval (SEC-02).
- **`dangerouslySetInnerHTML` with AI content** (`react/no-danger` error).
- **Calling Trivy's `0` exit "clean"** — `--exit-code 0` always returns 0; read the
  table (`run-security-scan.md`).
- **Claiming "secure" without evidence** — the `qa-gatekeeper` rejects it
  (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md` §6/§7, the `rules/security/*` + `rules/ai/ai-safety-rules.md`
      homes, and `security-performance-audit.md` Part A.
- [ ] **Tenant:** every tenant-owned read/write scoped by `tenantId`; no id-alone
      `update`/`delete` (SEC-03); sub-resource parent re-checked (SEC-06);
      `tenantId` only from JWT.
- [ ] **RBAC:** `@RequirePermission` on every endpoint (none added without it given
      SEC-04 fail-open); `@Throttle` on mutations; single GLOBAL_ADMIN bypass.
- [ ] **AI redaction:** no new raw-egress path; `redact()` intent honored (SEC-01).
- [ ] **AI approval:** destructive actions persist + check approval before execution;
      SEC-02 swallow not widened.
- [ ] **Secrets/encryption/SSRF:** no hardcoded/fallback secrets; empty `.env.example`
      slots; secrets encrypted at rest; user URLs SSRF-validated.
- [ ] **No raw AI HTML** (`dangerouslySetInnerHTML` = 0); no auth/`NODE_ENV` bypass;
      no client role-header forwarding; errors via `BusinessException`; secrets
      redacted in logs; mutations audited.
- [ ] Scanners run and **read**: `pnpm scan:secrets` (hard), `pnpm audit:security`,
      `pnpm scan:trivy`; `/security-review` run as a complement.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ on the change under review.
- [ ] Findings reported with `file:line` evidence (no "looks fine"); no invariant
      traded for a green gate. Final response uses the `AGENTS.md` §13 report block.
