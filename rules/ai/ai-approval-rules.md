# Rules — AI approval & action classification (analysis-only / suggested / approval-required / auto-allowed)

> **Read `../../AGENTS.md` first** (repo root) — loading order + the one rule:
> _no AI agent may edit first and understand later_. The binding invariant is
> `AGENTS.md` **§7 "AI safety invariants"**: AI may **analyze and suggest**, but it
> **must not silently execute** destructive security/infra actions — those are
> `approval-required` and need a **persisted approval + permission** before
> execution. This file is the dedicated home for that gate (the
> `./ai-safety.md` slot referenced by `./ai-governance.md` §6 — until that file
> exists, classification policy lives here). Siblings: `./ai-governance.md §6`
> (approval as one of seven governance gates), `./ai-agent-rules.md §5`
> (agent-dispatch approval path), `../security/ai-security.md §3` (security view),
> `../frontend/ai-ui-rules.md §4` (the UI badge), and the recipe
> `../../skills/ai/add-ai-feature.md`. Read those before changing an approval path.

These are **hard constraints** for any code that proposes an AI action and any
code that could execute it — `packages/ai/src/safety.ts` (the policy),
`apps/api/src/modules/ai/**` (the live subsystem that binds it), and the web
surfaces that label/gate it. A violation here is an **unapproved destructive
action**, not a style nit. Where this file and a `CLAUDE.md` overlap, the
**CLAUDE.md rule number is authoritative** (`apps/api/CLAUDE.md` **#97**,
`apps/web/CLAUDE.md` **#44, #59**). Every claim below maps to real code, cited by
path.

The policy is **provider-agnostic and lives in the package**
(`packages/ai/src/safety.ts`, re-exported via `packages/ai/src/index.ts`); the
api binds it to persisted `ApprovalRequest` records and `@RequirePermission`. Keep
policy in the package; keep enforcement in the api. Never re-implement either.

---

## 1. Classify every AI-proposed action — one of four categories

Every action an AI subsystem proposes MUST carry an explicit
`AiActionCategory` (`packages/ai/src/safety.ts:9-18`). There is no "uncategorized"
state — an unclassified side-effecting action is a bug.

| Category            | Enum member                          | Meaning (from `safety.ts`)                                            | May execute without a human?              |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| `analysis-only`     | `AiActionCategory.ANALYSIS_ONLY`     | Read-only reasoning/summarization. **No side effects.**               | Yes — nothing to gate                     |
| `suggested`         | `AiActionCategory.SUGGESTED`         | A recommendation the analyst may act on **manually**.                 | No — a human acts                         |
| `approval-required` | `AiActionCategory.APPROVAL_REQUIRED` | A side-effecting action that needs **explicit human approval first**. | No — persisted approval first             |
| `auto-allowed`      | `AiActionCategory.AUTO_ALLOWED`      | Pre-authorized **low-risk** automation, **allow-listed per tenant**.  | Only if non-destructive + low/medium risk |

- **Use the enum, never string literals** (`apps/web/CLAUDE.md` **#44**;
  `apps/api/CLAUDE.md` #12/#17). Backend imports from the api's enum home; web
  imports `AiActionCategory` from `@/enums`. Write
  `AiActionCategory.APPROVAL_REQUIRED`, never `'approval-required'`.
- An `AiAction` (`safety.ts:27-33`) carries `category`, a `RiskLevel`
  (`low`/`medium`/`high`/`critical`, `safety.ts:20-25`), and a `destructive`
  boolean ("mutates state outside AuraSpear, e.g. runs a playbook"). All three
  feed the gate in §2 — set them honestly. A SOAR playbook run, a connector
  mutation, a containment action, or anything that touches security/infra is
  `destructive: true`, regardless of the category you label it.

## 2. The gate is `evaluateApproval()` — conservative by design, never re-implemented

`evaluateApproval(action)` (`packages/ai/src/safety.ts:47-64`) is the **single
source of truth** for "does a human have to approve this?". Call it; never hand-roll
an ad-hoc boolean (`../security/ai-security.md §3`). Its order (read it as a ladder):

1. `ANALYSIS_ONLY` → `requiresApproval: false` ("no side effects").
2. `APPROVAL_REQUIRED` → `true` (explicitly marked).
3. `action.destructive` → `true` ("Destructive actions always require approval").
4. `HIGH`/`CRITICAL` `RiskLevel` (`HIGH_RISK` set, `safety.ts:40`) → `true`.
5. `AUTO_ALLOWED` (and not caught above) → `false` ("Non-destructive, allow-listed automation").
6. Everything else (i.e. `SUGGESTED`) → `true` ("Suggested actions require a human to act").

- **The conservatism is the point:** `destructive` or `high`/`critical` risk
  **always** wins, even if a caller mislabeled the category `auto-allowed`. The
  only path that bypasses approval is **non-destructive + low/medium risk** that is
  either `analysis-only` or explicitly `auto-allowed`. Do not add a fourth bypass.
- `evaluateApproval` returns `{ requiresApproval, reason }` — **propagate the
  `reason`** into the audit entry and the UI so an analyst sees _why_ a thing is
  gated. Do not discard it.
- **Never weaken it.** No new category that auto-executes a destructive action; no
  `if (NODE_ENV !== 'production') skip` (`apps/api/CLAUDE.md` **#56**); no
  feature-flag that flips an approval off. If you think the policy is wrong, change
  `safety.ts` with a test and an ADR — never branch around it at a call site.

## 3. `approval-required` ⇒ a persisted `ApprovalRequest` BEFORE execution

This is `apps/api/CLAUDE.md` **#97** verbatim: _every approval-required action MUST
create an `ApprovalRequest` record before execution. Never execute without
persisted approval._ No record ⇒ no execution. There is no in-memory or
"optimistic" approval.

- **Agent actions** flow through the orchestrator (`./ai-agent-rules.md §5`).
  `dispatchAgentTask()` resolves the mode, and when
  `resolved.requiresApproval` is true it calls `createApprovalRecord()` →
  `agentConfigService.createApproval(...)`
  (`apps/api/src/modules/ai/orchestrator/orchestrator.service.ts:74-101`). The
  decision uses `requiresApproval()` (`:179-186`): `true` when the automation mode
  is in `APPROVAL_REQUIRED_MODES` (`approval_required`, `auto_governed` —
  `orchestrator.constants.ts:7`), **or** when mode is `AUTO_LOW_RISK` and the risk
  is in `HIGH_RISK_LEVELS` (`orchestrator.constants.ts:13`). This mirrors
  `evaluateApproval`'s conservatism — keep the two consistent.
- **Approvals have a lifecycle and an expiry.** The record is persisted with a
  **24h expiry** (`expiresAt`, `orchestrator.service.ts:98-99,112`) and an
  `ApprovalStatus` (`pending` → `approved` / `rejected` / `expired`). The handler
  that finally runs the action MUST honor approval state — do **not** add a code
  path that executes on `pending`, `rejected`, or `expired`.
- **Writeback findings are proposals, not actions.** A finding is created in
  `proposed` state and only an authorized user transitions it via
  `PATCH /ai/findings/:id/status` (proposed → applied/dismissed, with transition
  validation in
  `apps/api/src/modules/ai/writeback/ai-writeback.service.ts`). **Applying a
  finding that mutates security/infra state is itself an `approval-required`
  action** — it does not get to skip §2–§3 because it came from a finding.
- **The execute path re-checks RBAC.** The persisted approval is _necessary, not
  sufficient_: the endpoint that runs the approved action still carries
  `@RequirePermission(...)` (`apps/api/CLAUDE.md` **#25**) and the AI rate-limit
  tier `@Throttle({ default: { limit: 10, ttl: 60000 } })` (**#33**). Approval +
  permission + tenancy, all three, before anything runs.

## 4. Tenancy, allow-listing, audit — the invariants around the gate

- **`auto-allowed` is per-tenant allow-listed, never global.** The enum comment is
  explicit: "must be allow-listed per tenant" (`safety.ts:17`). Agent config is
  per-tenant — the same agent/action can be `auto-allowed` in one tenant and
  `approval-required` in another (`./ai-agent-rules.md §1`). Never hardcode a
  global allow-list, and never treat `auto-allowed` as "always safe" — it still
  fails the gate if it is `destructive` or high-risk (§2).
- **Everything is `tenantId`-scoped.** Every `ApprovalRequest`, every dispatch
  input, every audit line carries `tenantId` (`AGENTS.md` §6; `apps/api/CLAUDE.md`
  **#26** — every `update()`/`delete()` scoped by `tenantId`). AI investigation
  validates alert/resource tenant ownership before acting (**#48**). No
  cross-tenant approval, ever.
- **Log the decision.** Every dispatch and every block is audited with `tenantId`,
  `agentId`, `actionType`, and outcome (`AppLogOutcome.SUCCESS` / `DENIED`,
  `orchestrator.service.ts`); `apps/api/CLAUDE.md` **#99** requires every trigger
  evaluation to be logged. Record the `requiresApproval`/`reason` from §2 so the
  audit trail explains the gate. Redact before logging (`../security/ai-security.md
§4`, `apps/api/CLAUDE.md` **#66**) — no secrets in approval/audit detail.

## 5. The UI labels the category and badges the approval — but never grants it

The web layer mirrors this gate (`../frontend/ai-ui-rules.md §4`,
`apps/web/CLAUDE.md` **#44, #59**) — but the **frontend never fabricates
approval**; the backend persists the `ApprovalRequest` and is the only authority.

- Every AI action category is **visually labeled** via the `AiActionCategory` enum
  (`@/enums`) — `analysis-only`/`suggested` neutral/info, `approval-required`
  distinct, `auto-allowed` still labeled so the analyst knows it ran without review
  (`apps/web/CLAUDE.md` **#44**).
- Every `approval-required` action shows an **approval-status badge** driven off
  `ApprovalStatus` (`pending`/`approved`/`rejected`/`expired`); pending is visually
  distinct, and the **"execute"/"apply" control stays disabled until `APPROVED`**
  (`apps/web/CLAUDE.md` **#59**; `../frontend/ai-ui-rules.md §4`).
- **Never render raw AI output as HTML** while presenting a proposed action
  (`AGENTS.md` §7; `apps/web/CLAUDE.md` **#43**) — the action label/summary is
  plain text or safe markdown, never `dangerouslySetInnerHTML`.

---

## Quick gate — before you commit an approval-touching change

1. **Classified** — the action carries an explicit `AiActionCategory`
   (enum, not a string) plus honest `risk` and `destructive` flags. No
   side-effecting action is unclassified.
2. **Gated by `evaluateApproval()`** — the package function decides; no ad-hoc
   boolean re-implements it; the conservatism (destructive/high-risk always
   approval-required) is intact; the `reason` is propagated.
3. **Persisted before execution** — `approval-required` ⇒ an `ApprovalRequest`
   row exists **before** any execution; the executor honors `ApprovalStatus`
   (no run on `pending`/`rejected`/`expired`); the execute endpoint re-checks
   `@RequirePermission` + AI `@Throttle` tier.
4. **Tenant-scoped & audited** — `tenantId` on the approval/dispatch/log;
   `auto-allowed` is per-tenant allow-listed; the decision + reason are audited
   with secrets redacted.
5. **UI gated, not granting** — category labeled, `approval-required` shows an
   `ApprovalStatus` badge, execute disabled until `APPROVED`; no raw AI HTML.
6. **Hygiene** — no `any`, no `eslint-disable`. Run `pnpm typecheck` (blocking
   gate; `tsgo`/`typecheck:fast` advisory) and `pnpm lint` — don't claim green
   until both pass (`../global/validation-gates.md`). **pnpm only, Node 22.**
   **Branch first — never work on `main`.** Prove before deleting any
   file/dep/env var (`AGENTS.md` §8).

## Related

- `../../AGENTS.md` — §7 AI safety invariants (approval-required destructive
  actions), §6 tenancy/secrets, §8 branch safety.
- `packages/ai/src/safety.ts` — `AiActionCategory`, `RiskLevel`, `AiAction`,
  `evaluateApproval()` (the policy this file governs);
  `packages/ai/src/index.ts` re-exports it.
- `../../apps/api/CLAUDE.md` — **#97** (persisted `ApprovalRequest` before
  execution), **#25/#33/#80** (RBAC + AI throttle on the execute path), **#26/#48**
  (tenant scoping/ownership), **#56** (no `NODE_ENV` bypass), **#66/#99**
  (audit redaction, trigger logging), **#88/#89** (no mock/hardcoded provider).
- `../../apps/web/CLAUDE.md` — **#44** (label every action category), **#59**
  (approval-status badge, disabled until `APPROVED`), **#43** (no raw AI HTML).
- `apps/api/src/modules/ai/orchestrator/` — `orchestrator.service.ts`
  (`requiresApproval`, `createApprovalRecord`), `orchestrator.constants.ts`
  (`APPROVAL_REQUIRED_MODES`, `HIGH_RISK_LEVELS`, `DISABLED_MODES`);
  `apps/api/src/modules/ai/writeback/ai-writeback.service.ts` (findings = proposals).
- `./ai-agent-rules.md §5` (agent-dispatch approval path), `./ai-governance.md §6`
  (approval as a governance gate), `../security/ai-security.md §3` (security view),
  `../frontend/ai-ui-rules.md §4` (UI side), `../../skills/ai/add-ai-feature.md`
  (recipe), `../../docs/AI.md` + `../../docs/ai/` (architecture).
