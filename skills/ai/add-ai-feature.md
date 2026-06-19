# Skill — Add an AI feature (backend, `apps/api` AI subsystem + `packages/ai`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (repo root): the loading order
> (§1), the security invariants (§6 — tenant isolation, RBAC, no auth/secret
> bypass), and especially **§7 AI safety** (provenance + citations, never render
> raw AI HTML, redact before model calls, destructive = approval-required). Then
> read the hard rules that govern this task:
> [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md),
> [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) (the
> approval gate — authoritative),
> [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) (provenance +
> citations + no-raw-HTML),
> [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md), and
> [`rules/security/`](../../rules/security/). Then read **`apps/api/CLAUDE.md`** —
> the AI-specific ABSOLUTE RULES: **#25** (`@RequirePermission` on every
> endpoint), **#33/#80** (AI endpoints throttled `10/min`), **#48** (validate
> alert/resource tenant ownership before investigating), **#88** (cascade tries
> **all** connectors), **#89** (no mock/env-gated provider mode), **#92–#100**
> (agent/approval rules), and **#12/#13/#17** (enums + home files, no string
> literals). Sibling onboarding dirs: [`rules/`](../../rules/),
> [`skills/`](../) (you are here), [`memory/`](../../memory/)
> (`AI_MEMORY.md`, `SECURITY_MEMORY.md`), [`context/`](../../context/),
> [`docs/`](../../docs/) (`docs/AI.md`, [`docs/ai/`](../../docs/ai/)). Stable
> truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md). Companion recipes:
> [`skills/backend/add-endpoint.md`](../backend/add-endpoint.md),
> [`skills/backend/add-permission.md`](../backend/add-permission.md),
> [`skills/backend/add-connector.md`](../backend/add-connector.md) (for a new AI
> **provider**), and the **frontend** half
> [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md).
>
> **No AI agent may edit first and understand later.** An AI feature touches the
> catalog, the prompt registry, the provider cascade, the approval gate, and the
> audit trail. Inspect the existing **alert triage** feature end-to-end
> (`AiFeatureKey.ALERT_SUMMARIZE` → controller → service →
> `AiService.executeAiTask`), copy that shape, then adapt.

An "AI feature" is a single AI-assisted capability identified by an `AiFeatureKey`
(e.g. `case.next_tasks`, `cloud.finding_triage`). Every feature: is **registered
in the `AiFeatureKey` catalog**, runs through the **generic
`AiService.executeAiTask()`** entry point so it inherits the **provider cascade**
(bedrock → llm_apis → openclaw_gateway → rule-based fallback), carries
**provenance** (provider/model/confidence/tokens) and **citations**, has its
**inputs redacted** of secrets/PII before the model call, declares an **action
category** (`AiActionCategory`) and an **approval level** (`AiApprovalLevel`), and
— if it can mutate security/infra state — is gated by a **persisted
`ApprovalRequest`** before execution. The provider-agnostic policy and contracts
live in [`packages/ai/`](../../packages/ai/); the live subsystem that binds them is
[`apps/api/src/modules/ai/`](../../apps/api/src/modules/ai/).

The 29 existing keys are in
[`apps/api/src/common/enums/ai-feature.enum.ts`](../../apps/api/src/common/enums/ai-feature.enum.ts)
(`ALERT_SUMMARIZE` … `ATTACK_PATH_SUMMARIZE`).

---

## When to use

Use this skill when you need to **add a new AI-assisted capability** that calls a
language model (or a deterministic rule-based fallback) on the backend — a new
summarize / explain / score / draft / triage / interpret feature for a SOC
module (alerts, cases, hunts, intel, detection, reports, dashboards, soar,
knowledge, entities, vulnerabilities, cloud, ueba, attack-paths, …).

**Do not** use this skill for:

