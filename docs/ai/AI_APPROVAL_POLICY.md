# AI Approval Policy — Action Categories, `evaluateApproval`, Persisted `ApprovalRequest`

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — the universal AI entry
> point: the loading order, "the one rule" (_no AI agent may edit first and
> understand later_), and the security/AI-safety invariants. The binding one here
> is **§7 "AI safety invariants"**: _AI may **analyze and suggest**; it **must not
> silently execute** destructive security/infra actions — those are
> `approval-required` and need a **persisted approval + permission**._ This
> document is the **policy and reference** layer for that gate. It explains _what
> the policy is and why_, grounded in the real code. It does **not** restate the
> enforceable rules or the build recipe — those live in their own files:
>
> - **Hard rules (the law):** [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md)
>   — classification + the gate + the persisted-record invariant + the UI/audit
>   constraints, with the ship checklist. If this doc and the rules ever disagree,
>   the rules (and the code) win.
> - **Governance context:** [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md)
>   (approval as one of the governance gates) ·
>   [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md) (the
>   agent-dispatch approval path).
> - **Security view:** [`rules/security/ai-security.md`](../../rules/security/ai-security.md).
> - **UI side:** [`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md).
> - **Per-app rules (authoritative numbers):** [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
>   **#97** (persisted record), **#25/#33** (RBAC + AI throttle), **#26/#48**
>   (tenancy), **#56** (no `NODE_ENV` bypass), **#99** (log every trigger) ·
>   [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) **#44** (label every category),
>   **#59** (approval-status badge), **#43** (no raw AI HTML).
> - **Umbrella docs:** [`docs/AI.md`](../AI.md) · [`docs/ai/AI_GOVERNANCE.md`](./AI_GOVERNANCE.md)
>   · [`docs/ai/AI_AGENT_CATALOG.md`](./AI_AGENT_CATALOG.md) · [`docs/SECURITY.md`](../SECURITY.md).

## What this is

When an AI subsystem proposes an action — close an alert, run a SOAR playbook,
push a containment step, apply a finding — the platform has to answer one
question before anything happens: **does a human have to approve this first?**
This policy is how AuraSpear answers that question _the same way every time_, so
that **no destructive action is ever executed silently by AI**.

It is a deliberate **two-layer model**, matching the rest of the AI subsystem:

| Layer                            | Where                                                                                                                                                                     | Responsibility                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Policy** (provider-agnostic)   | [`packages/ai/src/safety.ts`](../../packages/ai/src/safety.ts), re-exported by [`packages/ai/src/index.ts`](../../packages/ai/src/index.ts)                               | Classify an action and decide if it needs approval. Pure, dependency-free.                                              |
| **Enforcement** (infrastructure) | [`apps/api/src/modules/ai/orchestrator/`](../../apps/api/src/modules/ai/orchestrator/) + [`apps/api/src/modules/agent-config/`](../../apps/api/src/modules/agent-config/) | Bind the decision to a **persisted `AiApprovalRequest`**, `@RequirePermission`, tenancy, audit, and a review lifecycle. |

Keep policy in the package; keep enforcement in the api. Never re-implement either
(see [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) §2).

## The four action categories

Every AI-proposed action carries an explicit `AiActionCategory`
([`safety.ts:9-18`](../../packages/ai/src/safety.ts)). There is **no
"uncategorized" state** — an unclassified side-effecting action is a bug.

| Category            | Enum member                          | Meaning (from `safety.ts`)                                            | May run without a human?                  |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| `analysis-only`     | `AiActionCategory.ANALYSIS_ONLY`     | Read-only reasoning/summarization. **No side effects.**               | Yes — nothing to gate                     |
| `suggested`         | `AiActionCategory.SUGGESTED`         | A recommendation the analyst may act on **manually**.                 | No — a human acts                         |
| `approval-required` | `AiActionCategory.APPROVAL_REQUIRED` | A side-effecting action that needs **explicit human approval first**. | No — persisted approval first             |
| `auto-allowed`      | `AiActionCategory.AUTO_ALLOWED`      | Pre-authorized **low-risk** automation, **allow-listed per tenant**.  | Only if non-destructive + low/medium risk |

Beyond the category, an `AiAction` ([`safety.ts:27-33`](../../packages/ai/src/safety.ts))
carries two more honesty signals that feed the gate:

- a `RiskLevel` — `low` / `medium` / `high` / `critical`
  ([`safety.ts:20-25`](../../packages/ai/src/safety.ts)); and
- a `destructive` boolean — _"mutates state outside AuraSpear (e.g. runs a
  playbook)"_. A SOAR playbook run, a connector mutation, or a containment action
  is `destructive: true` **regardless** of the category label you give it.

**Always use the enum, never string literals** (`apps/api/CLAUDE.md` #12/#17;
`apps/web/CLAUDE.md` #44). Write `AiActionCategory.APPROVAL_REQUIRED`, never
`'approval-required'`. The web mirror lives in `@/enums`
([`apps/web/src/enums/ai-config.enum.ts`](../../apps/web/src/enums/ai-config.enum.ts)).

## The gate — `evaluateApproval()`

`evaluateApproval(action)`
([`safety.ts:47-64`](../../packages/ai/src/safety.ts)) is the **single source of
truth** for "does a human have to approve this?". Call it; never hand-roll an
ad-hoc boolean. It returns `{ requiresApproval, reason }` — and the `reason` is
load-bearing, not decoration (see "Propagate the reason" below).

Read its body as a ladder — the **first** match wins:

| #   | Condition                                                                                      | Result  | `reason` (verbatim)                              |
| --- | ---------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1   | `category === ANALYSIS_ONLY`                                                                   | `false` | `Analysis-only action has no side effects.`      |
| 2   | `category === APPROVAL_REQUIRED`                                                               | `true`  | `Action is explicitly marked approval-required.` |
| 3   | `action.destructive`                                                                           | `true`  | `Destructive actions always require approval.`   |
| 4   | `risk ∈ {HIGH, CRITICAL}` (`HIGH_RISK` set, [`safety.ts:40`](../../packages/ai/src/safety.ts)) | `true`  | `Risk level "<risk>" requires approval.`         |
| 5   | `category === AUTO_ALLOWED` (not caught above)                                                 | `false` | `Non-destructive, allow-listed automation.`      |
| 6   | everything else (i.e. `SUGGESTED`)                                                             | `true`  | `Suggested actions require a human to act.`      |

**The conservatism is the whole point.** `destructive` or `high`/`critical` risk
**always** wins — even if a caller mislabeled the category `auto-allowed`, steps 3
and 4 fire before step 5 is ever reached. The _only_ paths that bypass approval
are **non-destructive + low/medium risk** that are either `analysis-only` or
explicitly `auto-allowed`. There is no fourth bypass, and you must not add one.

**Propagate the `reason`.** Carry it into the audit entry and the UI so an analyst
can see _why_ a thing was gated (or not). Discarding it loses the explanation.

**Never weaken the gate.** No new category that auto-executes a destructive
action; no `if (NODE_ENV !== 'production') skip` (`apps/api/CLAUDE.md` **#56**); no
feature flag that flips an approval off. If you genuinely believe the policy is
wrong, change `safety.ts` itself — with a test and an ADR
([`skills/docs/add-adr.md`](../../skills/docs/add-adr.md)) — never branch around it
at a call site.

## No silent destructive actions — the persisted `ApprovalRequest`

This is `apps/api/CLAUDE.md` **#97** verbatim: _every approval-required action MUST
create an `ApprovalRequest` record **before** execution. Never execute without
persisted approval._ **No record ⇒ no execution.** There is no in-memory or
"optimistic" approval — the approval has to survive a process restart, be visible
to a reviewer, and leave an audit trail.

### The record — `AiApprovalRequest`

Storage is the `AiApprovalRequest` Prisma model
([`apps/api/prisma/schema.prisma:2345`](../../apps/api/prisma/schema.prisma), table
`ai_approval_requests`):

| Field                                   | Type                                    | Notes                                                                        |
| --------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `tenantId`                              | `Uuid`                                  | Scope; `onDelete: Cascade` from `Tenant`. Every read/write is tenant-scoped. |
| `agentId`, `actionType`                 | `VarChar`                               | Which agent proposed what kind of action.                                    |
| `actionData`                            | `Json`                                  | The payload to run on approval (e.g. `{ jobId, payload, triggeredBy }`).     |
| `riskLevel`                             | `VarChar`, default `medium`             | The action's risk at request time.                                           |
| `status`                                | `VarChar`, default `pending`            | The lifecycle state — see `ApprovalStatus` below.                            |
| `requestedBy`                           | `VarChar(320)`                          | Actor/email (or trigger) that requested it.                                  |
| `reviewedBy` / `reviewedAt` / `comment` | `VarChar(320)?` / `DateTime?` / `Text?` | Set when a human resolves it.                                                |
| `result`                                | `Json?`                                 | Optional execution outcome.                                                  |
| `expiresAt`                             | `DateTime`                              | **Hard expiry** — set 24h out at creation.                                   |

Indexes are `(tenantId)`, `(tenantId, status)`, `(tenantId, agentId)` — the schema
itself encodes the tenant-scoping rule.

### The lifecycle — `ApprovalStatus`

The status is the `ApprovalStatus` enum
([`apps/api/src/common/enums/ai-agent-config.enum.ts:71`](../../apps/api/src/common/enums/ai-agent-config.enum.ts)):
`PENDING` → `APPROVED` / `REJECTED` / `EXPIRED`. A handler that finally runs the
action MUST honor this state — **never add a code path that executes on `pending`,
`rejected`, or `expired`**.

```
AI proposes action ─▶ evaluateApproval() (packages/ai/src/safety.ts)
                          │ requiresApproval === true
                          ▼
   createApprovalRecord ─▶ AiApprovalRequest { status: PENDING, expiresAt: +24h }
                          │  (orchestrator.service.ts → agentConfigService.createApproval)
                          ▼
   human reviews ────────▶ resolveApproval()  (agent-config.service.ts)
                          │  PENDING only, not expired → APPROVED | REJECTED
                          ▼
   executor runs the action ONLY when status === APPROVED (+ RBAC + tenancy re-checked)
```

### Where it is created — the orchestrator

For agent actions, dispatch flows through the orchestrator
([`apps/api/src/modules/ai/orchestrator/orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts)).
`dispatchAgentTask()` resolves the automation mode, enqueues the job, and — only
when `resolved.requiresApproval` is true — calls `createApprovalRecord()`
(`:78-80`), which persists the record with a **24h `expiresAt`** (`:98-99,112`) via
`agentConfigService.createApproval(...)`
([`agent-config.service.ts:304`](../../apps/api/src/modules/agent-config/agent-config.service.ts)).

