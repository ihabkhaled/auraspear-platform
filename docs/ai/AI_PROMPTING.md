# AI Prompting — versioned `PromptTemplate`, `renderPrompt`, provenance `promptVersion`

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — it is the single AI
> entry point and defines the loading order (§1), AI safety invariants (§7), the
> security invariants (§6), branch safety (§8), and the validation gates (§5).
> This page is **deep reference** for the **static, build-time prompt catalog** in
> [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts). It does not
> restate AI architecture or governance — for those, read the top-level docs and
> rules below and treat the **code as the source of truth**:
>
> - [`docs/AI.md`](../AI.md) — AI architecture + governance map; the
>   "Prompt lifecycle (`@auraspear/ai/prompts`)" section is the authoritative
>   one-paragraph summary. This page expands it; it does not contradict it.
> - [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) **§3 "Prompt
>   versioning — pin a version, record it in provenance"** — the hard rule (prompt
>   TEXT in the registry, bind context at call time, bump `version` on text change,
>   set `promptVersion` on the result). This page **must not weaken §3**.
> - [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) **§2** —
>   every result carries `AiProvenance`; `promptVersion` ties result → exact prompt.
>   **§4/§8** — never render raw AI output as HTML; redact secrets.
> - [`skills/ai/add-ai-prompt.md`](../../skills/ai/add-ai-prompt.md) — the
>   **step-by-step recipe** to add or bump a prompt (copy that; don't reinvent the
>   struct or templating). This page explains _how it works_; the skill is _how to
>   add one_.
>
> Sibling deep-reference docs: [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md),
> [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md), [`AI_EVALUATION.md`](AI_EVALUATION.md),
> [`AI_AGENT_CATALOG.md`](AI_AGENT_CATALOG.md),
> [`AI_MEMORY_POLICY.md`](AI_MEMORY_POLICY.md). Index:
> [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).

---

## Two prompt stores — do not conflate them