- A **non-AI** HTTP endpoint → [`skills/backend/add-endpoint.md`](../backend/add-endpoint.md).
- A new **AI provider/connector** that participates in the cascade (a new SDK like
  a second gateway) → [`skills/backend/add-connector.md`](../backend/add-connector.md)
  **and** wire it into `AI_CONNECTOR_PRIORITY` / `findAvailableAiConnectors()`
  (`apps/api/CLAUDE.md` #88, #89). The feature you add here consumes the cascade;
  it does not define a provider.
- The **UI panel** that displays the feature → [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md)
  (it is the last layer; build this backend feature first — the panel is a
  prerequisite-checker for the `AiFeatureKey` + endpoint + `@RequirePermission`).
- A new **agent** definition or trigger mode → [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md)
  and the `agent-config` module (you usually **reuse** an existing agent via
  `FEATURE_TO_AGENT_MAP`, not add one).

---

## Files to inspect first (copy the alert-triage feature end-to-end)

| Concern                                      | File / symbol                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature key catalog (register here)          | [`apps/api/src/common/enums/ai-feature.enum.ts`](../../apps/api/src/common/enums/ai-feature.enum.ts) (`AiFeatureKey`, `AiApprovalLevel`, `AiActionCategory`)                                                                                                                                                                                                                                                                                                                                         |
| Catalog service + default config             | [`apps/api/src/modules/ai/feature-catalog/feature-catalog.service.ts`](../../apps/api/src/modules/ai/feature-catalog/feature-catalog.service.ts), [`feature-catalog.constants.ts`](../../apps/api/src/modules/ai/feature-catalog/feature-catalog.constants.ts) (`DEFAULT_FEATURE_CONFIG`)                                                                                                                                                                                                            |
| Generic execution entry point (the cascade)  | [`apps/api/src/modules/ai/ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts) — `executeAiTask()`, `findAvailableAiConnectors()`, `tryConnectorsInOrder()`, `routeGenericTask()`, `buildFallbackGenericResponse`                                                                                                                                                                                                                                                                            |
| Feature → agent map (reuse an agent)         | [`apps/api/src/modules/agent-config/agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts) (`FEATURE_TO_AGENT_MAP`, `AI_AGENT_DEFAULTS`)                                                                                                                                                                                                                                                                                                                     |
| Default prompts (per feature key)            | [`apps/api/src/modules/ai/prompt-registry/prompt-registry.constants.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.constants.ts) (`DEFAULT_PROMPTS`), [`prompt-registry.service.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.service.ts) (`getActivePrompt`)                                                                                                                                                                                               |
| The reference feature (controller + service) | [`apps/api/src/modules/alerts/ai-alert-triage.controller.ts`](../../apps/api/src/modules/alerts/ai-alert-triage.controller.ts), [`ai-alert-triage.service.ts`](../../apps/api/src/modules/alerts/ai-alert-triage.service.ts)                                                                                                                                                                                                                                                                         |
| Provider-agnostic contracts (the package)    | [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts) (`AiProvenance`, `AiCitation`, `AiFinding`, `isHighConfidence`), [`model-router.ts`](../../packages/ai/src/model-router.ts) (`AiProviderKind`, `routeProviders`), [`safety.ts`](../../packages/ai/src/safety.ts) (`AiActionCategory`, `RiskLevel`, `evaluateApproval`), [`redaction.ts`](../../packages/ai/src/redaction.ts) (`redact`), [`prompts.ts`](../../packages/ai/src/prompts.ts), [`index.ts`](../../packages/ai/src/index.ts) |
| AI response shape                            | [`apps/api/src/modules/ai/ai.types.ts`](../../apps/api/src/modules/ai/ai.types.ts) (`AiResponse`, `ExecuteAiTaskInput`, `ResolvedAiConnector`)                                                                                                                                                                                                                                                                                                                                                       |
| Approval gate (live binding)                 | [`apps/api/src/modules/ai/orchestrator/orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts) (`requiresApproval`, `createApprovalRecord`), [`orchestrator.constants.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts)                                                                                                                                                                                                               |
| Findings = proposals, not actions            | [`apps/api/src/modules/ai/writeback/ai-writeback.service.ts`](../../apps/api/src/modules/ai/writeback/ai-writeback.service.ts)                                                                                                                                                                                                                                                                                                                                                                       |
| Permission enum + decorator                  | [`apps/api/src/common/enums/permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts) (`AI_*`, e.g. `AI_ALERT_TRIAGE`), [`common/decorators/permission.decorator.ts`](../../apps/api/src/common/decorators/permission.decorator.ts)                                                                                                                                                                                                                                                   |
| AI module DI (exports `AiService`)           | [`apps/api/src/modules/ai/ai.module.ts`](../../apps/api/src/modules/ai/ai.module.ts)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| i18n error keys                              | [`apps/api/src/i18n/en.json`](../../apps/api/src/i18n/en.json) + `ar/es/fr/de/it.json`                                                                                                                                                                                                                                                                                                                                                                                                               |

> **The cascade is already built.** `executeAiTask()` resolves the feature config,
> the agent config, builds the prompt, then calls `tryConnectorsInOrder()` over the
> result of `findAvailableAiConnectors()` — which returns **all** configured
> connectors in `AI_CONNECTOR_PRIORITY` order plus dynamic LLM connectors, and only
> falls back to `buildFallbackGenericResponse(...)` (`model: 'rule-based'`) when
> **every** connector fails or none exist (`apps/api/CLAUDE.md` #88). You inherit
> all of this by routing through `executeAiTask()` — **do not** call a provider SDK
> directly, and **never** add a `BEDROCK_MOCK`/env-gated mock (#89).

---

## Exact step-by-step implementation

> Throughout, `<feature>` is your dotted key (e.g. `case.next_tasks`),
> `<FEATURE>` the enum member (`CASE_NEXT_TASKS`), `<module>` the owning SOC module
> (e.g. `cases`). Keep the dotted string **identical** everywhere it appears —
> a mismatch silently disables the feature or sends it through the wrong agent.

### Step 0 — Branch first

`AGENTS.md §8`: never work on `main`/`master`.
`git checkout -b feat/ai-<feature>`.

### Step 1 — Register the key in the `AiFeatureKey` catalog (rule #12/#13/#17, #49)

Add the member to `AiFeatureKey` in
[`apps/api/src/common/enums/ai-feature.enum.ts`](../../apps/api/src/common/enums/ai-feature.enum.ts).
The **value is the dotted key**; keep entries grouped by module:

```ts
export enum AiFeatureKey {
  // ...existing...
  CASE_NEXT_TASKS = 'case.next_tasks',
}
```

There is no separate "register in the catalog table" call — `FeatureCatalogService`
**enumerates `Object.values(AiFeatureKey)`** and fills any key without a
tenant-specific row from `DEFAULT_FEATURE_CONFIG` (`feature-catalog.service.ts`
`list()` / `getConfig()`). So **adding the enum member is the registration**: the
feature becomes enabled-by-default (`DEFAULT_FEATURE_CONFIG.enabled = true`,
`maxTokens = 2048`, `approvalLevel = NONE`) and tenant-configurable via the
existing `PATCH /ai/features/:featureKey` endpoint. `validateFeatureKey()` will now
accept the new dotted string.

> If you also expose the key to the web app, **mirror** the member into
> `apps/web/src/enums/ai-config.enum.ts` in the same order (`apps/web/CLAUDE.md`
> #49) — that is part of [`add-ai-panel.md`](../frontend/add-ai-panel.md).

### Step 2 — Map the feature to a responsible agent (`FEATURE_TO_AGENT_MAP`)

In [`agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts),
add an entry to **`FEATURE_TO_AGENT_MAP`** pointing the new key at an existing core
agent (`AiAgentId.L1_ANALYST`, `L2_ANALYST`, `THREAT_HUNTER`, `RULES_ANALYST`,
`DASHBOARD_BUILDER`, `NORM_VERIFIER`, or `ORCHESTRATOR`):

```ts
export const FEATURE_TO_AGENT_MAP: Record<AiFeatureKey, AiAgentId> = {
  // ...existing...
  [AiFeatureKey.CASE_NEXT_TASKS]: AiAgentId.L2_ANALYST,
}
```

`FEATURE_TO_AGENT_MAP` is typed `Record<AiFeatureKey, AiAgentId>`, so **omitting
your key is a TypeScript error** — the compiler forces this. The agent supplies
`temperature`, `maxTokensPerCall`, `systemPrompt`, `outputFormat`, quota, and OSINT
sources at execution time (`executeAiTask` reads `agentConfig`). Pick the agent
whose `AI_AGENT_DEFAULTS` profile matches the work (e.g. triage → `L1_ANALYST`,
deep case/intel → `L2_ANALYST`, hunting → `THREAT_HUNTER`).

### Step 3 — Add the default prompt (`DEFAULT_PROMPTS`)

In [`prompt-registry.constants.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.constants.ts),
add a `DEFAULT_PROMPTS[AiFeatureKey.<FEATURE>]` entry. Use `{{var}}` placeholders
that match the **keys you put in `context`** (Step 4) — `assembleFinalPrompt`
interpolates them (mirror `renderPrompt` in [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts)).
Most features use `{{context}}`:

```ts
[AiFeatureKey.CASE_NEXT_TASKS]:
  'You are a SOC analyst AI assistant. Based on the current case status, suggest the next investigation tasks and response actions. Cite the case fields you relied on.\n\nCase context:\n{{context}}',
```

`getActivePrompt(tenantId, taskType)` returns the tenant override if present, else
this default, else a generic fallback — so a missing entry still runs but with a
weak prompt. Always add the entry. **Instruct the model to cite its evidence**
(see Security checks → citations).

### Step 4 — Add the feature service in the owning module (route through `executeAiTask`)

Create (or extend) the AI service for the SOC module, e.g.
`apps/api/src/modules/<module>/ai-<module>-<thing>.service.ts`, copying
[`ai-alert-triage.service.ts`](../../apps/api/src/modules/alerts/ai-alert-triage.service.ts).
It is a thin orchestrator (rules #14a): load + **tenant-validate** the subject via
the module's repository, build a redacted `context`, then call **one**
`AiService.executeAiTask(...)` and return its `AiResponse`.

```ts
@Injectable()
export class AiCaseCopilotService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly casesRepository: CasesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CASES, 'AiCaseCopilotService')
  }

  async nextTasks(caseId: string, tenantId: string, user: JwtPayload): Promise<AiResponse> {
    // #48: validate the subject belongs to THIS tenant before any AI call.
    const record = await this.casesRepository.findFirstByIdAndTenant(caseId, tenantId)
    if (!record) {
      throw new BusinessException(404, 'Case not found', 'errors.cases.notFound')
    }

    return this.aiService.executeAiTask({
      tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.CASE_NEXT_TASKS,
      context: this.buildContext(record), // redacted, bounded (see Security checks)
    })
  }

  private buildContext(record: /* repo row */): Record<string, unknown> {
    return {
      context: redact(JSON.stringify({ /* only needed fields */ }).slice(0, 3000)).text,
    }
  }
}
```

Key points:

- **Always pass `tenantId`, `userId`, `userEmail`, `featureKey`, `context`** in
  `ExecuteAiTaskInput`; optionally `connector` (a user-chosen connector key — the
  cascade narrows to it, else tries all).
- `executeAiTask` then enforces, in order: feature **enabled** check
  (`errors.ai.featureDisabled`), agent **enabled** + **quota** + **global budget**
  (`errors.ai.budgetExceeded`), builds the prompt, resolves connectors, runs the
  **cascade**, records **token usage** + **audit**. You inherit all of it.
- Move helpers/interfaces/constants to `<module>.utilities.ts` / `.types.ts` /
  `.constants.ts` (rules #13/#14a). Use enums, `??`, `===`, explicit return types,
  `node:` imports — no `any`, no `console.log`, no `.util.ts` filename.

### Step 5 — Add the controller route (`@RequirePermission` + AI `@Throttle`)

Copy [`ai-alert-triage.controller.ts`](../../apps/api/src/modules/alerts/ai-alert-triage.controller.ts).
Controllers only route and delegate (rules #14). **Every AI endpoint** carries
`@RequirePermission(Permission.AI_*)` (#25) and the AI throttle tier (#33/#80):

```ts
@Post(':id/ai/next-tasks')
@RequirePermission(Permission.AI_CASE_COPILOT)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // AI tier — #33/#80
async nextTasks(
  @Param('id', ParseUUIDPipe) id: string,
  @TenantId() tenantId: string,
  @CurrentUser() user: JwtPayload,
  @Body('connector') connector?: string
): Promise<AiResponse> {
  return this.aiCaseCopilotService.nextTasks(id, tenantId, user, connector)
}
```

- Reuse an existing `AI_*` permission when the feature fits an existing surface
  (e.g. `AI_CASE_COPILOT`, `AI_ALERT_TRIAGE`, `AI_DETECTION_COPILOT`). If you need a
  **new** permission, do [`skills/backend/add-permission.md`](../backend/add-permission.md)
  **first** end-to-end (enum + definitions + defaults + `@RequirePermission` +
  migration with `WHERE NOT EXISTS` + frontend mirror + i18n + `pnpm prisma:seed`,
  `apps/api/CLAUDE.md` #85) — never ship a half-wired permission.
- Wire the service + controller into the module's `@Module({ providers, controllers })`
  and ensure the module `imports: [AiModule]` (it exports `AiService` —
  `ai.module.ts`).

### Step 6 — Classify the action category + approval level (the safety gate)

Decide the feature's **`AiActionCategory`** (`packages/ai/src/safety.ts`,
mirrored in `ai-feature.enum.ts`) and its **`AiApprovalLevel`**:

- A pure summarize/explain/score/interpret feature is **`ANALYSIS_ONLY`** /
  `AiApprovalLevel.NONE` — read-only, no side effects, no approval. Most features
  are this.
- A feature whose output a human acts on manually (a draft rule/playbook the
  analyst then applies) is **`SUGGESTED`** — still no auto-execution.
- A feature that **executes a side-effecting / destructive action** (runs a
  playbook, mutates a connector, closes/contains, applies a writeback that changes
  security/infra state) is **`APPROVAL_REQUIRED`** and `destructive: true`.

For an `APPROVAL_REQUIRED` feature you **must** create a **persisted
`ApprovalRequest`** BEFORE execution (`apps/api/CLAUDE.md` #97;
[`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) §3). Do **not**
hand-roll the boolean — drive it from `evaluateApproval(action)`
(`packages/ai/src/safety.ts`) for the policy, and route execution through the
orchestrator's `requiresApproval()` / `createApprovalRecord()`
(`orchestrator.service.ts`) which persists the record with a 24h expiry and an
`ApprovalStatus`. The executor must honor status — **never run on `pending` /
`rejected` / `expired`**, and the execute endpoint re-checks `@RequirePermission`.
Writeback **findings are proposals** (`proposed` state via
`ai-writeback.service.ts`); applying one that mutates security/infra state is
itself `APPROVAL_REQUIRED`.

