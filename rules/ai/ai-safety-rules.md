# AI safety rules — analyze and suggest, never silently act

> **Read `AGENTS.md` first** (repo root) — §7 "AI safety invariants" and the one
> rule: _no AI agent may edit first and understand later._ Then `apps/api/CLAUDE.md`
> (rules 48, 88, 89, 97) and `apps/web/CLAUDE.md` (rules 43, 44, 46). This file is
> the dedicated AI-safety home referenced by `../backend/layering-rules.md` §2,
> `../security/security-rules.md` §12, and the approval-policy detail in
> `ai-approval-rules.md`. GOD MODE §7 / §13.4 is the source. A violation here is
> an **unapproved destructive action or a data-exfiltration leak**, not a style
> nit. Every claim maps to real code.

The binding invariant: **AI may analyze and suggest, but it must not silently
execute** destructive security/infra actions, and **no PII/secret leaves the
platform un-redacted.** Several of these invariants have **known gaps** (SEC-01,
SEC-02) — this file documents the rule _and_ the gap so no agent assumes the
control exists. Sibling: `ai-approval-rules.md` (the four-category policy +
`evaluateApproval`), `ai-output-rules.md`, `ai-memory-rules.md`,
`../security/ai-security.md`.

---

## 1. AI analyzes and suggests; destructive actions are approval-required

- **AI must not silently execute.** Destructive security/infra actions (SOAR
  playbook runs, connector mutations, containment, write-backs that mutate
  state) are `approval-required` and need a **persisted `ApprovalRequest` before
  execution** (`apps/api/CLAUDE.md` rule 97; `AGENTS.md` §7).
- **The policy lives in `packages/ai/src/safety.ts`** — classify every proposed
  action with `AiActionCategory`, set honest `RiskLevel` + `destructive`, and gate
  with `evaluateApproval()` (the conservative single source of truth). Never
  hand-roll an ad-hoc approval boolean (`ai-approval-rules.md` §1–§2).
- **Beware the divergent enum (PKG-01):** `packages/ai` uses **hyphen** values
  (`'approval-required'`) and `apps/api` uses **underscore**
  (`'approval_required'`) — `apps/api/src/common/enums/ai-feature.enum.ts:39`.
  Use the enum member, never a literal, and know which vocabulary your surface
  speaks (`../global/monorepo-boundaries.md` §4).

## 2. SEC-02 — the execution gate is currently missing; the target

This is the most important gap to encode (`docs/audit/security-performance-audit.md`
SEC-02, `HUMAN REVIEW`):

- **Current behavior:** `orchestrator.service.ts:75-80` **enqueues the agent job
  first** and only then conditionally creates the approval record;
  `createApprovalRecord` swallows a write failure with a `logger.warn` (`:118`).
  The handler `ai-agent-task.handler.ts` never inspects `payload.requiresApproval`
  and never queries `AiApprovalRequest` for `approved` before running (`:73`,
  `:138`, `:159`). So an approval-required action can execute **without** a
  persisted approval.
- **The target:** create the approval record **before** enqueue (same transaction,
  hard-fail on write error — no swallow), and in the handler **refuse to execute**
  an approval-required action unless its `AiApprovalRequest` status is `approved`
  (`pending`/`rejected` → no-op). Tests: pending → blocked, approved → runs,
  rejected → no-op.
- **Until fixed:** never add a code path that executes a destructive AI action on
  `pending`/`rejected`/`expired`, and never widen the swallow. Treat rule 97 as
  binding even though enforcement is incomplete.

## 3. Redact PII/secrets BEFORE every model/embedding call

- **Use `redact()` from `@auraspear/ai`** (`packages/ai/src/redaction.ts:77`) on
  every outbound `prompt`/`text` immediately before the provider invoke
  (`AGENTS.md` §7: "redact inputs").
- **SEC-01 — this is currently NOT done** (`docs/audit/security-performance-audit.md`
  SEC-01, `HIGH` · `HUMAN REVIEW`): `apps/api` has **zero** `@auraspear/ai`
  imports; the outbound path forwards prompts verbatim
  (`ai.service.ts` `invokeGenericConnector` `:709-739`, `bedrock.service.ts`
  `invoke` `:76-104`, `embedding.service.ts` `:16-34`). The only redaction today
  is **post-hoc transcript** scrubbing (`ai-transcript.service.ts:163`
  `redactThread`) — not the data leaving the platform.