The dispatch-side decision (`requiresApproval()`, `:179-188`) **mirrors
`evaluateApproval`'s conservatism**: approval is required when the automation mode
is in `APPROVAL_REQUIRED_MODES` (`approval_required`, `auto_governed`), **or** when
the mode is `AUTO_LOW_RISK` and the risk is in `HIGH_RISK_LEVELS`
(`medium`/`high`/`critical`) — both sets in
[`orchestrator.constants.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts).
Keep the two in sync: if you change `safety.ts`, re-check the orchestrator
constants, and vice-versa.

### Where it is reviewed — the resolve path

A human resolves an approval through `AgentConfigService.resolveApproval(...)`
([`agent-config.service.ts:329`](../../apps/api/src/modules/agent-config/agent-config.service.ts)).
`findAndValidateApproval` (`:350`) enforces the lifecycle: it 404s on a missing
record, **rejects anything not in `PENDING`** (`status !== ApprovalStatus.PENDING`
→ "already resolved"), and **rejects an expired one** (`isAfter(now, expiresAt)` →
"expired"). Only then does it write `status`, `reviewedBy`, `reviewedAt`, and
`comment`. This is what makes a stale or already-handled approval un-runnable.

### Findings are proposals, not actions

A writeback **finding** is created in a `proposed` state; an authorized user
transitions it via `PATCH /ai/findings/:id/status`
([`apps/api/src/modules/ai/writeback/`](../../apps/api/src/modules/ai/writeback/)).
**Applying a finding that mutates security/infra state is itself an
`approval-required` action** — it does not get to skip the gate just because it
arrived as a finding (see [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md)
§3). The AI Findings workspace is documented in `apps/web/CLAUDE.md` ("AI Findings
Page").

## Approval is necessary, not sufficient — the invariants around the gate

A persisted, approved record is required before execution, but it is **not the
only check**. The execute path layers the rest of the platform's invariants on
top:

- **RBAC on every approval endpoint.** Listing and resolving approvals require
  `Permission.AI_APPROVALS_MANAGE`
  ([`agent-config.controller.ts:164-183`](../../apps/api/src/modules/agent-config/agent-config.controller.ts);
  permission in [`permission.enum.ts:211`](../../apps/api/src/common/enums/permission.enum.ts)),
  and the controller carries the AI rate-limit tier
  `@Throttle({ default: { limit: 10, ttl: 60000 } })`
  (`apps/api/CLAUDE.md` **#25/#33**). The endpoint that _runs_ an approved action
  re-checks `@RequirePermission(...)` too — approval + permission + tenancy, all
  three, before anything runs.
- **Tenant-scoped, always.** Every `AiApprovalRequest`, every dispatch input, every
  audit line carries `tenantId` (`apps/api/CLAUDE.md` **#26**; `AGENTS.md` §6). AI
  investigation validates resource/alert tenant ownership before acting
  (**#48**). **No cross-tenant approval, ever.**
- **`auto-allowed` is per-tenant allow-listed, never global.** The enum comment is
  explicit — _"must be allow-listed per tenant"_
  ([`safety.ts:17`](../../packages/ai/src/safety.ts)). The same agent/action can be
  `auto-allowed` in one tenant and `approval-required` in another, because agent
  config is per-tenant (see [`docs/ai/AI_AGENT_CATALOG.md`](./AI_AGENT_CATALOG.md)
  and [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md)). Never
  hardcode a global allow-list, and never treat `auto-allowed` as "always safe" —
  it still fails the gate if it is `destructive` or high-risk.
- **Log the decision.** Every dispatch and every block is audited with `tenantId`,
  `agentId`, `actionType`, and outcome
  ([`orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts));
  `apps/api/CLAUDE.md` **#99** requires every trigger evaluation to be logged.
  Record the `requiresApproval`/`reason` so the audit trail explains the gate, and
  **redact before logging** — no secrets in approval/audit detail
  (`apps/api/CLAUDE.md` **#66**; `redact()` from
  [`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)).

## The UI labels and badges — but never grants

The web layer mirrors this gate (`apps/web/CLAUDE.md` **#44, #59**;
[`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md)) — but the
**frontend never fabricates approval**. The backend persists the
`AiApprovalRequest` and is the only authority.