### Step 7 — Provenance + citations on the output

`AiService.executeAiTask` already returns an `AiResponse` carrying provenance:
`provider`, `model`, `confidence`, `tokensUsed` (`ai.types.ts`) — recorded in the
audit log and surfaced to the UI. **Do not strip these.** If you build a structured
result (a finding/risk score/IOC enrichment) rather than a raw `AiResponse`, model
it on the package contracts in [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts):
`AiProvenance` (provider/model/confidence/tokens/`generatedAtIso`/`promptVersion`)
and **`AiCitation[]`** (`label` + `sourceRef` — the connector/alert/MISP event the
claim came from). Use `isHighConfidence(provenance)` for thresholding. Provenance +
citations are required by `AGENTS.md §7` and
[`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) — an AI claim
without attribution is a bug. **Never render or persist the model output as raw
HTML** (§7).

### Step 8 — i18n keys (all 6 locale files)

Any new `messageKey` you introduce (e.g. `errors.cases.notFound`,
`errors.ai.<x>`) must exist in **all six**
[`apps/api/src/i18n/*.json`](../../apps/api/src/i18n/) files (rule #49):
`en/ar/es/fr/de/it.json`. Reuse the existing generic AI keys where possible:
`errors.ai.featureDisabled`, `errors.ai.budgetExceeded`,
`errors.ai.connectorNotAvailable`, `errors.ai.notEnabled`,
`errors.ai.serviceUnavailable`, `errors.aiFeatures.invalidFeatureKey`.

### Step 9 — Tests

Add a `__tests__/ai-<module>-<thing>.service.spec.ts` (mock `AiService` and the
repository) covering: subject-not-found (404, tenant scope), the happy path
asserting `executeAiTask` is called with the right `featureKey` + a **redacted**
`context`, and (for `APPROVAL_REQUIRED`) that an `ApprovalRequest` is created before
execution and execution is refused without it. For provider-agnostic logic put unit
tests next to `packages/ai/src/*` (e.g. asserting `redact()` removes a secret,
`evaluateApproval()` returns `requiresApproval: true` for a destructive action).

---

## Validation commands (real `pnpm` commands — run from repo root)

`pnpm` only, Node 22 (`AGENTS.md §4`). Run these and **read the output** — never
claim a gate is green without running it (`AGENTS.md §5/§13`):

```bash
pnpm install            # if deps changed
pnpm typecheck          # HARD gate — must pass (FEATURE_TO_AGENT_MAP omissions fail here)
pnpm lint               # AI rules above are ESLint errors (no-explicit-any, enum, no-console)
pnpm format:check       # Prettier (no semicolons, single quotes, width 100)
pnpm test               # unit tests (add your service spec + any packages/ai spec)
pnpm build              # HARD gate — must build
pnpm validate           # full bundle (typecheck + lint:strict + format:check)
```

Faster per-package iteration:

```bash
pnpm --filter @auraspear/api typecheck
pnpm --filter @auraspear/api lint:strict   # zero-warnings CI bar
pnpm --filter @auraspear/api test
pnpm --filter @auraspear/ai  test          # if you touched packages/ai
```

Run `pnpm prisma:generate` / `pnpm prisma:migrate` / `pnpm prisma:seed` **only** if
you did [`add-permission.md`](../backend/add-permission.md) for a new `AI_*`
permission (seed populates it). No schema change is needed for the feature itself —
feature config and prompts are stored against existing models
(`AiFeatureConfig`, `AiPromptTemplate`). **Hard gates that must be green:**
`pnpm typecheck` and `pnpm build` (`AGENTS.md §5`).

---

## Docs to update

- **[`docs/AI.md`](../../docs/AI.md)** and [`docs/ai/`](../../docs/ai/) — add the
  feature: its `AiFeatureKey`, owning agent, action category, approval level, and
  which `AI_*` permission guards it.
- **[`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md)** — record the new
  `AiFeatureKey` (and any new `Permission`) so the next agent knows it exists.
- **i18n** — the 6 locale files are part of the change, not "docs", but verify
  every new `messageKey` exists in all of `en/ar/es/fr/de/it.json`.
- **[`docs/decisions/`](../../docs/decisions/)** (ADR) — only for a non-obvious
  choice (a new approval policy, a new structured output type, a new agent).
- **`AGENTS.md §11` recipe table** — already links this skill; no edit needed.
- If the feature ships a UI surface, that is the
  [`add-ai-panel.md`](../frontend/add-ai-panel.md) change (catalog mirror, proxy
  route, `useAi*` hook, render-only panel).

---

## Security checks (the non-negotiable invariants — `AGENTS.md §6–§7`)

- [ ] **Tenant isolation (#26, #48).** The subject is loaded with
      `findFirstByIdAndTenant(id, tenantId)` (or equivalent `where: { id, tenantId }`)
      **before** any model call. `executeAiTask` always carries `tenantId`; usage,
      budget, audit, and any `ApprovalRequest` are tenant-scoped. **No cross-tenant
      AI investigation, ever.** `tenantId` comes from `@TenantId()`, never the body
      or a client header (#76).
- [ ] **RBAC (#25).** The endpoint carries `@RequirePermission(Permission.AI_*)`;
      a new permission is wired end-to-end (#85) — never half-wired, never `@Roles()`
      on a new AI route.
- [ ] **Inputs redacted (`AGENTS.md §7`).** Secrets/PII are stripped from `context`
      **before** the model call and **before** any transcript persists — use
      `redact()` from `@auraspear/ai` ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts):
      JWTs, AWS keys, bearer tokens, private keys, `key=secret` pairs, emails, IPs).
      Bound the context size (`.slice(...)`) to avoid leaking huge raw events.
      Pass `keep: [RedactionKind.IPV4]` only when the IP is the very thing under
      investigation.
- [ ] **Provider cascade (#88, #89).** Routed through `executeAiTask` →
      `tryConnectorsInOrder` over **all** connectors from
      `findAvailableAiConnectors`; rule-based fallback (`model: 'rule-based'`) only
      when **every** connector fails or none exist. **No** direct single-provider SDK
      call, **no** `BEDROCK_MOCK` / `NODE_ENV`-gated mock (#56, #89).
- [ ] **Provenance + citations (`AGENTS.md §7`).** The returned `AiResponse` keeps
      `provider` / `model` / `confidence` / `tokensUsed`; structured outputs use
      `AiProvenance` + `AiCitation[]` from `packages/ai`. The prompt instructs the
      model to cite evidence fields. Nothing is presented without attribution.
- [ ] **Never raw AI HTML (`AGENTS.md §7`).** The model output is treated as text /
      safe markdown; never stored or returned as renderable HTML; never
      `dangerouslySetInnerHTML` downstream.
- [ ] **Action category + approval (#97).** The feature declares its
      `AiActionCategory`; anything destructive / `APPROVAL_REQUIRED` creates a
      **persisted `ApprovalRequest` before execution** via `evaluateApproval` +
      orchestrator; the executor refuses `pending` / `rejected` / `expired`; the
      execute endpoint re-checks `@RequirePermission`. Never weaken or branch around
      `evaluateApproval` ([`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) §2).
- [ ] **Audit + budget.** Token usage and an audit record are written (inherited
      from `executeAiTask`); credentials/secrets are redacted from audit detail
      (#66). Quota/budget checks are not bypassed.
- [ ] Consider running `/security-review` on the diff, plus
      [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) /
      `pnpm scan:secrets` before opening a PR.

---

## Common mistakes (each is an ESLint error, a type error, or a security bug)

- **Calling a provider SDK directly** (`bedrockService.invoke(...)`) from the
  feature service instead of `AiService.executeAiTask` → loses the cascade,
  provenance, redaction, audit, budget, and violates #88. Route through
  `executeAiTask`.
- **Forgetting the `FEATURE_TO_AGENT_MAP` entry** → TypeScript error (the map is
  `Record<AiFeatureKey, AiAgentId>`); if you cast around it the feature falls back
  to `ORCHESTRATOR` with wrong defaults.
- **Skipping the tenant-ownership load** before the AI call → cross-tenant data
  exposure (#48). Always `findFirstByIdAndTenant`.
- **Not redacting `context`** → secrets/PII leave the tenant boundary and land in
  the model call + transcript (`AGENTS.md §7`). Use `redact()` and bound the size.
- **Adding a mock mode** (`BEDROCK_MOCK`, `if (NODE_ENV !== 'production')`) (#89,
  #56) — never. The cascade's rule-based fallback is the only "offline" path.
- **String literals for keys/categories/levels** — `'case.next_tasks'`,
  `'approval_required'`, `'analysis_only'`, `'orchestrator'` are banned; use
  `AiFeatureKey`, `AiActionCategory`, `AiApprovalLevel`, `AiAgentId` (#12/#17).
- **Endpoint without `@RequirePermission` or without the AI `@Throttle` tier**
  (#25, #33/#80), or a brand-new permission left half-wired (#85).
- **Executing a destructive action without a persisted `ApprovalRequest`**, or
  running on a non-`APPROVED` status (#97; approval rules §3). Drive the gate from
  `evaluateApproval`, don't hand-roll it.
- **Dropping provenance/citations** from the response, or rendering/persisting the
  output as raw HTML (`AGENTS.md §7`).
- **Business logic in the controller** (#14), Prisma in the service (use the
  repository), helpers/types/constants inline (#13/#14a), `any`, `==`/`!=`, `!`,
  `console.log`, `.util.ts`/`.utils.ts` filenames → all ESLint errors. Files are
  kebab-case (`ai-<module>-<thing>.service.ts`).
- **New `messageKey` added to only `en.json`** (#49 — all 6 files).
- **Claiming "green" without running `pnpm typecheck` / `pnpm build`**
  (`AGENTS.md §5/§13`).

---

## Final checklist

- [ ] Read `AGENTS.md` (§6, §7), `rules/ai/*` (governance, approval, output),
      `apps/api/CLAUDE.md` AI rules (#25, #33, #48, #88, #89, #97) before editing.
- [ ] Branch created (not `main`/`master`).
- [ ] `AiFeatureKey.<FEATURE> = '<feature>'` added to `ai-feature.enum.ts` (and
      mirrored in `apps/web/src/enums/ai-config.enum.ts` if used by the web app).
- [ ] `FEATURE_TO_AGENT_MAP[AiFeatureKey.<FEATURE>]` points at an existing core
      agent (typecheck enforces presence).
- [ ] `DEFAULT_PROMPTS[AiFeatureKey.<FEATURE>]` added with `{{var}}` matching the
      `context` keys and an instruction to cite evidence.
- [ ] Feature service routes through **`AiService.executeAiTask`** (no direct SDK
      call), loads the subject with `findFirstByIdAndTenant`, and **redacts**
      `context` via `redact()` from `@auraspear/ai`.
- [ ] Controller route carries `@RequirePermission(Permission.AI_*)` +
      `@Throttle({ default: { limit: 10, ttl: 60000 } })`; module `imports: [AiModule]`,
      registers the service + controller.
- [ ] Action category (`AiActionCategory`) + approval level (`AiApprovalLevel`)
      chosen; destructive/`APPROVAL_REQUIRED` features create a **persisted
      `ApprovalRequest` before execution** via `evaluateApproval` + orchestrator and
      refuse non-`APPROVED` status.
- [ ] Output keeps **provenance** (provider/model/confidence/tokens) and
      **citations**; never raw HTML.
- [ ] Any new `messageKey` added to all 6 `apps/api/src/i18n/*.json`; new permission
      (if any) done via `add-permission.md` end-to-end + `pnpm prisma:seed`.
- [ ] `__tests__/ai-<module>-<thing>.service.spec.ts` covers not-found/tenant scope,
      happy path (right `featureKey` + redacted `context`), and approval gate;
      `packages/ai` unit tests added if package logic changed.
- [ ] Docs updated (`docs/AI.md` / `docs/ai/`, `memory/AI_MEMORY.md`).
- [ ] Ran and pasted output for `pnpm typecheck` and `pnpm build` (hard gates) plus
      `pnpm lint` / `pnpm test`. Did **not** say "green" without evidence.
- [ ] Final response uses the `AGENTS.md §13` report format (Branch / Commits /
      Files created / Files updated / Commands run / Green checks / Failed checks /
      Blockers / Risks / Next steps).

```
Branch:
Commits:
Files created:
Files updated:
Commands run:
Green checks:
Failed checks:
Blockers:
Risks:
Next steps:
```
