# AI Tools — `@auraspear/ai` and the provider stack

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, security + AI-safety invariants). Read it first.
> This file is a **reference**, not a rule.

## What this file is (and is not)

- **This file** = a focused, code-grounded tour of the AI _building blocks_ in
  [`packages/ai`](../../packages/ai) (`@auraspear/ai`) and the three runtime
  providers they model: **AWS Bedrock**, **OpenAI-compatible LLM APIs**, and the
  **OpenClaw gateway** — plus provider routing, prompt templates, evaluators, and
  redaction.
- It does **not** duplicate the canonical AI docs — it links them:
  - [`docs/AI.md`](../AI.md) — AI **architecture + governance** (the live
    subsystem in `apps/api/src/modules/ai`, surfaces, job system, governance
    checklist). Start there for the "how AI flows through the product" view.
  - [`docs/ai/`](../ai/) — deep AI reference (provider routing, prompting,
    approval policy, memory, evaluation) per [`DOCS_INDEX.md`](../DOCS_INDEX.md).
  - [`rules/ai/`](../../rules/ai/) — the **hard rules** for AI work, and
    [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md) +
    [`skills/frontend/add-ai-panel.md`](../../skills/frontend/add-ai-panel.md) —
    the step-by-step recipes ([`AGENTS.md` §11](../../AGENTS.md)).
  - [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (§AI rules: connector
    cascade, agent config, usage quota) and
    [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (§AI Connector Strategy, AI
    surfaces, renderers).
  - Sibling tool docs: [`docs/tools/LIBRARIES.md`](LIBRARIES.md) (load-bearing
    libraries per app) and
    [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md).

**Source of truth for behavior is the code.** Every claim below cites a path;
when this doc and the code disagree, the code wins — fix the doc.

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade
> ([`LIBRARIES.md`](LIBRARIES.md)). Use the command names as references; run them
> only when actually changing the package.

---

## The two layers: foundations vs. runtime

AuraSpear deliberately splits AI into two layers. Keep them straight — most edits
land in one or the other, rarely both.

| Layer           | Lives in                                                                            | What it is                                                                                                                                                   | Has SDKs / network?                                  |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Foundations** | [`packages/ai`](../../packages/ai) (`@auraspear/ai`)                                | Provider-agnostic **contracts + pure functions**: routing decision logic, output contracts, safety/approval policy, redaction, prompt registry, eval harness | **No.** Zero runtime deps; pure and side-effect free |
| **Runtime**     | [`apps/api/src/modules/ai`](../../apps/api/src/modules/ai) + the connector adapters | The live NestJS subsystem that binds the foundations to **real provider SDK/API calls**, persistence, jobs, audit, RBAC, and quotas                          | **Yes.** Calls Bedrock / LLM APIs / OpenClaw         |

The package's own header says it best
([`packages/ai/src/index.ts`](../../packages/ai/src/index.ts)): "_dependency-free
AI building blocks shared by web and api … It deliberately holds only
provider-agnostic contracts and pure utilities — no SDKs, no infrastructure._"

`@auraspear/ai` is **scaffolded foundations**: it is the contract/algorithm
library the runtime is expected to consume. At time of writing the only importer
of the package is its own barrel
([`packages/ai/src/index.ts`](../../packages/ai/src/index.ts)) — the live API
implements equivalent logic locally (e.g. `AI_CONNECTOR_PRIORITY` in
[`apps/api/src/modules/ai/ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts)
mirrors `DEFAULT_PROVIDER_ORDER`). Treat the package as the canonical _shape_ for
new AI work, and prefer wiring the runtime to it over re-deriving the logic.

### Package facts

- **Name / version**: `@auraspear/ai` `1.0.0`, `private`, ESM (`"type":
"module"`) — [`packages/ai/package.json`](../../packages/ai/package.json).
- **Exports**: root barrel plus per-module subpath exports (`@auraspear/ai/safety`,
  `@auraspear/ai/redaction`, etc.) via the `"./*"` export map — same file.
- **No `dependencies` block at all** — the dependency-free promise is structural,
  not aspirational.
- **Build/validate**: `tsc --noEmit` (`typecheck`), `tsgo` (`typecheck:fast`);
  lint is delegated to consumers (`"lint": "echo \"(ai) lint via consumers\""`).
  TS config extends the repo base, `target ES2022`, `moduleResolution bundler`,
  `noEmit`, `allowImportingTsExtensions`
  ([`packages/ai/tsconfig.json`](../../packages/ai/tsconfig.json)) — which is why
  intra-package imports use explicit `.ts` extensions
  (`export * from './safety.ts'`).

### Module map

| File                                                       | Subpath                      | Responsibility                                                               |
| ---------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| [`model-router.ts`](../../packages/ai/src/model-router.ts) | `@auraspear/ai/model-router` | Provider kinds + cascade routing (`routeProviders`, `selectProvider`)        |
| [`prompts.ts`](../../packages/ai/src/prompts.ts)           | `@auraspear/ai/prompts`      | Versioned prompt registry + `renderPrompt()`                                 |
| [`evaluators.ts`](../../packages/ai/src/evaluators.ts)     | `@auraspear/ai/evaluators`   | Golden-case eval harness (`runEval`)                                         |
| [`redaction.ts`](../../packages/ai/src/redaction.ts)       | `@auraspear/ai/redaction`    | PII/secret redaction (`redact`)                                              |
| [`safety.ts`](../../packages/ai/src/safety.ts)             | `@auraspear/ai/safety`       | Action categories, risk levels, `evaluateApproval()`                         |
| [`types.ts`](../../packages/ai/src/types.ts)               | `@auraspear/ai/types`        | Output contracts (`AiProvenance`, `AiFinding`, `RiskScore`, `IocEnrichment`) |
| [`index.ts`](../../packages/ai/src/index.ts)               | `@auraspear/ai`              | Re-exports everything                                                        |

---

## The three AI providers

The platform is provider-agnostic. The same three providers appear in the
foundations enum and in the runtime connector layer, in the same priority order.

| Provider                         | `@auraspear/ai` kind              | Runtime `ConnectorType` | Adapter                                                                                                              | Notes                                                                                                                    |
| -------------------------------- | --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **AWS Bedrock**                  | `AiProviderKind.BEDROCK`          | `bedrock`               | [`services/bedrock.service.ts`](../../apps/api/src/modules/connectors/services/bedrock.service.ts)                   | Direct cloud AI (Claude models). Config: region, model, AWS credentials                                                  |
| **LLM APIs** (OpenAI-compatible) | `AiProviderKind.LLM_APIS`         | `llm_apis`              | [`services/llm-apis.service.ts`](../../apps/api/src/modules/connectors/services/llm-apis.service.ts)                 | OpenAI-compatible endpoints (GPT, Claude API, local LLMs). Config: `baseUrl`, `apiKey`, `defaultModel`, `organizationId` |
| **OpenClaw Gateway**             | `AiProviderKind.OPENCLAW_GATEWAY` | `openclaw_gateway`      | [`services/openclaw-gateway.service.ts`](../../apps/api/src/modules/connectors/services/openclaw-gateway.service.ts) | AI gateway/orchestration layer. Config: `baseUrl`, `apiKey`                                                              |
| _(fallback)_                     | `AiProviderKind.RULE_BASED`       | —                       | —                                                                                                                    | Deterministic, no provider. Labelled `model: 'rule-based'`                                                               |

Sources: enum in
[`model-router.ts`](../../packages/ai/src/model-router.ts) L10–15; runtime
priority list `AI_CONNECTOR_PRIORITY` in
[`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts) L15–19; the
fixed connector labels (`'AWS Bedrock'`, `'LLM APIs (Legacy)'`, `'OpenClaw
Gateway'`) in
[`llm-connectors.constants.ts`](../../apps/api/src/modules/connectors/llm-connectors/llm-connectors.constants.ts);
per-provider config schemas described in
[`apps/web/CLAUDE.md` → "AI Connector Strategy"](../../apps/web/CLAUDE.md) and
validated per connector type via `validateConnectorConfig`
([`apps/api/CLAUDE.md` rule #39](../../apps/api/CLAUDE.md)).

### Provider config is encrypted at rest

Connector credentials (AWS keys, `apiKey`, …) are **AES-256-GCM encrypted at
rest** and never sent to a model
([`AGENTS.md` §6](../../AGENTS.md), [`docs/AI.md`](../AI.md)). Connector
create/update requires `TENANT_ADMIN` and SSRF-validates the `baseUrl`
([`apps/api/CLAUDE.md` rules #55, #59](../../apps/api/CLAUDE.md)). Never add a
`*_MOCK` env-gated mode — adapters must always call the real provider
([`apps/api/CLAUDE.md` rule #89](../../apps/api/CLAUDE.md)).

---

## Provider routing (the cascade)

The core platform rule: **try every configured provider in priority order, use
the first healthy one, and only fall back to rule-based when all fail or none are
configured** — never short-circuit after a single failure
([`apps/api/CLAUDE.md` rule #88](../../apps/api/CLAUDE.md),
[`apps/web/CLAUDE.md` rule #30](../../apps/web/CLAUDE.md)).

```
bedrock → llm_apis → openclaw_gateway → (rule-based fallback)
```

### Foundations: `routeProviders` / `selectProvider`

[`model-router.ts`](../../packages/ai/src/model-router.ts) is the pure decision
logic. Given a list of `AiProvider { kind, enabled, healthy, priority? }`:

- A provider is **usable** only when it is both `enabled` **and** `healthy`
  (`RULE_BASED` is excluded from the usable set) — L52.
- Usable providers are sorted by explicit `priority` if set, otherwise by their
  index in `DEFAULT_PROVIDER_ORDER` (`bedrock=0, llm_apis=1, openclaw_gateway=2`;
  unknown kinds sort last via `Number.MAX_SAFE_INTEGER`) — L38–41, L54.
- `routeProviders()` returns `{ order, fallbackToRuleBased }`, where
  `fallbackToRuleBased` is `true` **iff** no provider is usable — L55.
- `selectProvider()` returns the single best provider, or `null` when only the
  rule-based fallback remains — L59–64.

```ts
import { routeProviders, selectProvider, AiProviderKind } from '@auraspear/ai'

const { order, fallbackToRuleBased } = routeProviders([
  { kind: AiProviderKind.BEDROCK, enabled: true, healthy: false },
  { kind: AiProviderKind.LLM_APIS, enabled: true, healthy: true },
])
// order = [llm_apis], fallbackToRuleBased = false
```

### Runtime binding

The live API resolves connectors with the same priority order and walks them in
sequence — `findAvailableAiConnectors()` returns **all** configured connectors
and `tryConnectorsInOrder()` iterates them, only reaching the rule-based response
after every provider fails ([`apps/api/CLAUDE.md` rule #88](../../apps/api/CLAUDE.md)).
The provider + model actually used is recorded in the **audit log** and in every
result's **provenance** ([`docs/AI.md`](../AI.md)). The frontend connector
dropdown fetches the live list from `/api/connectors/ai-available` — never static
enum iteration ([`apps/web/CLAUDE.md` rule #45](../../apps/web/CLAUDE.md)).

> **Two cascades exist.** Most AI methods use `bedrock → llm_apis →
openclaw_gateway`. The standalone **AI Chat** surface tries the fixed
> connectors `llm_apis → openclaw_gateway → bedrock` first, then custom LLM
> connectors ([`apps/web/CLAUDE.md` → "AI Chat Page"](../../apps/web/CLAUDE.md)).
> Confirm the order in the relevant service before assuming.

---

## Prompt templates

[`prompts.ts`](../../packages/ai/src/prompts.ts) is a **versioned** prompt
registry. A `PromptTemplate` is `{ key, version, description, template }` — the
`version` exists so an AI output can record which prompt produced it
(`AiProvenance.promptVersion`) and so evals can pin a version.

- `renderPrompt(prompt, variables)` interpolates `{{ name }}` placeholders;
  **unknown variables are left intact** (the regex callback returns the original
  `match` when a key is absent) — L17–24. Keep prompt **text** in the registry and
  bind tenant/runtime context at call time, not in the template.
- The starter catalog `PROMPTS` ships two pinned templates: `alertTriage`
  (`alert.triage`) and `iocEnrichment` (`ioc.enrichment`), each with an explicit
  `version` date — L27–50. `PromptKey` is the union of catalog keys.

```ts
import { PROMPTS, renderPrompt } from '@auraspear/ai'

const text = renderPrompt(PROMPTS.iocEnrichment, {
  iocType: 'domain',
  ioc: 'evil.example',
})
```

The **runtime** has its own first-class, tenant-aware prompt registry module
([`apps/api/src/modules/ai/prompt-registry`](../../apps/api/src/modules/ai/prompt-registry))
for stored/editable prompts; `@auraspear/ai`'s `PROMPTS` is the shared
in-code starter catalog. See prompting guidance in [`docs/ai/`](../ai/).

---

## Evaluators

[`evaluators.ts`](../../packages/ai/src/evaluators.ts) is a minimal, framework-free
eval harness so CI can catch regressions (hallucination, safety, schema drift)
without a heavyweight dependency.

- An `EvalCase<TInput, TOutput>` carries `input` + a list of
  `EvalAssertion<TOutput>` (`{ description, check, safety? }`).
- `runEval(cases, produce)` runs each case through the injected async `produce`
  (a real or mocked provider call), evaluates assertions, and returns
  `{ cases, passRate, safetyPassed }` — L39–81.
- A failing assertion marked `safety: true` is recorded as a **safety
  violation**; `safetyPassed` is `false` if **any** case has one, regardless of
  the numeric `passRate` — L62–63, L79. This is the "safety gate beats score"
  rule.
- A throwing `produce()` is caught and recorded as a failure (`produce() threw:
…`), not a crash — L51–55.

Because `produce` is **injected**, evals run offline against mocked providers.
The runtime exposes an eval module
([`apps/api/src/modules/ai/eval`](../../apps/api/src/modules/ai/eval)). Wiring a
golden-dataset eval gate into CI is on the roadmap — the harness already exists
([`docs/AI.md` governance checklist](../AI.md)).

```ts
import { runEval } from '@auraspear/ai'

const result = await runEval(cases, input => callProvider(input))
if (!result.safetyPassed) throw new Error('AI safety regression')
```

---

## Redaction

[`redaction.ts`](../../packages/ai/src/redaction.ts) strips secrets/PII **before**
context is sent to a model **and before** a transcript is persisted, so
credentials and obvious PII never leave the tenant boundary or land in logs. It
is pattern-based (no network), conservative, and side-effect free — directly
implementing the [`AGENTS.md` §7](../../AGENTS.md) invariant: "_redact PII/secrets
before model calls (`@auraspear/ai` `redact()`)_".

`redact(input, keep?)` returns `{ text, counts, redactedAny }`. Rules run
most-specific-first (`RULES` array, L26–65); `RedactionKind` covers:

| Kind             | Catches                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `private-key`    | PEM `-----BEGIN … PRIVATE KEY-----` blocks (RSA/EC/OPENSSH/PGP)                                          |
| `jwt`            | `eyJ…` three-segment JWTs                                                                                |
| `aws-access-key` | `AKIA…` / `ASIA…` 20-char keys                                                                           |
| `bearer-token`   | `Bearer <token>` headers                                                                                 |
| `generic-secret` | `secret`/`password`/`api_key`/`token`/`auth` `=`/`:` value pairs (keeps the key name, redacts the value) |
| `email`          | email addresses                                                                                          |
| `ipv4`           | dotted-quad IPv4 addresses                                                                               |

The `keep` list disables specific kinds — e.g. keep IPs when the IP is the very
thing under investigation: `redact(text, [RedactionKind.IPV4])` — L77–78.

```ts
import { redact, RedactionKind } from '@auraspear/ai'

const { text, redactedAny } = redact(rawContext, [RedactionKind.IPV4])
// text has secrets/PII masked; IPv4 preserved for the investigation
```

> Redaction is **defense in depth**, not the only control. Connector
> credentials are AES-256-GCM-encrypted at rest and never sent to models; request
> logs redact passwords; audit interceptors strip credential keys
> ([`apps/api/CLAUDE.md` rules #57, #66](../../apps/api/CLAUDE.md)). Never store
> AI responses in `localStorage` ([`apps/web/CLAUDE.md` rule #46](../../apps/web/CLAUDE.md)).

---

## Safety / approval policy and output contracts

These two modules complete the foundations; both are summarized in
[`docs/AI.md`](../AI.md) (§Safety & approval, §Output contracts) — linked here so
the tool view is complete without duplicating that doc.

### Safety — `evaluateApproval()`

[`safety.ts`](../../packages/ai/src/safety.ts) classifies every AI action into an
`AiActionCategory` (`analysis-only`, `suggested`, `approval-required`,
`auto-allowed`) with a `RiskLevel` (`low`/`medium`/`high`/`critical`).
`evaluateApproval(action)` is **conservative by design** (L47–64):

- `analysis-only` → no approval (no side effects).
- `approval-required` → always approval.
- **destructive** (any category) → always approval.
- **high / critical** risk → always approval.
- `auto-allowed` → bypasses approval **only** when non-destructive and low/medium
  risk.
- `suggested` (default) → requires a human to act.

This enforces the [`AGENTS.md` §7](../../AGENTS.md) invariant that AI "_must not
silently execute destructive … actions_". Approval-required actions must create a
persisted `ApprovalRequest` before execution
([`apps/api/CLAUDE.md` rule #97](../../apps/api/CLAUDE.md)). The web side must
visually distinguish each category and show approval status
([`apps/web/CLAUDE.md` rules #44, #59](../../apps/web/CLAUDE.md)).

### Output contracts

[`types.ts`](../../packages/ai/src/types.ts): every AI result is **attributable,
confidence-scored, and source-cited**.

- `AiProvenance` — `provider`, `model`, optional `confidence` (0..1),
  `promptVersion`, `tokensIn`/`tokensOut`, `generatedAtIso` (L9–18). Token counts
  feed the cost/FinOps surface; the runtime usage-budget module
  ([`apps/api/src/modules/ai/usage-budget`](../../apps/api/src/modules/ai/usage-budget))
  enforces per-agent quotas before each provider call
  ([`apps/api/CLAUDE.md` rule #98](../../apps/api/CLAUDE.md)).
- `AiFinding`, `RiskScore`, `IocEnrichment` — structured, MITRE-mapped where
  relevant, each carrying `AiCitation[]` (`{ label, sourceRef }`) and
  `provenance`. `RiskScore` is explainable (0..100 with weighted `factors`).
- `isHighConfidence(provenance, threshold = 0.7)` — helper for confidence gating
  (L68–70).

Never render raw AI output as HTML — render as markdown or plain text
([`AGENTS.md` §7](../../AGENTS.md),
[`apps/web/CLAUDE.md` rule #43](../../apps/web/CLAUDE.md)); rich blocks use the
standardized renderers in `src/components/ai-renderer/`
([`apps/web/CLAUDE.md` rule #53](../../apps/web/CLAUDE.md)).

---

## Using `@auraspear/ai`

- Import from the root barrel or a subpath:
  `import { redact, routeProviders } from '@auraspear/ai'` or
  `import { redact } from '@auraspear/ai/redaction'`.
- It is **pure**: no I/O, no SDKs. Inject provider calls (`produce` in `runEval`,
  the SDK call behind a resolved provider). This is what keeps it usable from both
  `apps/web` and `apps/api` and testable offline.
- Adding/changing AI behavior end-to-end: follow
  [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md) and obey the
  [`rules/ai/`](../../rules/ai/) hard rules. Register new AI surfaces in the
  feature catalog before implementing them
  ([`apps/web/CLAUDE.md` rule #49](../../apps/web/CLAUDE.md)).
- Validate after edits with the package's own gates
  (`tsc --noEmit` / `tsgo`), then the repo gates in
  [`AGENTS.md` §5](../../AGENTS.md). Do **not** run `pnpm` (mid-upgrade).

## Where to go next

- **Architecture + governance**: [`docs/AI.md`](../AI.md) → [`docs/ai/`](../ai/).
- **Runtime subsystem**: [`apps/api/src/modules/ai`](../../apps/api/src/modules/ai)
  and the connector adapters under
  [`apps/api/src/modules/connectors/services`](../../apps/api/src/modules/connectors/services).
- **Rules + recipes**: [`rules/ai/`](../../rules/ai/),
  [`skills/ai/`](../../skills/ai/), [`skills/frontend/add-ai-panel.md`](../../skills/frontend/add-ai-panel.md).
- **Sibling tool docs**: [`LIBRARIES.md`](LIBRARIES.md),
  [`TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md),
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).
