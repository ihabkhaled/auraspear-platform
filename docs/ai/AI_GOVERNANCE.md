# AI Governance — AuraSpear

> **Entry point: [`AGENTS.md`](../../AGENTS.md)** (repo root). Read it first — it
> defines the AI loading order and "the one rule" (_no AI agent may edit first and
> understand later_), and §7 states the AI safety invariants this document
> operationalizes. This file is a **reference map of where governance is enforced
> in code**, not the source of truth — the code is. Where this doc and a rule/code
> file disagree, the code wins.

This document covers the operational governance of the AuraSpear AI subsystem:
**attribution**, **prompt versioning**, **token/cost (FinOps)**, **audit**,
the **tenant opt-in roadmap**, and the **redaction policy**. It does not restate
architecture or the hard rules — those live in the siblings below.

## Where governance lives (don't duplicate — link)

| Concern                                    | Source of truth                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI architecture, surfaces, cascade         | [`docs/AI.md`](../AI.md)                                                                                                                                                                                                                                                                                                                       |
| Hard rules for governance code             | [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md)                                                                                                                                                                                                                                                                                 |
| Approval / safety depth                    | [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md)                                                                                                                                                                                                                                                                         |
| Output contracts & rendering               | [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md)                                                                                                                                                                                                                                                                             |
| Memory policy (`UserMemory`)               | [`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md)                                                                                                                                                                                                                                                                             |
| Agent config rules                         | [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md)                                                                                                                                                                                                                                                                               |
| Stable AI truths (quick reference)         | [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md)                                                                                                                                                                                                                                                                                             |
| Connector encryption / secret handling     | [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md), [`docs/SECURITY.md`](../SECURITY.md)                                                                                                                                                                                                                           |
| Recipes (build an AI feature/prompt/agent) | [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md), [`skills/ai/add-ai-prompt.md`](../../skills/ai/add-ai-prompt.md), [`skills/ai/add-ai-agent.md`](../../skills/ai/add-ai-agent.md), [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md), [`skills/ai/add-ai-memory.md`](../../skills/ai/add-ai-memory.md) |
| Backend AI rules (numbered)                | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #30, #48, #66, #88–100                                                                                                                                                                                                                                                                        |
| Frontend AI rules (numbered)               | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #30, #42, #44, #45, #49, #59                                                                                                                                                                                                                                                                  |

**Two-layer model.** Provider-agnostic _policy_ lives in the `@auraspear/ai`
package (`packages/ai/src/`); the _infrastructure_ that binds it to real provider
SDKs, the database, the audit log, and FinOps lives in the api
(`apps/api/src/modules/ai/`). Keep policy in the package, infrastructure in the
api — see [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) for the
binding rules.

---

## 1. Attribution (provenance)

Every AI result is **attributable, confidence-scored, and source-cited**. The
contract is `AiProvenance` in
[`packages/ai/src/types.ts`](../../packages/ai/src/types.ts):

```ts
interface AiProvenance {
  readonly provider: AiProviderKind // which connector actually answered
  readonly model: string // concrete model id
  readonly confidence?: number // 0..1, OMITTED if not calibrated
  readonly promptVersion?: string // ties result → exact prompt (§2)
  readonly tokensIn?: number
  readonly tokensOut?: number
  readonly generatedAtIso: string
}
```

Governance rules (enforced — see `rules/ai/ai-governance.md §2`):

- **Every** result type (`AiFinding`, `RiskScore`, `IocEnrichment`, chat, agent
  task) carries provenance, plus `AiCitation[]` where it makes a claim about a
  source.
- `provider`/`model` are **the connector that actually answered the cascade**,
  not the one the analyst picked — they differ on failover. In the api this is
  the `response.provider` / `response.model` stamped during
  `recordUsageAndAudit()` (`apps/api/src/modules/ai/ai.service.ts:516`).
- **Never fabricate `confidence`.** It is optional; omit it when the provider
  cannot express calibrated confidence (the UI then drops the badge). Use
  `isHighConfidence(p, threshold)` (default `0.7`) from `types.ts` for the
  high-confidence check — never re-derive the threshold.
- The cascade itself is `bedrock → llm_apis → openclaw_gateway → rule-based`,
  enforced by `tryConnectorsInOrder()` /
  `findAvailableAiConnectors()` (`ai.service.ts:842,906`). The rule-based branch
  is the **only** placeholder and MUST be labeled `model: 'rule-based'`
  (`AiProvider.RULE_BASED` / `AiResponseModel.RULE_BASED` in `ai.enums.ts`). See
  [`docs/AI.md`](../AI.md) "Providers & the cascade".
- The UI mirrors provenance as a provider-attribution + confidence badge on every
  AI surface (`apps/web/CLAUDE.md` #42, #44).

## 2. Prompt versioning

A finding must be traceable to the **exact prompt text** that produced it, and an
eval must be able to pin a prompt version. There are two layers:

**Package layer — the shared registry**
[`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts):

