# Skill: Add a versioned AI prompt (`@auraspear/ai/prompts`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the one rule (_no AI agent may edit
> first and understand later_), §1 loading order, §5 validation gates, §6 security
> invariants, §7 AI safety invariants, §8 branch safety, §13 final-response format.
> Then read the AI rules in [`rules/ai/`](../../rules/ai/) — especially
> [`ai-governance.md`](../../rules/ai/ai-governance.md) **§3 "Prompt versioning — pin a
> version, record it in provenance"** (the source of truth for this skill) and
> [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md) **§2** (every result carries
> `AiProvenance`, `promptVersion` ties result → exact prompt) and **§4/§8** (never render
> raw AI HTML; redact secrets). Sibling onboarding: [`skills/`](../),
> [`rules/`](../../rules/), [`memory/`](../../memory/), [`context/`](../../context/),
> [`docs/`](../../docs/) — the entry point is always [`AGENTS.md`](../../AGENTS.md). Deep
> reference: [`docs/AI.md`](../../docs/AI.md) ("Prompt lifecycle (`@auraspear/ai/prompts`)").
>
> **No AI agent may edit first and understand later.** Read
> [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts) and the provenance
> contract in [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts) below, then copy
> the existing shape. Do **not** invent a new prompt struct, a new templating syntax, or a
> second registry.

A **versioned prompt** lives in the dependency-free shared package as a
`PromptTemplate { key, version, description, template }` entry in the `PROMPTS` catalog in
[`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts), rendered with
`renderPrompt(prompt, variables)` (interpolates `{{ var }}`, leaves unknown vars intact).
When an AI surface uses a prompt, it records that prompt's `version` in
`AiProvenance.promptVersion` ([`packages/ai/src/types.ts`](../../packages/ai/src/types.ts))
so every finding/score/enrichment is traceable to the exact prompt text that produced it,
and evals can pin a version.

> **Scope honesty — two prompt stores, do not conflate them.** This skill is about the
> **static, build-time catalog** in `@auraspear/ai/prompts` (versions are date-stamped
> string constants, e.g. `'2026-06-19'`; edited in code, shipped in the bundle). There is a
> **separate, DB-backed, per-tenant runtime registry** at
> [`apps/api/src/modules/ai/prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry)
> (`AiPromptTemplate` Prisma model: `version: number` + `isActive: boolean`, one active per
> `(tenantId, taskType)`, CRUD via `prompt-registry.service.ts`, frontend at
> [`apps/web/src/app/(portal)/ai-config/`](<../../apps/web/src/app/(portal)/ai-config>)). They
> coexist by design (`rules/ai/ai-governance.md` §3, `docs/AI.md`). **Adding a prompt here
> does NOT touch the DB, a tenant, a migration, or a permission.** If your task is "let a
> tenant admin author/activate a prompt at runtime," that's the registry module +
> `skills/backend/add-endpoint.md` / `add-permission.md`, **not** this skill.

---

## When to use

Use this skill when you want a **reusable, version-pinned prompt** baked into the shared
package and consumed by an AI surface:

- You are adding a new AI surface (triage, enrichment, explain, agent task) and need a
  prompt that other code can `renderPrompt()` against instead of an inline string literal.
- You are **changing the text** of an existing `PROMPTS` entry — in which case you **must
  bump its `version`** (and update any provenance that pins the old version).
- You want a stable `promptVersion` value to write into `AiProvenance.promptVersion` and to
  pin in a golden eval (`skills/ai/add-ai-evaluator.md`).

**Do not** use this skill for:

- **Tenant-authored / runtime-editable prompts** → the DB-backed
  [`prompt-registry`](../../apps/api/src/modules/ai/prompt-registry) module (Prisma model,
  endpoints, `@RequirePermission`, migration, i18n). That is the "Scope honesty" note above.
- **Wiring a whole AI feature end-to-end** (panel, hook, proxy route) →
  [`skills/ai/add-ai-feature.md`](./add-ai-feature.md) +
  [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md).
