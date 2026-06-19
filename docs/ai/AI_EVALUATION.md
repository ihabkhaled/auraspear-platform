# AI Evaluation — golden cases, `runEval`, safety assertions, regression strategy

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — it is the single AI
> entry point and defines the loading order (§1), AI safety invariants (§7), and
> validation gates (§5). This page is **deep reference** for the AI evaluation
> harness; it does not restate architecture/governance. For those, read the
> top-level docs and rules below and treat the **code as the source of truth**:
>
> - [`docs/AI.md`](../AI.md) — AI architecture + governance map; the
>   "Evaluation (`@auraspear/ai/evaluators`)" section and the governance
>   checklist are authoritative for **status** (don't duplicate them here).
> - [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §7 — the
>   evaluation gate as a hard rule (golden cases, `safety` fails the run,
>   offline producer, CI wiring is roadmap).
> - [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md) /
>   [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md) — `evaluateApproval`
>   is the one approval gate; provenance + never-render-raw-HTML.
> - [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md) — the
>   **step-by-step recipe** for authoring an evaluator (copy that, don't reinvent
>   a harness). This page explains _how it works_; the skill is _how to add one_.

There are **two distinct things** in this codebase that both say "eval", and they
must not be conflated:

| Layer                                        | What it is                                                                                                                                     | Where                                                                  | Status                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **The harness** (`@auraspear/ai/evaluators`) | A dependency-free, in-process golden-case runner: `EvalCase[]` + `EvalAssertion[]` + `runEval(cases, produce)`. Offline by design.             | [`packages/ai/src/evaluators.ts`](../../packages/ai/src/evaluators.ts) | Exists today; **not** wired into CI as a merge gate (roadmap).                          |
| **The Evaluation Lab** (`ai/eval`)           | A NestJS module that persists tenant-scoped _eval suites_ (golden datasets) and _eval runs_ (executions) in Postgres, behind RBAC permissions. | [`apps/api/src/modules/ai/eval/`](../../apps/api/src/modules/ai/eval/) | CRUD + run records exist; **run execution/scoring is not yet implemented** (see below). |

The harness is the **policy/engine**; the Lab is the **persistence + API surface**
for storing and tracking suites and runs per tenant. Today they are not yet wired
to each other — the Lab does not call `runEval` (see
[Honest scope](#honest-scope--what-does-not-exist-yet)).

---

## 1. The harness: `@auraspear/ai/evaluators`

Source: [`packages/ai/src/evaluators.ts`](../../packages/ai/src/evaluators.ts)
(re-exported from the barrel
[`packages/ai/src/index.ts`](../../packages/ai/src/index.ts), so consumers
`import { runEval, type EvalCase } from '@auraspear/ai'`). The package is
dependency-free and `"type": "module"`; its only scripts are
`typecheck`/`typecheck:fast` — **it has no test runner of its own**
([`packages/ai/package.json`](../../packages/ai/package.json)).

### Contracts

```ts
// packages/ai/src/evaluators.ts
export interface EvalCase<TInput, TOutput> {
  readonly name: string
  readonly input: TInput
  readonly assertions: readonly EvalAssertion<TOutput>[]
}

export interface EvalAssertion<TOutput> {
  readonly description: string
  readonly check: (output: TOutput) => boolean // SYNC + PURE — no awaits, no I/O
  readonly safety?: boolean // a failing safety assertion fails the WHOLE run
}

export interface EvalCaseResult {
  readonly name: string
  readonly passed: number
  readonly total: number
  readonly failures: readonly string[]
  readonly safetyViolations: readonly string[]
}

export interface EvalRunResult {
  readonly cases: readonly EvalCaseResult[]
  readonly passRate: number // passed assertions / total assertions (1 if no assertions)
  readonly safetyPassed: boolean // true ⇔ no case has any safety violation
}
```

Two design facts that the harness guarantees (verified in
[`evaluators.ts`](../../packages/ai/src/evaluators.ts)):

- **`check` is synchronous and pure** — `(output) => boolean`. There is no
  `await` in the assertion path. All async/provider work happens inside
  `produce`. Don't read env, touch Prisma, or hit the network in a `check`.
- **`produce` is the only injection point for a provider.** `runEval` wraps it
  in `try/catch` (`evaluators.ts:49-55`): a throw becomes a recorded failure
  (`produce() threw: <message>`) and does **not** crash the run; every assertion
  for that case is then counted as a failure.

### `runEval(cases, produce)`

```ts
export async function runEval<TInput, TOutput>(
  cases: readonly EvalCase<TInput, TOutput>[],
  produce: (input: TInput) => Promise<TOutput>
): Promise<EvalRunResult>
```

For each case it calls `produce(input)` once, then runs every assertion's
`check` against the produced output, accumulating `passed`, `failures`, and
`safetyViolations`. After all cases:

- `passRate = totalPassed / totalAssertions` (and `1` when there are no
  assertions at all — `evaluators.ts:78`).
- `safetyPassed = results.every(r => r.safetyViolations.length === 0)`
  (`evaluators.ts:79`).

The key asymmetry: **`passRate` and `safetyPassed` are independent.** A run can be
at 99% pass rate and still have `safetyPassed === false` if a single
`safety: true` assertion failed. That is the whole point — a safety regression
must fail the run even when nearly everything else passes.

### Golden cases — what a case looks like

A _golden case_ pins concrete, deterministic input plus the assertions that must
hold over the produced output. Prefer asserting over a **real output contract**
from [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts) (`AiFinding`,
`RiskScore`, `IocEnrichment`) so you lock the actual shape, provenance, and
safety properties — not a throwaway type. Each output carries `AiProvenance`
(provider/model/confidence/`promptVersion`/tokens/`generatedAtIso`), so a case
can assert that provenance is present and that a rule-based fallback is labeled.

The full, copy-paste authoring example (an `alert-triage` golden set with shape
assertions and five safety assertions, plus a mocked producer and a runner)
lives in the skill — see
[`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md)
("Exact step-by-step implementation"). It is not duplicated here.

### The producer is **mocked** — evals run offline

Evals are offline regression checks. `produce` returns a fixed, contract-shaped
output; it must **not** call a live provider (no network, no credentials, no
`BEDROCK_MOCK`-style env-gated mode — banned by
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #89). To exercise a _path_
(e.g. the rule-based fallback), provide a producer that returns
`provider: AiProviderKind.RULE_BASED, model: 'rule-based'`
([`packages/ai/src/model-router.ts`](../../packages/ai/src/model-router.ts)) and
assert the "rule-based fallback is labeled" safety property holds. Live-provider
tests belong in the api service spec, not here.

---

## 2. Safety assertions — the gate inside the gate

A `safety: true` assertion is how the harness distinguishes **must-not-regress
invariants** from ordinary quality/shape checks. Quality assertions affect only
`passRate`; safety assertions additionally drive `safetyPassed`. Mark **every**
assertion that protects an AI safety invariant from
[`AGENTS.md`](../../AGENTS.md) §7 with `safety: true`:

| Invariant (AGENTS.md §7 / rules)        | What the safety assertion checks                                                                                                                                   | Source of truth — do **not** re-implement                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Provenance present                      | `provenance.provider` set, `model` non-empty, `generatedAtIso` non-empty                                                                                           | [`types.ts` `AiProvenance`](../../packages/ai/src/types.ts)                                                                   |
| Destructive ⇒ approval-required         | `evaluateApproval(action).requiresApproval === true` for a destructive/high-risk action                                                                            | [`safety.ts` `evaluateApproval`](../../packages/ai/src/safety.ts) — call it, never hand-roll "if destructive then approval"   |
| Never auto-allow a destructive action   | `category !== AiActionCategory.AUTO_ALLOWED` for destructive outputs                                                                                               | [`safety.ts` `AiActionCategory`](../../packages/ai/src/safety.ts)                                                             |
| No raw HTML/script in human-facing text | `title`/`summary`/`recommendation` contain no `<script>`/`<iframe>`/`javascript:`/event handlers                                                                   | [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md); [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #43      |
| Rule-based fallback is labeled          | `provider !== RULE_BASED` **or** `model === 'rule-based'`                                                                                                          | [`model-router.ts`](../../packages/ai/src/model-router.ts); [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §1 |
| No secrets/PII leak into output         | committed golden data is synthetic; where secret-shaped text appears, assert `redact()` was applied (no `eyJ…` JWT, `AKIA…` key, `BEGIN PRIVATE KEY`, email, IPv4) | [`redaction.ts` `redact`](../../packages/ai/src/redaction.ts)                                                                 |

`evaluateApproval` is the **single approval policy** for the whole platform
([`safety.ts`](../../packages/ai/src/safety.ts)): it is conservative — anything
`destructive` or high/critical `RiskLevel` requires approval, and `AUTO_ALLOWED`
only bypasses approval for non-destructive low/medium-risk allow-listed actions.
An eval that re-implements this logic in a `check` callback will silently drift
from the real gate. Always call the function.

> **Common failure mode:** forgetting `safety: true` on an assertion that
> protects an invariant. Without the flag, the violation only dents `passRate`
> and `safetyPassed` stays `true` — the gate misses the regression. See
> [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md)
> ("Common mistakes").

---

## 3. The Evaluation Lab (`ai/eval`) — persisted suites & runs

Source: [`apps/api/src/modules/ai/eval/`](../../apps/api/src/modules/ai/eval/),
wired into the AI subsystem via
[`apps/api/src/modules/ai/ai.module.ts`](../../apps/api/src/modules/ai/ai.module.ts)
(imports + re-exports `AiEvalModule`). It follows the api's strict
Controller → Service → Prisma layering and RBAC conventions
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)).

### Persistence model (Prisma)

Two tenant-scoped models in
[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) (search
for `model AiEvalSuite` / `model AiEvalRun`):

- **`AiEvalSuite`** (`ai_eval_suites`) — a named golden dataset. `datasetJson`
  (a `Json` column) holds the cases; `tenantId`, `createdBy`, timestamps,
  `runs` relation. This is the durable, tenant-owned counterpart to an
  in-code `EvalCase[]`.
- **`AiEvalRun`** (`ai_eval_runs`) — one execution of a suite against a
  `provider`/`model`. Carries `status` (`pending`/`completed`/`failed`),
  `totalCases`/`passedCases`/`failedCases`, `avgScore`, `avgLatencyMs`,
  `totalTokens`, `resultsJson`, `errorMessage`, and `startedAt`/`completedAt`.
  Cascade-deletes with its suite.

Both are indexed on `tenantId` (and `AiEvalRun` on `suiteId`) and `@@map` to
snake_case tables — consistent with the rest of the schema.

### API surface & RBAC

[`ai-eval.controller.ts`](../../apps/api/src/modules/ai/eval/ai-eval.controller.ts)
mounts at `/ai-eval` under `@UseGuards(AuthGuard, TenantGuard)`, and every
endpoint carries a `@RequirePermission(...)` per
[`AGENTS.md`](../../AGENTS.md) §6 / [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
#25. Two permissions gate it
([`apps/api/src/common/enums/permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts)):
`AI_EVAL_VIEW` (`ai.eval.view`) for reads and `AI_EVAL_MANAGE` (`ai.eval.manage`)
for mutations.

| Method + path                    | Permission       | Service call                            |
| -------------------------------- | ---------------- | --------------------------------------- |
| `GET /ai-eval/suites`            | `AI_EVAL_VIEW`   | `listSuites(tenantId)`                  |
| `POST /ai-eval/suites`           | `AI_EVAL_MANAGE` | `createSuite(tenantId, body, user.sub)` |
| `DELETE /ai-eval/suites/:id`     | `AI_EVAL_MANAGE` | `deleteSuite(tenantId, id)`             |
| `GET /ai-eval/runs` (`?suiteId`) | `AI_EVAL_VIEW`   | `listRuns(tenantId, suiteId?)`          |
| `GET /ai-eval/runs/:id`          | `AI_EVAL_VIEW`   | `getRunDetail(tenantId, id)`            |
| `POST /ai-eval/runs`             | `AI_EVAL_MANAGE` | `startRun(tenantId, body, user.sub)`    |
| `GET /ai-eval/stats`             | `AI_EVAL_VIEW`   | `getStats(tenantId)`                    |

[`ai-eval.service.ts`](../../apps/api/src/modules/ai/eval/ai-eval.service.ts)
enforces tenant isolation on every operation: reads use `where: { tenantId }`,
and `deleteSuite`/`getRunDetail`/`startRun` first `findFirst({ where: { id,
tenantId } })` and throw a `BusinessException` with a localized `messageKey`
(`errors.aiEval.suiteNotFound` / `errors.aiEval.runNotFound`) when absent —
matching [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #17/#26 (every exception
uses `BusinessException` + `messageKey`; never update/delete by `id` alone).
`getStats` aggregates `totalSuites`, `totalRuns`, average `avgScore`, and
per-status run counts, all scoped by `tenantId`.

---

## Honest scope — what does **not** exist yet

Be precise about status; do not overstate. Verified against the code today:

- **The Lab does not execute or score runs.**
  [`startRun`](../../apps/api/src/modules/ai/eval/ai-eval.service.ts) only
  **creates** an `AiEvalRun` with `status: 'pending'` and `totalCases` derived
  from the suite's `datasetJson` length. Nothing transitions it to
  `completed`/`failed`, populates `passedCases`/`avgScore`/`resultsJson`, or
  calls `runEval`. There is no background executor wiring the Lab's persisted
  suites to the `@auraspear/ai/evaluators` harness — that integration is **not
  implemented**.
- **The harness is not a CI merge gate.** It exists and typechecks, but a
  golden-dataset eval gate wired into CI is **roadmap**
  ([`docs/AI.md`](../AI.md) governance checklist:
  `[ ] Golden-dataset eval gate wired into CI`;
  [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §7). Adding an
  evaluator file does **not** make it block merges — never claim it does.
- **`packages/ai` has no test runner.** Its `lint` is a stub
  (`echo "(ai) lint via consumers"`) and there is no `test` script. A file that
  typechecks has **not** been executed. To get an _executed_ eval you must run
  it via a consumer (see [Regression strategy](#regression-strategy)) — otherwise
  say "typechecked, not executed," not "eval passing."

---

## Regression strategy

How to actually use this to catch AI regressions, from cheapest/available-today to
roadmap:

1. **Typecheck the contracts (available today, hard gate).** Authoring an
   `EvalCase[]` against a real `types.ts` contract means contract drift
   (a renamed field, a changed shape, a missing provenance field) fails
   `pnpm --filter @auraspear/ai typecheck` and the whole-repo `pnpm typecheck` —
   both **blocking gates** ([`AGENTS.md`](../../AGENTS.md) §5). This is the gate
   that genuinely exists for `packages/ai` today.
2. **Execute the eval via a consumer test runner (available, opt-in).** The
   package has no runner, so wire **one** consumer (don't duplicate in both):
   - **API (jest):** add a `*.spec.ts`, build the mocked producer with
     `jest.fn().mockResolvedValue(...)` (see the real pattern in
     `apps/api/test/modules/ai.service.spec.ts`), and
     `expect(result.safetyPassed).toBe(true)`.
   - **Web (vitest):** add `test/ai/<surface>.eval.test.ts` and assert
     `result.safetyPassed === true`. Note `@auraspear/ai` is **not currently a
     dependency** of any app, so you must add `"@auraspear/ai": "workspace:*"`
     first.
     Keep golden data + assertions in `packages/ai/src/evals/`; keep only the
     runner glue in the consumer.
3. **Pin the prompt version for reproducibility.** Set
   `AiProvenance.promptVersion` in your golden output to the version from
   [`packages/ai/src/prompts.ts`](../../packages/ai/src/prompts.ts). When a
   prompt's text changes you bump its `version`
   ([`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3); a golden
   case that pins the old version then surfaces the change, so schema/safety
   regressions in the new prompt are caught instead of shipped.
4. **Gate on safety, not just pass rate.** Your runner should fail when
   `safetyPassed === false` **or** `passRate` drops below your threshold — a
   safety regression fails even at 99% pass rate (§2).
5. **Roadmap: CI + Lab integration.** Wiring the harness into CI as a merge gate,
   and having the Lab's `startRun` actually execute persisted suites through
   `runEval` and populate `resultsJson`/scores, are both future work. Until then,
   report exactly what ran: "typechecked" vs "executed", never "CI gate".

> Run validation from the repo root with **pnpm only, Node 22**
> ([`AGENTS.md`](../../AGENTS.md) §4). The exact commands (`pnpm install`,
> `pnpm --filter @auraspear/ai typecheck`, `pnpm typecheck`, `pnpm build`,
> consumer `test`) are in
> [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md)
> ("Validation commands"). Never claim a gate is green unless you ran it.

---

## Related

- [`AGENTS.md`](../../AGENTS.md) — **entry point**; §1 loading order, §5 gates,
  §7 AI safety invariants, §8 branch safety, §13 final-response format.
- [`docs/AI.md`](../AI.md) — AI architecture + governance; the Evaluation section
  and governance checklist are the **status source of truth** (don't duplicate).
- [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md) §3 (prompt
  versioning), §6 (approval/safety), §7 (evaluation gate);
  [`ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md),
  [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md).
- [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md) — the
  recipe to author an evaluator (golden cases + safety assertions + runner).
- Code: [`packages/ai/src/evaluators.ts`](../../packages/ai/src/evaluators.ts),
  [`types.ts`](../../packages/ai/src/types.ts),
  [`safety.ts`](../../packages/ai/src/safety.ts),
  [`model-router.ts`](../../packages/ai/src/model-router.ts),
  [`redaction.ts`](../../packages/ai/src/redaction.ts),
  [`prompts.ts`](../../packages/ai/src/prompts.ts);
  [`apps/api/src/modules/ai/eval/`](../../apps/api/src/modules/ai/eval/)
  (controller/service/module),
  [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)
  (`AiEvalSuite` / `AiEvalRun`).
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (#17, #25, #26, #89) and
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (#43) — the rules the Lab and
  the safety assertions enforce.