- `PromptTemplate { key, version, description, template }`, rendered by
  `renderPrompt(prompt, variables)` (interpolates `{{ var }}`, leaves unknown
  vars intact). Each entry in the `PROMPTS` catalog pins a date-stamped `version`
  (e.g. `'2026-06-19'`).
- **Keep prompt TEXT in the registry**; bind tenant/runtime context only at call
  time via `renderPrompt()`. Never inline a multi-line prompt literal in a service
  — it bypasses versioning and provenance and breaks the "no inline constants"
  layering rules (`apps/api/CLAUDE.md` #13, #17).
- **When you change a prompt's text, bump its `version`** and set
  `AiProvenance.promptVersion` to that value on the result.

**API layer — the per-tenant prompt registry**
(`apps/api/src/modules/ai/prompt-registry/`):

- `AiPromptTemplate` carries `taskType` (an `AiFeatureKey`), an integer `version`,
  `isActive`, plus reviewer metadata (`createdBy`, `reviewedBy`, `reviewedAt`).
  See `prompt-registry.types.ts`.
- **Exactly one active version per `taskType`.** `create()` auto-increments to
  `maxVersion + 1`; `activate(id)` calls `deactivateAllByTaskType()` then
  activates the chosen one (`prompt-registry.service.ts:54,131`). Activation
  supersedes the prior version — **never mutate a published version's text in
  place**; create a new version.
- `getActivePrompt(tenantId, taskType)` returns the tenant's active content, or
  falls back to a built-in default. Create/update/activate/delete are all
  **audit-logged** via `AppLoggerService` with `feature: AppLogFeature.AI_PROMPTS`.

## 3. Token & cost (FinOps)

Token usage and **derived** cost are recorded on every real model call and rolled
up per tenant. Implementation: `apps/api/src/modules/ai/usage-budget/`.

- **Record after every model call.** `recordUsageAndAudit()` →
  `recordTokenUsage()` calls
  `UsageBudgetService.recordUsage({ tenantId, featureKey, provider, model,
inputTokens, outputTokens, estimatedCost, userId })`
  (`ai.service.ts:529–548`; `RecordUsageInput` in `usage-budget.types.ts`). Token
  counts come from the provider response (`response.tokensUsed.input/.output`),
  never invented.
- **Cost is derived, not guessed.** `estimatedCost` is computed from
  `AI_COST_PER_1K_INPUT_TOKENS` / `AI_COST_PER_1K_OUTPUT_TOKENS`
  (`ai.service.ts:535–537`). Per-tenant/model overrides exist as cost-rate records
  (`CostRateInput` / `CostRateRecord` in `usage-budget.types.ts`,
  `inputCostPer1k` / `outputCostPer1k`). **Never hardcode a price inline** — add a
  rate to the constants/cost-rate types.
- **Check budget before calling the provider.** Agent execution calls
  `UsageBudgetService.checkBudget(tenantId, featureKey)` first
  (`ai.service.ts:452`; `BudgetCheckResult { allowed, used, budget }`); per-agent
  usage is also incremented (`agentConfigService.incrementUsage`,
  `ai.service.ts:548`). This realizes `apps/api/CLAUDE.md` #98 (check quota first).
- **FinOps surface.** `FinopsDashboardResponse` aggregates `byFeature`, `byUser`,
  `byModel`, and `dailyTrend`, plus `budgetTotal`, `budgetUsedPct`, and
  `projectedMonthEnd` (`usage-budget.types.ts`). Budget alerts
  (`BudgetAlertRecord`: `monthlyBudget`, `alertThresholds`, `lastAlertPct`) drive
  threshold notifications. Everything is **tenant-scoped** — `tenantId` is on
  every `recordUsage`/`checkBudget` call.
- The rule-based fallback records zero provider cost but still attributes
  `model: 'rule-based'` and writes audit/usage.

## 4. Audit

Every AI feature/agent call writes an audit entry with credentials redacted
(`AGENTS.md` §6; `apps/api/CLAUDE.md` Key Principles #6).

- **AI audit entry** (`logFeatureAudit()`, `ai.service.ts:551`): `action`
  (`feature:<featureKey>`), `model`, `inputTokens`, `outputTokens`, `latencyMs`,
  `status` (`AiAuditStatus`), `tenantId`, `userId`, `prompt`, `response`,
  `createdAt`.
- **Structured app log** (`AppLoggerService`, `feature: AppLogFeature.AI`):
  `featureKey`, `agentId`, `agentName`, `model`, `latencyMs`, actor identity,
  outcome (`ai.service.ts:573`). Prompt-registry and feature-catalog mutations log
  under `AppLogFeature.AI_PROMPTS` / their own features.
- **Cascade & fallback are logged.** Connector resolution failures and the
  all-connectors-failed fallback warn with `provider`/`action`/`functionName`
  (`ai.service.ts:886,932`).
- **Trigger evaluations MUST be logged** — trigger type, result, `agentId`,
  `tenantId` (`apps/api/CLAUDE.md` #99).
- **Redact before persisting** any prompt/response/transcript — see §6. Audit
  details additionally pass the platform's sensitive-key sanitization set
  (`apps/api/CLAUDE.md` #66): `password`, `apiKey`, `token`, `secret`,
  `bearerToken`, `accessKey`, `clientSecret`, `refreshToken`, `accessToken`,
  `encryptedConfig`, `authorization`.

## 5. Tenant opt-in (roadmap)

A first-class **per-tenant AI opt-in/out toggle** and a per-tenant model/provider
router UI are on the roadmap — tracked as unchecked in the
[`docs/AI.md`](../AI.md) governance checklist (`[ ] Per-tenant AI opt-in/out
toggle`) and in [`docs/ROADMAP.md`](../ROADMAP.md). **This is not shipped today.**
Do not claim a tenant opt-in switch exists.

What exists today, and how to build _for_ the toggle so it lands cleanly:

- **AI is already tenant-scoped and fails closed.** Connectors resolve per
  `tenantId` via `findAvailableAiConnectors(tenantId)`; nothing is global. Never
  bypass an AI enablement / HTTPS / security check based on `NODE_ENV`
  (`apps/api/CLAUDE.md` #56).
- **The per-feature catalog is the seam.** `apps/api/src/modules/ai/feature-catalog/`
  already resolves, per tenant + `AiFeatureKey`, an `enabled` flag plus
  `preferredProvider`, `maxTokens`, `approvalLevel`, and `monthlyTokenBudget`
  (`AiFeatureConfigResponse` / `ResolvedFeatureConfig` in
  `feature-catalog.types.ts`), filling in `DEFAULT_FEATURE_CONFIG` where a tenant
  hasn't overridden. The tenant-level opt-in toggle, when it ships, gates the
  cascade entry point above this catalog.
- **Register new surfaces in the feature catalog first** (`AiFeatureKey`;
  `apps/api/CLAUDE.md` / `apps/web/CLAUDE.md` #49) and keep `featureKey` flowing
  through `recordUsage` (§3) and audit (§4). That keeps a future opt-out (and
  per-feature FinOps) enforceable per feature.
- **Design new AI features to read a tenant AI-enabled flag, not a global one.**

## 6. Redaction policy

Strip secrets and PII **before** context is sent to a model **and before** it is
persisted in a transcript or audit detail, so credentials never leave the tenant
boundary or land in logs. Implementation:
[`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts).

- `redact(input, keep?)` returns `{ text, counts, redactedAny }`. It is
  pattern-based (no network), conservative, and side-effect free. `RedactionKind`
  covers: `PRIVATE_KEY`, `JWT`, `AWS_ACCESS_KEY` (`AKIA`/`ASIA`), `BEARER`,
  `GENERIC_SECRET` (`secret=`/`password=`/`api_key=`/`token=` pairs), `EMAIL`, and
  `IPV4`. Rules run **most-specific first**.
- **Preserve investigative IOCs** with the `keep` list. When the IP/email is the
  very thing under investigation, pass e.g. `keep: [RedactionKind.IPV4]` so it is
  not masked — that is the only sanctioned way to retain it.
- **Connector credentials are never sent to a model.** They are AES-256-GCM
  encrypted at rest and decrypted only for the outbound connector call — see
  [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md)
  and [`docs/SECURITY.md`](../SECURITY.md). Custom OSINT source API keys are
  likewise encrypted (`apps/api/CLAUDE.md` #96) and their URLs SSRF-validated
  (#95).
- **AI memory must never store secrets.** `UserMemory` is tenant-scoped; redact
  before extraction/storage — see
  [`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) and
  [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md).
- **Never render raw AI output as HTML** (markdown-safe or plain text only;
  `AGENTS.md` §7) — a separate but related leakage/XSS control documented in
  [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md).

---

## Approval gate (cross-cutting)

Governance overlaps with safety: AI may **suggest**, not silently execute.
`evaluateApproval(action)` in
[`packages/ai/src/safety.ts`](../../packages/ai/src/safety.ts) is conservative —
**anything `destructive` or high/critical `RiskLevel` requires approval**, and
`AUTO_ALLOWED` only bypasses approval for non-destructive, low/medium-risk,
allow-listed actions. An `approval-required` action MUST create a persisted
`ApprovalRequest` before execution (`apps/api/CLAUDE.md` #97). Full depth:
[`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md).

## Governance checklist (mirrors `docs/AI.md`)

- [x] Provider/model recorded in audit log + result provenance (§1, §4).
- [x] Token/cost surfaced — FinOps; `tokensIn`/`tokensOut` in provenance (§3).
- [x] Prompt versioning — shared registry + per-tenant active versions (§2).
- [x] PII/secret redaction before model calls and transcript storage (§6).
- [x] Approval policy for side-effecting actions; persisted approval records.
- [x] Tenant-scoped — investigation validates alert/resource tenant ownership.
- [ ] Per-tenant AI opt-in/out toggle (**roadmap** — §5).
- [ ] Golden-dataset eval gate wired into CI (**roadmap** — harness exists in
      `packages/ai/src/evaluators.ts`).

## Quick gate (before committing governance-touching code)

1. Result carries `AiProvenance` (real `provider`/`model`, un-fabricated
   `confidence`, `promptVersion`, token counts).
2. Prompts come from the versioned registry (`renderPrompt` / per-tenant
   `getActivePrompt`); version bumped on text change.
3. `checkBudget` runs **before** the model call, `recordUsage` **after**; cost
   from constants/cost-rates, not literals.
4. An AI audit entry (action/model/tokens/latency/status) is written, and
   `redact()` ran before the model call and before persisting any transcript.
5. Destructive/high-risk actions go through `evaluateApproval` + a persisted
   `ApprovalRequest`.
6. Everything is `tenantId`-scoped. No `any`, no `eslint-disable`.

Run `pnpm typecheck` (blocking) and `pnpm lint` before claiming green — see
[`AGENTS.md`](../../AGENTS.md) §5 and
[`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) "Quick gate".
Branch first; never work on `main`.
