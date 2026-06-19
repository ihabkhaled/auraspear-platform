# Rules — AI governance (provider cascade, attribution, prompts, cost, audit)

> **Read `../../AGENTS.md` first** (repo root) — loading order + the one rule:
> _no AI agent may edit first and understand later_; §7 "AI safety invariants"
> (provenance, never render raw AI output as HTML, destructive = approval-required,
> redact before model calls). Then read the source of truth for behavior:
> `../../docs/AI.md` (architecture + governance map), `../../apps/api/CLAUDE.md`
> rules **30, 88–100** (provider cascade, agent config, quotas, audit), and
> `../../apps/web/CLAUDE.md` rules **30, 42, 44** (provider attribution in the UI).
> Siblings: `./ai-safety.md` (approval/redaction depth — if absent, this file is
> the interim home), `../../rules/frontend/ai-ui-rules.md` (UI provenance/badges),
> `../security/secret-handling.md` (connector AES-256-GCM), and the recipe
> `../../skills/ai/add-ai-feature.md`.

These are **hard constraints** for any code that selects an AI provider, calls a
model, records usage, or persists an AI result — primarily `packages/ai/src/**`
(provider-agnostic contracts) and `apps/api/src/modules/ai/**` (live subsystem
that binds them to real SDKs). The web layer mirrors attribution via
`../frontend/ai-ui-rules.md`. Where this file and a `CLAUDE.md` overlap, the
**CLAUDE.md rule number is authoritative**.

The shared, dependency-free building blocks live in `@auraspear/ai`
(`packages/ai/src/index.ts` re-exports `model-router`, `prompts`, `types`,
`safety`, `redaction`, `evaluators`). The api binds them to SDK calls in
`apps/api/src/modules/ai/ai.service.ts`. Keep policy in the package; keep
infrastructure in the api.

---

## 1. Provider cascade — try ALL configured connectors, then rule-based