There are **two distinct prompt mechanisms** in this codebase. They coexist by
design ([`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3) and are
the single most common point of confusion. This page documents the **static
catalog** (the left column). The **DB-backed registry** (right column) is its own
NestJS module — see [Runtime DB registry](#the-other-store-the-db-backed-runtime-registry).

|                                            | **Static catalog** (this page)                                   | **DB-backed runtime registry**                                                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where                                      | [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts) | [`apps/api/src/modules/ai/prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry/)                                                                                                                               |
| Shape                                      | `PromptTemplate { key, version, description, template }`         | `PromptTemplateResponse { id, tenantId, taskType, version, name, content, isActive, … }` ([`prompt-registry.types.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.types.ts))                            |
| `version`                                  | **date-stamped string** (e.g. `'2026-06-19'`)                    | **`number`** + `isActive: boolean` (one active per `(tenantId, taskType)`)                                                                                                                                                 |
| Scope                                      | Global, tenant-free, shipped in the bundle                       | Per-tenant rows in Postgres                                                                                                                                                                                                |
| Edited by                                  | Engineers, in code, via PR                                       | Tenant admins at runtime via [`/ai-prompts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.controller.ts) (frontend [`apps/web/src/app/(portal)/ai-config/`](<../../apps/web/src/app/(portal)/ai-config>)) |
| Touches DB / migration / permission / i18n | **No**                                                           | **Yes** (`AI_AGENTS_*` permissions, Prisma model, migration)                                                                                                                                                               |

**Adding or editing a prompt in the static catalog does NOT touch the DB, a
tenant, a migration, or a permission.** If your task is "let a tenant admin
author/activate a prompt at runtime," that is the registry module — use
[`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md) /
[`add-permission.md`](../../skills/backend/add-permission.md), **not** the prompt
skill.

---

## The static catalog: `@auraspear/ai/prompts`

Source: [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts),
re-exported from the barrel
[`packages/ai/src/index.ts`](../../packages/ai/src/index.ts). The package is
**dependency-free and provider-agnostic** — no SDKs, no Prisma, no env
([`packages/ai/package.json`](../../packages/ai/package.json) →
`"type": "module"`; see [`docs/AI.md`](../AI.md)). Consumers import from the
barrel: `import { PROMPTS, renderPrompt, type PromptTemplate } from '@auraspear/ai'`.

### The `PromptTemplate` contract

A versioned prompt is **content + a version** so that AI outputs can record which
prompt produced them (provenance) and evals can pin a version:

```ts
// packages/ai/src/prompts.ts
export interface PromptTemplate {
  readonly key: string // stable dotted id, e.g. 'alert.triage'
  readonly version: string // date-stamped string, e.g. '2026-06-19'
  readonly description: string // one line, what it does
  readonly template: string // TEXT ONLY, with {{ placeholders }}
}

export type PromptVariables = Readonly<Record<string, string | number>>
```

Every field is `readonly`. **Keep prompt TEXT in `template`; bind tenant/runtime
context only at call time** (the file's own header comment, and
[`ai-governance.md`](../../rules/ai/ai-governance.md) §3). No tenant ids, no
secrets, no runtime data, no conditional logic in `template`.

### The `PROMPTS` catalog

Entries live in a single `PROMPTS` object, typed
`as const satisfies Record<string, PromptTemplate>`:

```ts
// packages/ai/src/prompts.ts — the starter catalog today
export const PROMPTS = {
  alertTriage: {
    key: 'alert.triage',
    version: '2026-06-19',
    description: 'Summarize an alert, infer likely MITRE technique, recommend triage steps.',
    template: [
      'You are a SOC Tier-1 triage assistant. Given the alert below, produce a concise',
      'triage summary, the single most likely MITRE ATT&CK technique id, and 3 next steps.',
      'Cite evidence fields you used. If evidence is insufficient, say what is missing.',
      '',
      'Alert:\n{{alert}}',
    ].join('\n'),
  },
  iocEnrichment: {
    key: 'ioc.enrichment',
    version: '2026-06-19',
    description:
      'Enrich an IOC, correlate with tenant history, flag false positives, cite sources.',
    template: [
      'Enrich the {{iocType}} indicator "{{ioc}}". Assess whether it is malicious, estimate',
      'false-positive likelihood (0..1), and list the sources/connectors you relied on.',
    ].join('\n'),
  },
} as const satisfies Record<string, PromptTemplate>

export type PromptKey = keyof typeof PROMPTS // 'alertTriage' | 'iocEnrichment'
```

Why each piece matters:

- **`as const satisfies Record<string, PromptTemplate>`** — every entry must
  structurally match `PromptTemplate` (all four fields, right types) or the
  package `typecheck` fails. This is the gate that catches a malformed prompt; see
  [Validation](#validation).
- **`PromptKey = keyof typeof PROMPTS`** is the union of catalog keys, so consumers
  stay type-safe (`PROMPTS.alertTriage` is checked, a typo isn't).
- The catalog is a **starter** — extend it per AI surface. Each surface should
  pin a version (the file's own comment: _"extend per AI surface. Each surface
  should pin a version."_).

### `renderPrompt(prompt, variables)`

```ts
// packages/ai/src/prompts.ts
export function renderPrompt(prompt: PromptTemplate, variables: PromptVariables): string {
  return prompt.template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, name: string) => {
    const value = Object.prototype.hasOwnProperty.call(variables, name)
      ? variables[name as keyof PromptVariables]
      : undefined
    return value === undefined ? match : String(value)
  })
}
```

Verified behavior from the source — rely on these exactly:

- **Token syntax is `{{ name }}`** — whitespace-tolerant (`{{alert}}` and
  `{{ alert }}` both match), names are `[A-Za-z0-9_]`. The same name is the key in
  the `PromptVariables` you pass.
- **Unknown variables are left intact.** A placeholder with no matching variable
  stays as the literal `{{ x }}` — `renderPrompt` **does not throw** and **does not
  blank it**. (Equally, an `undefined` value leaves the token in place.)
- **Values are coerced with `String()`** — `string | number` only
  (`PromptVariables = Readonly<Record<string, string | number>>`). It is a pure,
  side-effect-free function: no network, no I/O.
- **Bind context at call time** — pass tenant/runtime data through `variables`;
  never pre-bake it into `template`.

---

## Provenance: `promptVersion` ties a result → the exact prompt

The whole reason prompts are versioned is **traceability**. Every structured AI
result carries `AiProvenance`
([`packages/ai/src/types.ts`](../../packages/ai/src/types.ts)), and its
`promptVersion` records which prompt text produced the output:

```ts
// packages/ai/src/types.ts
export interface AiProvenance {
  readonly provider: AiProviderKind // bedrock | llm_apis | openclaw_gateway | rule-based
  readonly model: string // concrete model id that answered
  readonly confidence?: number // 0..1 — OMIT when not calibrated, never fabricate
  readonly promptVersion?: string // ← the PromptTemplate.version that was rendered
  readonly tokensIn?: number
  readonly tokensOut?: number
  readonly generatedAtIso: string
}
```

`AiFinding`, `RiskScore`, and `IocEnrichment` (same file) all carry a **required**
`provenance: AiProvenance`. The contract rules for the full payload live in
[`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) §1–§2 — this
page only covers the prompt link. Key points:

- **Set `promptVersion` from the catalog**, not a re-typed date:
  `provenance.promptVersion = PROMPTS.alertTriage.version`. Reading it from the
  catalog means a future version bump can't drift out of sync.
- **`provider`/`model` come from the connector that actually answered** the
  cascade ([`model-router.ts`](../../packages/ai/src/model-router.ts):
  `bedrock → llm_apis → openclaw_gateway`, then rule-based), not the one the
  analyst selected — they differ on failover.
- **A rule-based fallback** that does not call a model attaches
  `provider: AiProviderKind.RULE_BASED` / `model: 'rule-based'` and **may legitimately
  omit `promptVersion`** (no prompt was rendered).
- **Never fabricate `confidence`** — it is optional; omit it when uncalibrated
  ([`ai-output-rules.md`](../../rules/ai/ai-output-rules.md) §2). The ≥0.7 check is
  `isHighConfidence(provenance, 0.7)` from `types.ts` — don't re-implement it.

---

## End-to-end flow (consumer side)

The static catalog only holds text; **the consumer renders it, redacts context,
calls the provider, and records the version.** In the api
([`apps/api/src/modules/ai/`](../../apps/api/src/modules/ai/)) this lives in a
**utility** (`<module>.utilities.ts`), never inline in a service body or a
controller ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #13/#14/#17 — no inline
constants, no business logic in services/controllers):

```ts
import { PROMPTS, renderPrompt, redact, AiProviderKind } from '@auraspear/ai'

// 1) Redact secrets/PII BEFORE binding untrusted context into the prompt (AGENTS.md §7).
const safeAlert = redact(rawAlertJson).text

// 2) Render the catalog template — never re-type the prompt string.
const promptText = renderPrompt(PROMPTS.alertTriage, { alert: safeAlert })

// 3) Send `promptText` to the connector chosen by the provider cascade.
//    (selectProvider/routeProviders in packages/ai/src/model-router.ts.)

// 4) Build the result and pin the prompt version into provenance.
const provenance: AiProvenance = {
  provider: AiProviderKind.BEDROCK, // the connector that answered (may differ on failover)
  model: answeredModelId, // concrete model id, never hardcoded
  promptVersion: PROMPTS.alertTriage.version, // ties result → exact prompt text
  confidence: calibratedConfidence, // OMIT if uncalibrated — never fabricate
  generatedAtIso,
}
```

Invariants this flow upholds (all are hard rules, not guidance):