- **Adding a golden regression check** over a prompt's output →
  [`skills/ai/add-ai-evaluator.md`](./add-ai-evaluator.md) (pin this prompt's `version` in
  the mocked producer's provenance).

---

## Files to inspect first

Read these before writing anything (paths are load-bearing — cite them, don't guess):

| Path                                                                          | Why                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts)              | The exact shape to copy: `PromptTemplate { key, version, description, template }`, `PromptVariables = Readonly<Record<string, string \| number>>`, `renderPrompt()`, the `PROMPTS` object (`as const satisfies Record<string, PromptTemplate>`), and `PromptKey = keyof typeof PROMPTS`. |
| [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts)                  | `AiProvenance.promptVersion?: string` — the field you record the version in. Also `AiFinding`/`RiskScore`/`IocEnrichment` which all carry `provenance`.                                                                                                                                  |
| [`packages/ai/src/index.ts`](../../packages/ai/src/index.ts)                  | Confirms the barrel re-exports `./prompts.ts`, so consumers `import { PROMPTS, renderPrompt, type PromptTemplate } from '@auraspear/ai'`.                                                                                                                                                |
| [`packages/ai/package.json`](../../packages/ai/package.json)                  | `"type": "module"`, exports map (`.` + `./*`), and that the only scripts are `typecheck` / `typecheck:fast` — **the package has no `lint`/`test` runner of its own** (`lint` is a stub: `echo "(ai) lint via consumers"`). See Validation.                                               |
| [`packages/ai/tsconfig.json`](../../packages/ai/tsconfig.json)                | Sets `allowImportingTsExtensions`, so intra-package imports use the `.ts` suffix (e.g. `from './prompts.ts'`).                                                                                                                                                                           |
| [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3             | The hard rules: prompt TEXT in the registry, bind context only at call time, **bump `version` on text change**, set `promptVersion` on the result.                                                                                                                                       |
| [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) §2, §4, §8 | Provenance is mandatory; never render raw AI HTML; redact secrets — prompt text and rendered prompts are subject to these too.                                                                                                                                                           |
| [`docs/AI.md`](../../docs/AI.md)                                              | "Prompt lifecycle (`@auraspear/ai/prompts`)" — the doc to keep accurate.                                                                                                                                                                                                                 |

Key facts you will rely on (verified from the source above):

- `renderPrompt(prompt, variables)` replaces `{{ name }}` tokens (whitespace tolerant,
  `[A-Za-z0-9_]` names). **Unknown variables are left intact** (the literal `{{ x }}`
  stays) — it does not throw and does not blank them. Bind context at call time; never
  pre-bake tenant/runtime data into `template`.
- `PROMPTS` is `as const satisfies Record<string, PromptTemplate>` — every entry must
  structurally match `PromptTemplate` or the package `typecheck` fails. `PromptKey` is the
  union of keys, so consumers stay type-safe.
- `version` is a **plain date-stamped string** (e.g. `'2026-06-19'`), not a number. The
  numeric `version` is the _other_ store (the DB registry) — don't mix them.
- The package is **dependency-free and provider-agnostic** — no SDKs, no Prisma, no env.
  Keep prompt text generic; runtime/tenant binding happens in the consumer.

---

## Exact step-by-step implementation

> Replace `<surface>` / `<camelKey>` with your real surface (e.g. `caseSummary`,
> `huntHypothesis`). **Branch first** — never work on `main` (`AGENTS.md` §8):
> `git switch -c feat/ai-prompt-<surface>`. Filenames stay kebab-case; the package already
> owns `prompts.ts`, so you are **editing it**, not creating a file.

### 1. Add the `PromptTemplate` entry to the `PROMPTS` catalog

Edit [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts) and add a new entry
to the existing `PROMPTS` object, matching the shape of `alertTriage` / `iocEnrichment`
exactly. `version` is today's date as a string; `key` is a stable dotted id; `description`
is one line; `template` keeps **text only** with `{{ placeholders }}`:

```ts
// packages/ai/src/prompts.ts — inside the existing `PROMPTS = { ... }` object
export const PROMPTS = {
  // ...existing alertTriage, iocEnrichment...
  caseSummary: {
    key: 'case.summary',
    version: '2026-06-20',
    description: 'Summarize a case: status, key alerts, IOCs, and recommended next action.',
    template: [
      'You are a SOC case analyst. Summarize the case below for a Tier-2 handoff.',
      'Output: a 3-sentence status summary, the top 3 linked alerts by severity, and one',
      'recommended next action. Cite the alert ids / evidence fields you used. If a',
      'destructive remediation is implied, mark it as requiring approval — do not instruct',
      'to execute it.',
      '',
      'Case:\n{{case}}',
    ].join('\n'),
  },
} as const satisfies Record<string, PromptTemplate>
```

Rules that keep typecheck + reviewers happy:

- **Match `PromptTemplate` exactly** — `key`, `version`, `description`, `template` all
  present and `readonly`-compatible. A missing field breaks the `satisfies` check.
- **Text only in `template`.** No tenant ids, no secrets, no runtime data, no conditional
  logic — bind all of that at call time with `renderPrompt()` (`ai-governance.md` §3). This
  also satisfies the "no inline multi-line prompt literal in a service" rule.
- **Placeholders use `{{ name }}`** with `[A-Za-z0-9_]` names; the same name you'll pass in
  `PromptVariables`.

### 2. (Editing an existing prompt) Bump the `version`

If you are **changing the text** of an entry rather than adding one, **bump `version` to
today's date** in the same edit (`ai-governance.md` §3: "When you change a prompt's text,
bump its `version`"). Then find every place that pins the old version string in provenance
or in an eval and update it (see step 4 and `skills/ai/add-ai-evaluator.md`). Changing text
without bumping the version silently breaks traceability — the audit trail would point at a
prompt that no longer exists.

### 3. Render the prompt at the call site (consumer side)

In the AI service/util that calls the model, pull the template from the catalog and bind
runtime context with `renderPrompt()` — never re-type the prompt string. In the api
(`apps/api/src/modules/ai/**`), keep this in a **utility** (`<module>.utilities.ts`), not
inline in the service body or controller (`apps/api/CLAUDE.md` #13/#14/#17):

```ts
import { PROMPTS, renderPrompt } from '@auraspear/ai'
import { redact } from '@auraspear/ai'

// Redact secrets/PII BEFORE binding context into the prompt (AGENTS.md §7).
const safeCase = redact(rawCaseContext).text
const promptText = renderPrompt(PROMPTS.caseSummary, { case: safeCase })
// → send `promptText` to the selected connector via the existing provider cascade.
```

- **`redact()` runs before binding** untrusted/sensitive context into the template
  (`rules/ai/ai-output-rules.md` §8; `redact()` from `@auraspear/ai/redaction`). The prompt
  must never carry credentials/PII to the model or into a stored transcript.
- **No `any`, no string-literal prompt.** `PROMPTS.caseSummary` is typed; `renderPrompt`
  returns `string`. Use the catalog reference, not a copy of the text.

### 4. Record the version in provenance

When the surface builds its result (`AiFinding` / `RiskScore` / `IocEnrichment`), set
`provenance.promptVersion` to the **same `version`** you used, alongside the real
`provider`/`model` from the connector that actually answered the cascade
(`rules/ai/ai-output-rules.md` §2):

```ts
import { PROMPTS } from '@auraspear/ai'
import { AiProviderKind } from '@auraspear/ai'
import { nowMs /* date util */ } from '...' // use the repo's date helper, not raw Date.now()

const provenance: AiProvenance = {
  provider: AiProviderKind.BEDROCK, // the connector that answered (may differ on failover)
  model: answeredModelId, // concrete model id, never hardcoded
  promptVersion: PROMPTS.caseSummary.version, // ties result → exact prompt text
  confidence: calibratedConfidence, // OMIT if the provider can't calibrate — never fabricate
  generatedAtIso: generatedAtIso,
}
```

- **Read `version` from the catalog** (`PROMPTS.caseSummary.version`) rather than
  re-typing the date string — that way a future bump can't drift out of sync.
- **Never fabricate `confidence`** — omit it when uncalibrated (`ai-output-rules.md` §2).
- The rule-based fallback path still attaches provenance
  (`provider: AiProviderKind.RULE_BASED`, `model: 'rule-based'`); a fallback that doesn't
  call the model may legitimately omit `promptVersion` (no prompt was rendered).

---

## Validation commands (real `pnpm` commands)

Run from the **repo root**. **pnpm only, Node 22** (`AGENTS.md` §4; root `package.json`
engines `node >=22 <25`, `packageManager pnpm@10.30.3`). Never claim a gate is green unless
you ran it and saw it pass.

```bash
# 0. Install (workspace) — required before any filtered command resolves
pnpm install

# 1. Typecheck the AI package (BLOCKING hard gate; this is THE gate packages/ai has today).
#    Catches a malformed PROMPTS entry — the `as const satisfies Record<string, PromptTemplate>`
#    fails here if your entry is missing/extra fields or the wrong type.
pnpm --filter @auraspear/ai typecheck
# fast/advisory variant (tsgo):
pnpm --filter @auraspear/ai typecheck:fast

# 2. Whole-repo blocking gates (AGENTS.md §5: typecheck + build are HARD gates).
#    Run these if a consumer (apps/api or apps/web) now imports your prompt.
pnpm typecheck
pnpm build

# 3. Consumer lint/format (advisory but pre-commit-enforced). packages/ai has no lint of its
#    own — it lints "via consumers", so lint the app you wired the call site into:
pnpm --filter @auraspear/api lint     # or @auraspear/web
pnpm format:check                     # repo-wide prettier check (or: pnpm format to write)

# 4. If you added/updated a golden eval that pins this prompt's version (add-ai-evaluator.md):
pnpm --filter @auraspear/api test     # jest  — if the eval lives in apps/api
pnpm --filter @auraspear/web test     # vitest — if the eval lives in apps/web
```

> Honest gate note: a prompt that lives **only** in `packages/ai` is exercised by
> **`typecheck`** (package + whole-repo) and `build` — that is what you can truthfully call
> green. `packages/ai` has **no `lint`/`test` script of its own** (`lint` is a stub). The
> prompt is only _executed_ once a consumer renders it and a test/eval runs — until then say
> "typechecked, not executed," not "prompt working."

---

## Docs to update

- [`docs/AI.md`](../../docs/AI.md) — "Prompt lifecycle (`@auraspear/ai/prompts`)". If you add
  a meaningfully new surface/prompt convention, note it; keep the description of
  `PromptTemplate { key, version, template }` + `renderPrompt()` + `promptVersion`
  accurate. Don't claim a CI prompt-eval gate that doesn't exist (that box is roadmap).
- [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3 — only if you change _how_
  versioning works (you shouldn't here). Keep "bump version on text change → record in
  `promptVersion`" consistent; do not edit it to weaken the rule.
- [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md) — if this prompt establishes a new stable
  surface, record it as a stable truth (key, what it's for, where the version is pinned).
- This directory's index: [`AGENTS.md`](../../AGENTS.md) §11 already routes AI work at
  `skills/ai/`. No new table row is needed unless you add a brand-new recipe.
- **Not** an i18n / migration / permission change — prompt **text** in `@auraspear/ai` is
  English model-facing instruction, not user-facing UI copy, and touches no DB. (Contrast
  the DB registry, which _does_ need migration + permission + 6 locale files.)

---

## Security checks

Prompt text is an input that reaches a model and (rendered) may reach a stored transcript —
treat it accordingly:

- **No secrets in `template` or rendered output.** The `template` is committed source —
  keep it synthetic and generic. Bind real context only at call time, **after `redact()`**
  (`@auraspear/ai/redaction`; `AGENTS.md` §6–§7, `rules/ai/ai-output-rules.md` §8). No JWTs
  (`eyJ…`), AWS keys (`AKIA…`), bearer tokens, private keys, emails, or IPs in committed
  prompt text.
- **Never instruct the model to execute destructive actions.** A prompt may ask the model
  to _analyze and suggest_; it must not direct it to silently run a playbook, isolate a
  host, or close an alert. Destructive/high-risk recommendations are `approval-required` and
  gated by a persisted `ApprovalRequest` via `evaluateApproval()`
  (`packages/ai/src/safety.ts`; `AGENTS.md` §7; `apps/api/CLAUDE.md` #97). Word the prompt
  to _flag_ such actions as approval-required, not to perform them.
- **Prompt output is untrusted text — never render as raw HTML.** Whatever the model returns
  from this prompt is rendered as plain text / sanitized markdown, never via
  `dangerouslySetInnerHTML` (`AGENTS.md` §7; `rules/ai/ai-output-rules.md` §4;
  `apps/web/CLAUDE.md` #43; `react/no-danger`).
- **Tenant isolation is unchanged.** The catalog is global (build-time) and tenant-free.
  Tenant scoping lives entirely in the consumer that binds context and persists the
  result — adding a prompt here must not become a path to cross-tenant context. The
  per-tenant story is the DB registry, which scopes every query by `tenantId`
  (`apps/api/CLAUDE.md` #8/#26).
- **No env-gated mock / hardcoded provider.** The prompt is provider-agnostic; the consumer
  still routes through the full connector cascade (`apps/api/CLAUDE.md` #88/#89) — adding a
  prompt never introduces a shortcut around it.

---

## Common mistakes

- **Inlining the prompt string in a service** instead of adding it to `PROMPTS` and calling
  `renderPrompt()`. That bypasses versioning + provenance and violates the "no inline
  multi-line prompt literal / no inline constants" layering rules (`apps/api/CLAUDE.md`
  #13/#17; `ai-governance.md` §3).
- **Changing a prompt's text without bumping `version`.** The audit trail then points at a
  `promptVersion` that no longer matches the text. Always bump on edit (step 2).
- **Baking tenant/runtime data into `template`.** Templates are static text with
  `{{ placeholders }}`; bind context at call time only.
- **Forgetting `redact()` before binding context** into the prompt — leaks secrets/PII to
  the model and transcripts (`ai-output-rules.md` §8).
- **Not setting `provenance.promptVersion`** on the result, or hardcoding the date string
  instead of reading `PROMPTS.<key>.version` (it drifts on the next bump).
- **Confusing the two stores** — editing `packages/ai/src/prompts.ts` and then (wrongly)
  also creating a Prisma migration / permission / i18n keys. The static catalog needs none
  of that; the DB `prompt-registry` is a separate module.
- **Numeric `version`.** This catalog uses **date-stamped strings** (`'2026-06-20'`); only
  the DB `AiPromptTemplate` uses `version: number`.
- **Using `any` / `// eslint-disable` / `@ts-ignore`** — banned repo-wide (`apps/api/CLAUDE.md`
  #1–2, `apps/web/CLAUDE.md` #1–2). The `satisfies Record<string, PromptTemplate>` already
  gives you type safety; let it.
- **Wrong import suffix inside the package.** Intra-package imports use the `.ts` suffix
  (`packages/ai/tsconfig.json` → `allowImportingTsExtensions`); consumers import from the
  barrel `@auraspear/ai`.
- **Claiming "prompt working" when you only typechecked it.** `packages/ai` has no test
  runner — a prompt that typechecks has not been _rendered/executed_ (see Validation note).

---

## Final checklist

- [ ] Branched off `main` (`feat/ai-prompt-<surface>`); read the files in "Files to inspect
      first" before editing.
- [ ] Prompt added to `PROMPTS` in `packages/ai/src/prompts.ts` matching `PromptTemplate`
      (`key`, `version`, `description`, `template`); `version` is a date-stamped **string**.
- [ ] `template` is **text-only** with `{{ placeholders }}` — no tenant data, no secrets, no
      logic; the `as const satisfies Record<string, PromptTemplate>` still typechecks.
- [ ] If editing existing text: `version` **bumped**, and every pinned `promptVersion`/eval
      updated to match.
- [ ] Call site uses `renderPrompt(PROMPTS.<key>, vars)` (no inline string) and runs
      `redact()` on context **before** binding.
- [ ] Result sets `provenance.promptVersion = PROMPTS.<key>.version`; `confidence` omitted
      when uncalibrated (never fabricated); real `provider`/`model`.
- [ ] Prompt does not instruct destructive execution; destructive recommendations remain
      `approval-required`; output rendered as text/sanitized markdown (never raw HTML).
- [ ] `pnpm --filter @auraspear/ai typecheck` passes (ran it; saw green). If a consumer
      imports it: `pnpm typecheck` + `pnpm build` pass; consumer `lint` + `format:check` clean.
- [ ] Did **not** add a Prisma migration / permission / i18n keys (that's the DB registry,
      not this catalog).
- [ ] Docs touched honestly: `docs/AI.md` "Prompt lifecycle" left accurate; `memory/AI_MEMORY.md`
      noted if this is a new stable surface. No roadmap claim about a CI prompt-eval gate.
- [ ] Final response uses the `AGENTS.md` §13 format; did **not** claim "all green" or
      "prompt working" beyond what was actually run (typechecked ≠ executed).

---

## Related

- [`AGENTS.md`](../../AGENTS.md) — §1 loading order, §5 validation gates, §6 security
  invariants, §7 AI safety invariants, §8 branch safety, §13 final-response format.
- [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) — §3 prompt versioning (pin
  version, bump on text change, record in provenance; the static catalog vs. the DB registry).
- [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) — §2 provenance &
  `promptVersion`, §4 never render raw AI HTML, §8 tenancy/secrets/redaction.
- [`docs/AI.md`](../../docs/AI.md) — "Prompt lifecycle (`@auraspear/ai/prompts`)" + output
  contracts.
- [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts) — `PromptTemplate`,
  `renderPrompt`, `PROMPTS`, `PromptKey`; [`types.ts`](../../packages/ai/src/types.ts) —
  `AiProvenance.promptVersion`; [`redaction.ts`](../../packages/ai/src/redaction.ts) —
  `redact()`; [`safety.ts`](../../packages/ai/src/safety.ts) — `evaluateApproval`;
  [`index.ts`](../../packages/ai/src/index.ts) — barrel re-export.
- [`apps/api/src/modules/ai/prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry)
  — the **separate** DB-backed per-tenant runtime registry (`AiPromptTemplate`, CRUD,
  `isActive`), with frontend at
  [`apps/web/src/app/(portal)/ai-config/`](<../../apps/web/src/app/(portal)/ai-config>).
- [`skills/ai/add-ai-evaluator.md`](./add-ai-evaluator.md) — pin this prompt's `version` in a
  golden eval; [`skills/ai/add-ai-feature.md`](./add-ai-feature.md) — wire a full AI surface.