- Every AI action category is **visually labeled** via the `AiActionCategory` enum
  so an analyst can tell `analysis-only`/`suggested` from `approval-required`, and
  knows when something ran as `auto-allowed` (`apps/web/CLAUDE.md` **#44**).
- Every `approval-required` action shows an **approval-status badge** driven off
  `ApprovalStatus` (`pending`/`approved`/`rejected`/`expired`); pending is visually
  distinct, and the **execute/apply control stays disabled until `APPROVED`**
  (`apps/web/CLAUDE.md` **#59**). The surface is
  [`ApprovalCard.tsx`](../../apps/web/src/components/ai-config/ApprovalCard.tsx) +
  hooks [`useAiApprovals.ts`](../../apps/web/src/hooks/useAiApprovals.ts) /
  [`useApprovalCard.ts`](../../apps/web/src/hooks/useApprovalCard.ts), proxied
  through [`apps/web/src/app/api/agent-config/approvals/`](../../apps/web/src/app/api/agent-config/approvals/)
  to the backend.
- **Never render raw AI output as HTML** while presenting a proposed action
  (`apps/web/CLAUDE.md` **#43**; `AGENTS.md` §7) — the action label/summary is plain
  text or safe markdown, never `dangerouslySetInnerHTML`.

## Quick reference (file map)

| Concern                                                  | File                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Policy: categories, risk, `AiAction`, `evaluateApproval` | [`packages/ai/src/safety.ts`](../../packages/ai/src/safety.ts)                                                                                                                                                           |
| Policy re-export                                         | [`packages/ai/src/index.ts`](../../packages/ai/src/index.ts)                                                                                                                                                             |
| Persisted record (Prisma)                                | [`apps/api/prisma/schema.prisma:2345`](../../apps/api/prisma/schema.prisma) (`AiApprovalRequest`)                                                                                                                        |
| Lifecycle enum                                           | [`ai-agent-config.enum.ts:71`](../../apps/api/src/common/enums/ai-agent-config.enum.ts) (`ApprovalStatus`)                                                                                                               |
| Create on dispatch                                       | [`orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts) (`createApprovalRecord`, `requiresApproval`)                                                                             |
| Dispatch-side constants                                  | [`orchestrator.constants.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts) (`APPROVAL_REQUIRED_MODES`, `HIGH_RISK_LEVELS`)                                                                      |
| Create / list / resolve                                  | [`agent-config.service.ts:302-374`](../../apps/api/src/modules/agent-config/agent-config.service.ts)                                                                                                                     |
| HTTP (RBAC + throttle)                                   | [`agent-config.controller.ts:162-184`](../../apps/api/src/modules/agent-config/agent-config.controller.ts) (`AI_APPROVALS_MANAGE`)                                                                                       |
| Findings = proposals                                     | [`apps/api/src/modules/ai/writeback/`](../../apps/api/src/modules/ai/writeback/)                                                                                                                                         |
| Web UI                                                   | [`ApprovalCard.tsx`](../../apps/web/src/components/ai-config/ApprovalCard.tsx) · [`useAiApprovals.ts`](../../apps/web/src/hooks/useAiApprovals.ts) · [`useApprovalCard.ts`](../../apps/web/src/hooks/useApprovalCard.ts) |
| Redaction (secret gate)                                  | [`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)                                                                                                                                                     |

## Related

- [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) — the
  enforceable invariants + ship checklist (**authoritative** for this gate).
- [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) (governance gates)
  · [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md) (agent
  dispatch) · [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md)
  (output contracts/rendering).
- [`rules/security/ai-security.md`](../../rules/security/ai-security.md) (security
  view of the gate) · [`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md)
  (UI labeling/badging).
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #97, #25, #33, #26, #48, #56,
  #66, #99 · [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #44, #59, #43.
- [`docs/AI.md`](../AI.md) (AI subsystem overview) ·
  [`docs/ai/AI_GOVERNANCE.md`](./AI_GOVERNANCE.md) ·
  [`docs/ai/AI_AGENT_CATALOG.md`](./AI_AGENT_CATALOG.md) ·
  [`docs/ai/AI_MEMORY_POLICY.md`](./AI_MEMORY_POLICY.md) ·
  [`docs/SECURITY.md`](../SECURITY.md) · [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md)
  · [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md) (full docs map).
- Recipe: [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md) (build
  an AI feature, including the approval path).