1. **Redact first.** `redact()`
   ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)) runs on
   context **before** it is bound into the template — no JWTs, AWS keys, bearer
   tokens, private keys, emails, or IPs reach the model or a stored transcript
   ([`AGENTS.md`](../../AGENTS.md) §7,
   [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md) §8).
2. **No inline prompt string.** Use `renderPrompt(PROMPTS.<key>, vars)`, never a
   copied multi-line literal — that bypasses versioning + provenance and violates
   the layering rules ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #13/#17;
   [`ai-governance.md`](../../rules/ai/ai-governance.md) §3).
3. **Prompts never instruct destructive execution.** A prompt may ask the model to
   _analyze and suggest_; destructive/high-risk recommendations stay
   `approval-required` and are gated by a persisted `ApprovalRequest` via
   `evaluateApproval()` ([`packages/ai/src/safety.ts`](../../packages/ai/src/safety.ts);
   [`AGENTS.md`](../../AGENTS.md) §7;
   [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #97).
4. **Output is untrusted text.** Whatever the model returns is rendered as plain
   text / sanitized markdown — never `dangerouslySetInnerHTML`
   ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #43;
   [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md) §4; `react/no-danger`).

---

## Versioning policy — bump on every text change

The rule is short and absolute ([`ai-governance.md`](../../rules/ai/ai-governance.md)
§3): **when you change a prompt's `template` text, bump its `version`** to today's
date in the same edit, then update every place that pins the old version string in
provenance or in a golden eval.

- Changing text without bumping the version silently breaks traceability — the
  audit trail would point at a `promptVersion` whose text no longer exists.
- `version` is a **date-stamped string** (`'2026-06-20'`), **not a number**. The
  numeric `version` belongs to the _other_ store (the DB registry); never mix them.
- Evals pin a version so a regression test is reproducible — see
  [`AI_EVALUATION.md`](AI_EVALUATION.md) and
  [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md)
  (`runEval()` in [`packages/ai/src/evaluators.ts`](../../packages/ai/src/evaluators.ts)).

---

## The other store: the DB-backed runtime registry

When a **tenant admin** authors/activates a prompt at runtime, that is the
NestJS module
[`apps/api/src/modules/ai/prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry/)
— a **separate** mechanism, not the static catalog above. From the source
([`prompt-registry.controller.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.controller.ts),
[`prompt-registry.types.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.types.ts)):

- **Resource:** `/ai-prompts` (`AuthGuard` + `TenantGuard`). CRUD + a dedicated
  `POST /ai-prompts/:id/activate`.
- **Model:** `PromptTemplateResponse` keyed by `taskType`, with a **numeric**
  `version` and `isActive: boolean` — **exactly one active version per
  `(tenantId, taskType)`**; activating a new version supersedes the prior one.
  Never mutate a published version's text in place
  ([`ai-governance.md`](../../rules/ai/ai-governance.md) §3).
- **RBAC:** `@RequirePermission(Permission.AI_AGENTS_VIEW | AI_AGENTS_CREATE |
AI_AGENTS_UPDATE | AI_AGENTS_DELETE)` — every endpoint scoped by `tenantId`.
- **Frontend:** [`apps/web/src/app/(portal)/ai-config/`](<../../apps/web/src/app/(portal)/ai-config>).

Adding to the **static catalog** needs none of this — no migration, no permission,
no i18n. Adding to the **DB registry** does. Don't cross the streams.

---

## Validation

`packages/ai` has **one** gate of its own and it is the right one for prompts:

```bash
# From repo root. pnpm only, Node 22 (AGENTS.md §4). NOTE: the workspace is
# mid-upgrade — do not run pnpm install/build blindly; confirm the workspace state first.

# BLOCKING hard gate — the `as const satisfies Record<string, PromptTemplate>`
# check fails here if a PROMPTS entry has missing/extra fields or the wrong type.
pnpm --filter @auraspear/ai typecheck
pnpm --filter @auraspear/ai typecheck:fast   # advisory (tsgo)

# Whole-repo blocking gates if a consumer (apps/api / apps/web) now imports the prompt:
pnpm typecheck
pnpm build
```

Honest scope: `packages/ai` has **no `lint`/`test` script of its own** — `lint` is
a stub (`echo "(ai) lint via consumers"` in
[`package.json`](../../packages/ai/package.json)); it lints "via consumers." A
prompt that lives only in `packages/ai` is exercised by **`typecheck`** and
**`build`** — that is what you can truthfully call green. The prompt is only
_rendered/executed_ once a consumer renders it and a test/eval runs; until then say
"typechecked, not executed," not "prompt working"
([`AGENTS.md`](../../AGENTS.md) §5: never claim a gate is green unless you ran it).

---

## Common mistakes

- **Inlining the prompt string in a service** instead of adding it to `PROMPTS`
  and calling `renderPrompt()` — bypasses versioning + provenance and breaks
  layering ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #13/#17).
- **Changing text without bumping `version`** — the audit trail points at a
  `promptVersion` that no longer matches the text.
- **Baking tenant/runtime data into `template`** — templates are static text with
  `{{ placeholders }}`; bind context at call time only.
- **Forgetting `redact()` before binding context** — leaks secrets/PII to the
  model and transcripts.
- **Not setting `provenance.promptVersion`**, or hardcoding the date string
  instead of reading `PROMPTS.<key>.version` (it drifts on the next bump).
- **Confusing the two stores** — editing `packages/ai/src/prompts.ts` and then
  (wrongly) also writing a Prisma migration / permission / i18n keys. The static
  catalog needs none of that.
- **Numeric `version` in the static catalog** — it uses date-stamped strings; only
  the DB `prompt-registry` uses `version: number`.
- **Expecting `renderPrompt` to throw on a missing variable** — it doesn't; it
  leaves the `{{ token }}` intact. Validate required variables yourself if a missing
  one must be an error.

---

## Related

- [`AGENTS.md`](../../AGENTS.md) — **the entry point**; §1 loading order, §5
  validation gates, §6 security invariants, §7 AI safety invariants (provenance,
  no raw HTML, approval), §8 branch safety.
- [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts) —
  `PromptTemplate`, `PromptVariables`, `renderPrompt`, `PROMPTS`, `PromptKey`;
  [`types.ts`](../../packages/ai/src/types.ts) — `AiProvenance.promptVersion`,
  `AiFinding`/`RiskScore`/`IocEnrichment`; [`redaction.ts`](../../packages/ai/src/redaction.ts)
  — `redact()`; [`safety.ts`](../../packages/ai/src/safety.ts) — `evaluateApproval`;
  [`model-router.ts`](../../packages/ai/src/model-router.ts) — provider cascade;
  [`index.ts`](../../packages/ai/src/index.ts) — barrel re-export.
- [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3 — prompt
  versioning (pin version, bump on text change, record in provenance; static
  catalog vs. DB registry); [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md)
  §2/§4/§8 — provenance, never render raw AI HTML, tenancy/secrets/redaction.
- [`skills/ai/add-ai-prompt.md`](../../skills/ai/add-ai-prompt.md) — add/bump a
  prompt; [`add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md) — pin a
  prompt's `version` in a golden eval; [`add-ai-feature.md`](../../skills/ai/add-ai-feature.md)
  — wire a full AI surface.
- [`docs/AI.md`](../AI.md) — "Prompt lifecycle (`@auraspear/ai/prompts`)" +
  architecture/governance map; sibling deep refs
  [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md), [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md),
  [`AI_EVALUATION.md`](AI_EVALUATION.md). Index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).
- [`apps/api/src/modules/ai/prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry/)
  — the **separate** DB-backed per-tenant runtime registry (`/ai-prompts`,
  `version: number` + `isActive`), frontend at
  [`apps/web/src/app/(portal)/ai-config/`](<../../apps/web/src/app/(portal)/ai-config>).