- **The target:** one shared AI-egress wrapper that calls `redact()` at the single
  chokepoint in `invokeGenericConnector` and in `EmbeddingService`, with a
  `keep`-list only for IOCs intentionally under analysis (opt-in). Test for a
  synthetic secret leaving redacted **and** for over-redaction (don't clobber the
  IOCs the analyst is investigating). New AI-call code must route through this
  wrapper, not send raw input.

## 4. Never render raw AI output as HTML

- **No `dangerouslySetInnerHTML` with AI content** — `react/no-danger` is `error`
  (`apps/web/CLAUDE.md` rules 36, 43; `AGENTS.md` §7). Render AI output as safe
  markdown or plain text; render structured blocks (risk gauges, IOC tables, MITRE
  maps, timelines) only with `src/components/ai-renderer/` components (rule 53).
- **Never render raw inter-agent JSON** in the UI — transform to human-readable
  first (rule 58). Components call AI only through `src/hooks/useAi*.ts`
  (rule 41). See `../frontend/ai-ui-rules.md`, `ai-output-rules.md`.

## 5. Provenance, confidence, citations — every AI surface is attributable

- **Every AI-enabled UI surface shows** loading, error, **confidence** (when
  available), **provider attribution**, and a regenerate affordance
  (`apps/web/CLAUDE.md` rule 42). The audit log records which provider/model was
  used. AI must never present an answer as fact without its provenance.
- **Every AI action category is labeled** (`analysis-only` / `suggested` /
  `approval-required` / `auto-allowed`) via the `AiActionCategory` enum, and
  `approval-required` shows an approval-status badge with execute disabled until
  `APPROVED` (`apps/web/CLAUDE.md` rules 44, 59; `ai-approval-rules.md` §5).

## 6. AI memory is tenant-scoped and holds no secrets

- `UserMemory` storage/retrieval is scoped by `tenantId`; redact before storing;
  AI investigation validates alert/resource tenant ownership before acting
  (`apps/api/CLAUDE.md` rule 48; `../security/tenant-isolation.md` §5,
  `ai-memory-rules.md`). **Never store AI responses in `localStorage`**
  (`apps/web/CLAUDE.md` rule 46) — server-side session only.

## 7. The provider cascade is centralized — no mock, no single provider

- **Try ALL configured connectors** in order (`bedrock → llm_apis →
openclaw_gateway`) before falling back to `model: 'rule-based'`; rule-based fires
  only when all fail or none are configured (`apps/api/CLAUDE.md` rules 88, 89,
  30). **Never hardcode one provider, never use `BEDROCK_MOCK`** or any
  env-gated mock in production (rule 89; `AGENTS.md` §7). Provider SDKs stay in
  the connector adapters (`../global/library-wrapper-rules.md`,
  `../backend/integration-rules.md`).

---

## Self-check before you commit an AI-touching change

- [ ] Every proposed action is classified (`AiActionCategory` enum, honest
      `risk`/`destructive`) and gated by `evaluateApproval()`; no ad-hoc boolean.
- [ ] Approval-required ⇒ persisted `ApprovalRequest` before execution; the
      executor honors `approved` status (don't widen the SEC-02 gap).
- [ ] Outbound `prompt`/`text` routed through `redact()` before the provider
      invoke (don't add a new raw-egress path; SEC-01).
- [ ] No `dangerouslySetInnerHTML` / raw AI HTML / raw inter-agent JSON; AI calls
      via `useAi*` hooks and `ai-renderer/`.
- [ ] Surface shows confidence + provider attribution; category labeled;
      approval badge present.
- [ ] AI memory tenant-scoped, no secrets, never in `localStorage`; alert/resource
      tenant ownership validated.
- [ ] Cascade tries all connectors; no single-provider hardcode, no mock mode;
      SDKs in adapters.
- [ ] No `any`/`eslint-disable`; `pnpm typecheck` green (blocking,
      `../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).

## Related

- `../../AGENTS.md` §7; `../../apps/api/CLAUDE.md` rules 48, 88, 89, 97;
  `../../apps/web/CLAUDE.md` rules 41–44, 46, 53, 58, 59.
- `packages/ai/src/safety.ts` (policy), `packages/ai/src/redaction.ts` (`redact`).
- `ai-approval-rules.md`, `ai-output-rules.md`, `ai-memory-rules.md`,
  `ai-governance.md`, `../frontend/ai-ui-rules.md`, `../security/ai-security.md`.
- `docs/audit/security-performance-audit.md` SEC-01/02; `docs/architecture/AI.md`.
