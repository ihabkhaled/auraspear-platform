# AI_CONTEXT.md — AuraSpear AI subsystem (`packages/ai` + `apps/api/src/modules/ai`)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → [`../memory/*.md`](../memory/)
> (esp. [`../memory/AI_MEMORY.md`](../memory/AI_MEMORY.md)) → this `context/*.md`
> → [`../rules/**`](../rules/) → [`../skills/**`](../skills/) →
> [`../docs/**`](../docs/) → code + tests. This file is **step 3** for any task
> touching the AI subsystem. Do **not** edit before you have read the rules and
> skills linked below — _no AI agent may edit first and understand later._

This is the **AI orientation** file: where the provider-agnostic contracts live
(`packages/ai`), where the live AI subsystem runs (`apps/api/src/modules/ai`),
the **provider cascade**, **approval policy**, **cross-chat memory**, and the
**evaluation harness**. For the strict NestJS layering that every AI module also
obeys, read [`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md) first. For the AI UI
surface (panels, renderers, hooks) see [`./FRONTEND_CONTEXT.md`](./FRONTEND_CONTEXT.md).
Where this file and a `CLAUDE.md` overlap, the **CLAUDE.md rule number is
authoritative**.

---

## What this area is

AuraSpear is an **AI-first SOC platform**. Its AI subsystem has two halves:

- **`packages/ai` (`@auraspear/ai`)** — a **dependency-free**, provider-agnostic
  layer of contracts and pure decision logic, consumed by **both** web and api.
  No SDKs, no infrastructure (see [`packages/ai/src/index.ts`](../packages/ai/src/index.ts)
  header). Six modules:
  - [`safety.ts`](../packages/ai/src/safety.ts) — `AiActionCategory`
    (`analysis-only`/`suggested`/`approval-required`/`auto-allowed`), `RiskLevel`,
    and `evaluateApproval()` — the conservative policy that decides whether a
    human must approve before an action runs (destructive **or** high-risk →
    approval required).
  - [`model-router.ts`](../packages/ai/src/model-router.ts) — `AiProviderKind`,
    `DEFAULT_PROVIDER_ORDER` (`bedrock → llm_apis → openclaw_gateway`), and
    `routeProviders()`/`selectProvider()` — the cascade decision logic
    (enabled + healthy, then fall back to `rule-based`).
  - [`types.ts`](../packages/ai/src/types.ts) — output contracts: `AiProvenance`
    (provider/model/confidence), `AiCitation`, `AiFinding`, `RiskScore`,
    `IocEnrichment`, `isHighConfidence()`.
  - [`redaction.ts`](../packages/ai/src/redaction.ts) — `redact()` strips
    PII/secrets (JWT, AWS keys, bearer tokens, private keys, emails, IPs) **before**
    model calls and **before** persisting transcripts.
  - [`evaluators.ts`](../packages/ai/src/evaluators.ts) — `runEval()`, a minimal
    golden-case harness with `safety` assertions that fail the whole run.
  - [`prompts.ts`](../packages/ai/src/prompts.ts) — versioned `PromptTemplate` +
    `renderPrompt()` so outputs record which prompt version produced them.

- **`apps/api/src/modules/ai`** — the **live** NestJS subsystem that wires those
  contracts to real provider SDKs, the database, memory, audit, and approvals.
  The orchestrating entry point is
  [`ai.service.ts`](../apps/api/src/modules/ai/ai.service.ts) → `executeAiTask()`,
  which checks the feature catalog, loads the active prompt, resolves the agent
  config + budget/quota, then **cascades through every configured connector**.

The web app **never** calls AI providers directly — it proxies through
`apps/web/src/app/api/*` and renders results via AI hooks
(`apps/web/src/hooks/useAi*.ts`).

---

## Where files live

**Provider-agnostic layer** — [`packages/ai/src/`](../packages/ai/src/) (the six
files above; all re-exported from `index.ts`).

**Live AI subsystem** — [`apps/api/src/modules/ai/`](../apps/api/src/modules/ai/),
wired in [`ai.module.ts`](../apps/api/src/modules/ai/ai.module.ts). Each
sub-area is its own NestJS module obeying the strict layering
(controller → service → repository → utilities; see
[`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md)). Treat this as a map, not an
inventory — run `ls apps/api/src/modules/ai` for the live set:

- **Core / cascade** — `ai.service.ts`, `ai.repository.ts`, `ai.controller.ts`,
  `ai.utilities.ts`, `ai.constants.ts` (`AI_CONNECTOR_PRIORITY`, per-provider
  max-token caps), `ai.types.ts` (`AiResponse`, `ResolvedAiConnector`),
  `ai-error.utilities.ts`. Provider SDK adapters live **outside** this module in
  `../connectors/services/` (`bedrock.service.ts`, `llm-apis.service.ts`,
  `openclaw-gateway.service.ts`) + `../connectors/llm-connectors/` (dynamic
  per-tenant LLM connectors, `FIXED_AI_CONNECTORS`).
- **`memory/`** — cross-chat memory: `memory-extraction.service.ts`,
  `memory-retrieval.service.ts` (cosine similarity on embeddings),
  `embedding.service.ts`, `user-memory.controller.ts`,
  `rag-observability.controller.ts`.
- **`eval/`** — `ai-eval.service.ts` + controller (suites, runs, golden datasets
  persisted to `aiEvalSuite`/`aiEvalRun`).
- **`feature-catalog/`** — per-tenant feature enable/disable + preferred provider
  (`AiFeatureKey`). **`prompt-registry/`** — versioned active prompts per feature.
  **`usage-budget/`** — token budgets, cost rates, quota enforcement.
- **`orchestrator/`** — multi-agent graph, scheduler, event listener, triggers
  (`schedule/`). **`writeback/`** — AI findings → cases/handoffs (`AI_FINDINGS`).
  **`chat/`**, **`simulation/`**, **`semantic-search/`**, **`ai-ops-workspace.*`**.
- **Agent configuration** — separate module
  [`apps/api/src/modules/agent-config/`](../apps/api/src/modules/agent-config/):
  the 7 agents (`AiAgentId`), provider modes (`AiProviderMode`), trigger configs,
  OSINT sources (SSRF-validated, AES-256-GCM-encrypted keys), and the
  **`ApprovalRequest`** persistence path.

**Shared enums/utilities** (`apps/api/src/common/`): AI agent/feature enums in
`common/enums/`; `redaction.utility.ts`, `encryption.utility.ts`,
`ssrf.utility.ts` in `common/utils/`. **Frontend**: AI hooks in
`apps/web/src/hooks/useAi*.ts`, enums in `apps/web/src/enums/`, standardized
renderers in `apps/web/src/components/ai-renderer/`.

### The provider cascade (the load-bearing flow)

`AiService.findAvailableAiConnectors(tenantId)` returns **ALL** configured
connectors in priority order (fixed `AI_CONNECTOR_PRIORITY`, then dynamic
per-tenant LLM connectors). `tryConnectorsInOrder()` then iterates them
**sequentially** — if Bedrock fails it tries LLM APIs, then OpenClaw Gateway. A
clearly-labeled **`rule-based`** fallback fires **only** when every connector
fails or none is configured (`CLAUDE.md` api #88; web #30). Each attempt and the
final provider/model used is audit-logged.

---

## What rules apply (read before editing)

Always load [`../rules/global/*`](../rules/global/) (`absolute-rules.md`,
`branch-safety.md`, `validation-gates.md`), then the **AI** area rules in
[`../rules/ai/`](../rules/ai/):

- [`ai-governance.md`](../rules/ai/ai-governance.md) — provider cascade,
  `recordUsage`, prompt versioning, audit, provenance production.
- [`ai-output-rules.md`](../rules/ai/ai-output-rules.md) — typed result contracts
  (`packages/ai/src/types.ts`), provenance + citations, **never render raw AI
  output as HTML**.
- [`ai-approval-rules.md`](../rules/ai/ai-approval-rules.md) — destructive =
  `approval-required`; persist an `ApprovalRequest` **before** execution.
- [`ai-agent-rules.md`](../rules/ai/ai-agent-rules.md) — the 7 agents,
  `AiProviderMode`, per-mode trigger Zod schemas, OSINT SSRF + key encryption.
- [`ai-memory-rules.md`](../rules/ai/ai-memory-rules.md) — tenant-scoped memory,
  no secrets stored, redact before model calls.

Also load [`../rules/security/ai-security.md`](../rules/security/) and the
backend rules ([`../rules/backend/`](../rules/backend/)) — every AI module is a
NestJS module bound by the same layering/tenant/permission rules.

**Invariants that govern every AI change (from [`../AGENTS.md`](../AGENTS.md) §6–§7):**

- **Tenant isolation** — every AI query/memory/finding is scoped by `tenantId`;
  AI investigation validates the alert belongs to the caller's tenant (api
  `CLAUDE.md` #48) before any cross-tenant read. No cross-tenant data, ever.
- **RBAC** — every AI endpoint carries `@RequirePermission(...)` and AI
  controllers are rate-limited (`@Throttle` 10/min, api #33). Never bypass.
- **Approval-required for destructive actions** — AI may analyze/suggest; it
  **must not silently execute** destructive security/infra actions. Persist an
  `ApprovalRequest` + check permission first (api #97; `evaluateApproval()` in
  [`safety.ts`](../packages/ai/src/safety.ts)).
- **Provenance + safe rendering** — every result carries provider/model/confidence
  - citations; **never render raw AI output as HTML** (web #43, no
    `dangerouslySetInnerHTML`). Render as markdown via a safe renderer or plain text.
- **No mocks / no single provider** — no `BEDROCK_MOCK` or env-gated mock mode
  in production (api #89); never hardcode one provider — cascade all configured
  connectors (api #88, web #30). No `NODE_ENV` security shortcuts (api #56).
- **Memory safety** — memory is tenant-scoped, stores **no secrets**, and inputs
  are redacted before model calls (`redact()`); transcripts are not stored in
  localStorage (web #46).
- **No `any`**, no `eslint-disable`, no inline declarations, enums over string
  literals (`AiAgentId.ORCHESTRATOR`, not `'orchestrator'`; web #50/#51/#52).
  **pnpm only, Node 22.**

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/ai/`](../skills/ai/) (each opens with
"Read `AGENTS.md` first"):

- Add an AI feature/surface end-to-end →
  [`add-ai-feature.md`](../skills/ai/add-ai-feature.md)
- Add an AI agent → [`add-ai-agent.md`](../skills/ai/add-ai-agent.md)
- Add/version a prompt → [`add-ai-prompt.md`](../skills/ai/add-ai-prompt.md)
- Add an evaluator/golden case → [`add-ai-evaluator.md`](../skills/ai/add-ai-evaluator.md)
- Add to the memory pipeline → [`add-ai-memory.md`](../skills/ai/add-ai-memory.md)

Cross-area: an AI surface in the UI also needs a panel + standardized renderer
([`../skills/frontend/add-ai-panel.md`](../skills/frontend/add-ai-panel.md)), a
proxy route + i18n keys (×6 locales), and — if it adds a permission — the full
9-step permission change ([`../skills/backend/add-permission.md`](../skills/backend/add-permission.md)).
Validate before shipping → [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md).

---

## What docs to read

- [`../docs/AI.md`](../docs/AI.md) — top-level AI architecture + governance index.
- [`../docs/ai/AI_ARCHITECTURE.md`](../docs/ai/AI_ARCHITECTURE.md) — subsystem
  shape and data flow.
- [`../docs/ai/AI_PROVIDER_ROUTING.md`](../docs/ai/AI_PROVIDER_ROUTING.md) — the
  cascade, connector config (Bedrock / LLM APIs / OpenClaw Gateway).
- [`../docs/ai/AI_APPROVAL_POLICY.md`](../docs/ai/AI_APPROVAL_POLICY.md) +
  [`AI_GOVERNANCE.md`](../docs/ai/AI_GOVERNANCE.md) — approval categories, audit.
- [`../docs/ai/AI_MEMORY_POLICY.md`](../docs/ai/AI_MEMORY_POLICY.md) — cross-chat
  memory, embeddings, retrieval, user control.
- [`../docs/ai/AI_EVALUATION.md`](../docs/ai/AI_EVALUATION.md),
  [`AI_PROMPTING.md`](../docs/ai/AI_PROMPTING.md),
  [`AI_AGENT_CATALOG.md`](../docs/ai/AI_AGENT_CATALOG.md).
- Authoritative rule lists: [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md)
  (esp. #33, #48, #88–#100) and [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md)
  (esp. #30, #41–#61). [`../memory/AI_MEMORY.md`](../memory/AI_MEMORY.md) for
  stable AI truths.

---

## Common mistakes

- **Short-circuiting the cascade** — bailing to `rule-based` after a single
  provider failure. `tryConnectorsInOrder()` must try **every** configured
  connector first; rule-based only when all fail or none exist (api #88, web #30).
- **Hardcoding one provider** or leaving an env-gated mock (`BEDROCK_MOCK`) in
  production code (api #89). Always go through `findAvailableAiConnectors()`.
- **Executing a destructive action without a persisted `ApprovalRequest`** — the
  `ApprovalRequest` row must exist **before** execution (api #97); use
  `evaluateApproval()` to classify.
- **Rendering raw AI output as HTML** — no `dangerouslySetInnerHTML` with AI
  content (web #43). Use a safe markdown renderer / `ai-renderer` component.
- **Skipping redaction** — sending un-redacted context to a model or persisting a
  raw transcript. Call `redact()` first; never store secrets in memory (memory is
  tenant-scoped, secret-free).
- **Cross-tenant AI access** — investigating an alert without verifying tenant
  ownership (api #48); a memory/finding query without `tenantId` scope.
- **Missing `@RequirePermission` or `@Throttle`** on an AI endpoint — a missing
  permission decorator **fails open** in `PermissionsGuard`; AI endpoints need
  10/min throttling (api #25/#33).
- **Returning a loose object** instead of a typed contract — produce an
  `AiFinding`/`RiskScore`/`IocEnrichment` from `packages/ai/src/types.ts`, not a
  bare `string`/`Record` (`ai-output-rules.md`).
- **String literals for agent/provider/trigger modes** — use `AiAgentId`,
  `AiProviderMode`, `AiTriggerMode` enums (web #50/#51/#52). No `any`, no inline
  declarations.
- **Adding a feature without catalog/prompt registration** — a new AI surface must
  exist in `AiFeatureKey` + the feature catalog, with an active prompt in the
  registry, before it runs (web #49). Skipping the budget/quota check bypasses
  cost controls (api #98).
- **Forgetting `@auraspear/ai` is dependency-free** — never add an SDK or
  infrastructure import to `packages/ai`; SDK calls belong in
  `apps/api/.../connectors/services/`.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm typecheck          # blocking gate (tsc --noEmit across web + api + packages/ai)
pnpm build              # blocking gate (includes nest build for apps/api)
pnpm lint               # advisory — enforces the AI rules (no-any, enums, etc.)
pnpm format:check       # advisory
pnpm test               # unit tests, incl. ai memory/feature-catalog/prompt specs
pnpm test:e2e           # e2e (advisory)
pnpm validate           # typecheck + lint:strict + format:check
pnpm prisma:generate    # after AI schema edits (UserMemory, AiEvalSuite, etc.)
pnpm prisma:migrate     # create/apply a dev migration for AI tables
```

`packages/ai` has no SDK deps — `pnpm typecheck` is the primary gate for it
(`packages/ai/package.json`: `tsc --noEmit`; lint runs via consumers). The live
AI subsystem is covered by `apps/api` specs under
`apps/api/src/modules/ai/**/__tests__/` and the AI evaluation harness
(`runEval()` + the `eval/` module's persisted suites).

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
· gitleaks · CodeQL. **Advisory** (`lint`, `format:check`, `test`, `audit`) are
non-blocking today due to tracked debt — still run and annotate. See
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md).

> **Never claim a gate is green without running it.** Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