The platform is provider-agnostic. The cascade order is fixed and **must not be
short-circuited** (`apps/api/CLAUDE.md` #88, `docs/AI.md` "Providers & the
cascade"):

```
bedrock → llm_apis → openclaw_gateway → (rule-based fallback)
```

- The order and provider enum are defined once in
  `packages/ai/src/model-router.ts`: `AiProviderKind`
  (`BEDROCK`/`LLM_APIS`/`OPENCLAW_GATEWAY`/`RULE_BASED`) and
  `DEFAULT_PROVIDER_ORDER`. `routeProviders()` returns only providers that are
  **both `enabled` and `healthy`** (rule-based excluded), sorted by the cascade
  (or an explicit `priority` override); `selectProvider()` returns the single
  best. Mirror this enum in the api as `AiProvider` in
  `apps/api/src/modules/ai/ai.enums.ts` — do not invent a new literal set.
- In the api, `findAvailableAiConnectors(tenantId)` returns **ALL** configured AI
  connectors (not just the first), and `tryConnectorsInOrder()` iterates them
  sequentially (`ai.service.ts:842,906`). If Bedrock fails it tries LLM APIs,
  then OpenClaw Gateway. **Rule-based fallback only triggers when ALL connectors
  fail or none are configured** (`ai.service.ts:932` logs
  `"AI: all connectors failed, using rule-based fallback"`).
- **Never** short-circuit to rule-based after a single provider failure. **Never**
  hardcode one provider (`apps/web/CLAUDE.md` #30). **Never** add a
  `BEDROCK_MOCK` / env-var-gated mock mode in production code — call the real SDK
  and let the error fall through to the next connector (`apps/api/CLAUDE.md` #89).
- The rule-based branch is the **only** acceptable placeholder, and it MUST be
  labeled `model: 'rule-based'` in the response (`AiResponseModel.RULE_BASED` /
  `AiProviderKind.RULE_BASED`) so the UI shows the analyst a real model did not
  answer (`apps/web/CLAUDE.md` #30, `../frontend/ai-ui-rules.md §1`). No silent
  mock or canned text dressed up as a model response.
- Connector selection is **dynamic and tenant-scoped** — driven by which
  connectors are enabled/healthy for the tenant, never static enum iteration. The
  web dropdown fetches `/api/connectors/ai-available` (`apps/web/CLAUDE.md` #45).

## 2. Model/provider attribution — every result carries provenance

Every AI result is **attributable, confidence-scored, and source-cited**
(`docs/AI.md` "Output contracts"). The contract is `AiProvenance` in
`packages/ai/src/types.ts`:

```ts
interface AiProvenance {
  readonly provider: AiProviderKind // which connector answered
  readonly model: string // concrete model id
  readonly confidence?: number // 0..1, omit if not calibrated
  readonly promptVersion?: string // ties result → exact prompt (§3)
  readonly tokensIn?: number
  readonly tokensOut?: number
  readonly generatedAtIso: string
}
```

- **Every** AI result (`AiFinding`, `RiskScore`, `IocEnrichment`, chat, agent
  task) MUST attach provenance. `provider`/`model` come from the connector that
  actually answered the cascade, **not** the one the analyst selected — they can
  differ when a higher-priority connector fails over.
- **Do not fabricate `confidence`.** It is optional; omit it when the provider
  cannot express calibrated confidence (the UI then omits the badge,
  `../frontend/ai-ui-rules.md §1`). Use `isHighConfidence(p, threshold)` from
  `packages/ai/src/types.ts` for the ≥0.7 check — never re-implement the threshold.
- Provenance flows to the UI as provider attribution + confidence badge
  (`apps/web/CLAUDE.md` #42, #44) and to the audit log (§5). The api stamps
  `model`/`provider` on every persisted record and audit entry
  (`ai.service.ts:326,356,541–542,562`).

## 3. Prompt versioning — pin a version, record it in provenance

Prompts are **content + a version** so a finding can be traced to the exact
prompt that produced it, and evals can pin a version (`docs/AI.md`
"Prompt lifecycle"):

- The shared registry is `packages/ai/src/prompts.ts`: `PromptTemplate
{ key, version, description, template }`, rendered by `renderPrompt(prompt,
variables)` (interpolates `{{ var }}`, leaves unknown vars intact). Each entry
  in the `PROMPTS` catalog pins a `version` (date-stamped, e.g. `'2026-06-19'`).
- Keep **prompt TEXT in the registry**; bind tenant/runtime context only at call
  time via `renderPrompt()`. Never inline a multi-line prompt string literal in a
  service — it bypasses versioning and provenance, and violates the "no inline
  constants" layering rules (`apps/api/CLAUDE.md` #13/#17).
- When you **change a prompt's text, bump its `version`.** Then set
  `AiProvenance.promptVersion` to that value on the result so the audit trail
  points at the exact prompt. The tenant-facing/registry counterpart lives in
  `apps/api/src/modules/ai/prompt-registry/` (`PromptRegistry` has `version:
number` + `isActive: boolean`, `prompt-registry.types.ts`) — exactly one active
  version per key; activating a new version supersedes the prior one. Never
  mutate a published version's text in place.
- Evals pin a version so a regression test is reproducible (`runEval()` in
  `packages/ai/src/evaluators.ts`; §6).

## 4. Token & cost tracking (FinOps) — record usage on every model call

Token usage and estimated cost are surfaced per call and aggregated per tenant
(`docs/AI.md` governance checklist: "Token/cost surfaced"):

- `AiProvenance.tokensIn`/`tokensOut` carry per-result token counts. After each
  real model call the api MUST record usage via
  `UsageBudgetService.recordUsage({ tenantId, featureKey, provider, model,
inputTokens, outputTokens, estimatedCost, userId })`
  (`ai.service.ts:529–548`, `usage-budget/usage-budget.types.ts RecordUsageInput`).
  Token counts come from the provider response (`response.tokensUsed.input/
.output`), never invented.
- **Cost is derived, not stored as a guess.** `estimatedCost` is computed from
  `AI_COST_PER_1K_INPUT_TOKENS` / `AI_COST_PER_1K_OUTPUT_TOKENS`
  (`ai.service.ts:535–537`, `usage-budget.constants.ts`). Add new per-1k rates to
  the constants/cost-rate types (`usage-budget.types.ts` cost-rate section) — do
  **not** hardcode a price inline.
- **Check quota/budget before calling the provider.** Every agent execution must
  check token quota first (`apps/api/CLAUDE.md` #98) via
  `UsageBudgetService.checkBudget(tenantId, featureKey)`
  (`usage-budget.service.ts:83`); usage is rolled up per tenant/user/model/day
  with a `budgetUsedPct` and `projectedMonthEnd` (FinOps surface). Per-agent usage
  is also incremented (`agentConfigService.incrementUsage`, `ai.service.ts:548`).
- Recording usage is **mandatory and tenant-scoped** — `tenantId` is on every
  `recordUsage` and `checkBudget` call. The rule-based fallback records zero/no
  provider cost but still attributes `model: 'rule-based'`.

## 5. Audit logging — provider, model, tokens, latency, outcome

Mutations and AI calls are audit-logged with credentials redacted (`AGENTS.md`
§6, `apps/api/CLAUDE.md` "Key Principles" #6; `docs/AI.md` checklist):

- Every feature/agent call writes an AI audit entry with **`action`
  (`feature:<featureKey>`), `model`, `inputTokens`, `outputTokens`, `latencyMs`,
  `status` (`AiAuditStatus`), tenant/user, prompt, response**
  (`ai.service.ts:551–571`, `logFeatureAudit` / `recordUsageAndAudit:516`).
  Connector resolution and fallback are logged too (`ai.service.ts:932,952,967`).
- **Every trigger evaluation MUST be logged** — trigger type, result, `agentId`,
  `tenantId` (`apps/api/CLAUDE.md` #99). Both success and failure paths log
  (fallback warns with `provider`/`action`/`functionName`, `ai.service.ts:1598`).
- **Redact before persisting.** Run context through `redact()` from
  `packages/ai/src/redaction.ts` **before** a model call or transcript storage —
  it strips private keys, JWTs, AWS keys, bearer tokens, `secret=`/`password=`
  pairs, emails, IPv4 (investigative IOCs preserved via the `keep` list)
  (`docs/AI.md` "Redaction"). Audit details additionally pass the sensitive-key
  redaction set (`apps/api/CLAUDE.md` #66, `../security/secret-handling.md §6`).
  AI memory is tenant-scoped and **must not store secrets** (`AGENTS.md` §7).
- Connector credentials are **AES-256-GCM encrypted at rest and never sent to a
  model** (`docs/AI.md`, `../security/secret-handling.md §5`,
  `apps/api/CLAUDE.md` #96 for OSINT keys). No secret in a prompt, response,
  transcript, log, or audit detail.

## 6. Approval & safety gate — AI may suggest, not silently execute

AI must not silently execute destructive actions (`AGENTS.md` §7,
`apps/api/CLAUDE.md` #97, depth in `./ai-safety.md`):

- Every action is classified by `AiActionCategory`
  (`packages/ai/src/safety.ts`): `ANALYSIS_ONLY`, `SUGGESTED`,
  `APPROVAL_REQUIRED`, `AUTO_ALLOWED`. Use `evaluateApproval(action)` — it is
  conservative: **anything `destructive` or high/critical `RiskLevel` requires
  approval**, and `AUTO_ALLOWED` only bypasses approval for non-destructive,
  low/medium-risk, allow-listed actions. Never re-implement this policy.
- An `approval-required` action MUST create a **persisted `ApprovalRequest`
  before execution** (`apps/api/CLAUDE.md` #97); the execute/apply control stays
  disabled until `APPROVED` (`apps/web/CLAUDE.md` #59,
  `../frontend/ai-ui-rules.md §4`). The frontend never fabricates approval.
- Agent/provider/trigger config is enum-validated, not free strings: agent ids
  vs `AiAgentId` (#92), provider mode vs `AiProviderMode`
  (`direct_api`/`bedrock`/`openclaw`/`inherit`, #93), trigger config by a
  mode-specific Zod schema (#94). Custom OSINT source URLs pass SSRF validation
  (#95) and their API keys are encrypted (#96).
- AI investigation is **tenant-scoped end to end** — validate alert/resource
  tenant ownership before investigating (`apps/api/CLAUDE.md` #48); every
  tenant-owned query/`update`/`delete` carries `tenantId` (`AGENTS.md` §6).

## 7. Evaluation gate (roadmap-aware) — golden cases, safety assertions

- `runEval(cases, produce)` (`packages/ai/src/evaluators.ts`) runs golden cases
  through a real or mocked producer and scores assertions. A failing assertion
  marked `safety: true` **fails the whole run regardless of pass rate**
  (`safetyPassed`). Provider calls are injected so evals run offline in CI.
- Use evals for hallucination, schema-shape, and safety regressions, pinning a
  prompt `version` (§3) for reproducibility. The harness exists today; wiring a
  golden-dataset gate into CI is **roadmap** (`docs/AI.md` checklist + roadmap) —
  do not claim it gates merges until it does.

## 8. Tenant opt-in / opt-out (roadmap) — design for it now

A **per-tenant AI opt-in/out toggle** and a per-tenant model/provider router UI
are on the roadmap (`docs/AI.md` checklist `[ ]` + "Roadmap"). Until shipped:

- Treat AI enablement as **tenant-scoped and fail-closed**: resolve connectors
  per `tenantId` (§1), and never bypass an enablement/HTTPS/security check based
  on `NODE_ENV` (`apps/api/CLAUDE.md` #56). When the toggle lands it gates the
  cascade entry point — design new AI features to read a tenant AI-enabled flag,
  not a global one.
- New AI surfaces register in the feature catalog first
  (`apps/api/src/modules/ai/feature-catalog/`, `AiFeatureKey`;
  `apps/web/CLAUDE.md` #49) so per-tenant/per-feature config (and future opt-in)
  has a home. Keep `featureKey` flowing through `recordUsage`/audit (§4–5) so
  opt-out and FinOps can be enforced per feature.

---

### Quick gate

Before you commit AI-governance-touching code, confirm: (1) provider selection
uses the `model-router` cascade / `findAvailableAiConnectors` +
`tryConnectorsInOrder` — **all** connectors tried, rule-based only when all fail,
labeled `model: 'rule-based'`, no hardcoded provider, no mock mode; (2) the result
carries `AiProvenance` (real `provider`/`model`, optional un-fabricated
`confidence`, `promptVersion`, `tokensIn/Out`); (3) prompts come from the versioned
registry (`renderPrompt`), version bumped on text change; (4) `recordUsage` runs
after every model call and `checkBudget` runs before it, costs from constants not
literals; (5) an AI audit entry (action/model/tokens/latency/status) is written and
`redact()` ran before the model call/transcript; (6) destructive/high-risk actions
go through `evaluateApproval` + a persisted `ApprovalRequest`; (7) everything is
`tenantId`-scoped. No `any`, no `eslint-disable`. Run `pnpm typecheck` (blocking;
`tsgo`/`typecheck:fast` advisory) and `pnpm lint` — don't claim green until both
pass (`../global/validation-gates.md`). pnpm only, Node 22. **Branch first — never
work on `main`.** Prove before deleting any file/dep/env var (`AGENTS.md` §8).

## Related

- `../../AGENTS.md` — §7 AI safety invariants, §6 tenancy/secrets, §8 branch safety.
- `../../docs/AI.md` — provider cascade, output contracts, prompt lifecycle,
  redaction, evaluation, governance checklist + roadmap (behavior source-of-truth
  is the code).
- `../../apps/api/CLAUDE.md` — #30 (no placeholder AI), #88 (cascade tries all),
  #89 (no mock mode), #92–100 (agent/provider/trigger validation, approval, quota,
  trigger logging), #48 (tenant-scoped investigation), #66 (audit redaction).
- `../../apps/web/CLAUDE.md` — #30 (no hardcoded provider, label rule-based),
  #42/#44 (provider attribution + action category in UI), #45 (dynamic connector
  list), #49 (feature catalog), #59 (approval badge).
- `packages/ai/src/` — `model-router.ts` (cascade), `prompts.ts` (versioning),
  `types.ts` (`AiProvenance`), `safety.ts` (approval), `redaction.ts`,
  `evaluators.ts`.
- `apps/api/src/modules/ai/` — `ai.service.ts` (cascade + usage/audit),
  `usage-budget/` (FinOps), `prompt-registry/` (versioned prompts),
  `feature-catalog/` (per-feature config), `orchestrator/` (agent dispatch).
- `../frontend/ai-ui-rules.md` — UI provenance/badges; `../security/secret-handling.md`
  — connector AES-256-GCM, redaction; `../../skills/ai/add-ai-feature.md` — recipe.
