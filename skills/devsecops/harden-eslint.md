# Skill: Harden ESLint (the staged warn → fix → error ramp)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_; §5 hard-vs-advisory gates).
> The governing rules: [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md)
> and [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md)
> (the budgets a linter can enforce). Then the per-app contracts the config
> mechanizes: [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (especially their "ABSOLUTE RULES"
> and the full `eslint.config.mjs` walkthroughs). The **source of truth for every
> gap, severity, and ramp** is [`docs/audit/eslint-hardening-audit.md`](../../docs/audit/eslint-hardening-audit.md)
> (findings ES-01 … ES-07) and the CI posture in
> [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md) R1.
> Sibling recipes: [`skills/devsecops/add-ci-gate.md`](add-ci-gate.md),
> [`skills/devsecops/run-security-scan.md`](run-security-scan.md),
> [`skills/qa/validate-release.md`](../qa/validate-release.md).
>
> **The cardinal rule (GOD MODE §11 staged enforcement):** introduce a rule as
> **`warn`**, measure the existing-violation count from a real ESLint report, drive
> that count to **zero**, then ratchet to **`error`** — **never** flip a wall of red
> on day one, and **never** add `// eslint-disable` to make the count look clean.

This recipe adds or tightens an ESLint rule across the monorepo the safe way. The
config is intentionally large (~95 rules on web, ~100 on api, plus a
`no-restricted-syntax` "architecture-as-lint" regime), so the gaps are _tightening
the net_, not building it.

---

## When to use

Use this skill when you are closing one of the audited gaps, or adding any new lint
rule. The real, evidence-backed gaps to close (`eslint-hardening-audit.md`):

| ID    | Gap                                                              | Land as            | Ratchet target                                               |
| ----- | ---------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| ES-01 | **Web has no type-aware linting** (no `parserOptions.project`)   | `warn` (typed)     | `no-floating-promises` + `no-misused-promises` → `error`     |
| ES-02 | **API on `strict`, not `strictTypeChecked`** (`no-unsafe-*` off) | advisory preset    | keep preset on; `strict-boolean-expressions` may stay `warn` |
| ES-03 | **`packages/ai` + `packages/shared` unlinted** (`echo` stubs)    | advisory           | `safety.ts` + `redaction.ts` zero-warning, then widen        |
| ES-04 | **No size/complexity budgets** (web has none at all)             | `warn`             | `max-lines` / `max-depth` / `max-params` → `error` per-dir   |
| ES-05 | **`ban-ts-comment` not configured** (web rule #12 doc-only)      | `error` (if clean) | enforce on both apps                                         |
| ES-06 | `consistent-type-imports` / `explicit-return-type` only `warn`   | n/a                | promote post-`lint:fix`                                      |
| ES-07 | Web `tsconfig` ES2020, does not extend base                      | direct (config)    | align ES2022 + `extends` base                                |

**Do not** use this skill to: add a new CI workflow/job (→ [`add-ci-gate.md`](add-ci-gate.md));
run scanners (Trivy/gitleaks → [`run-security-scan.md`](run-security-scan.md)); or
_silence_ an existing rule. A diff that only loosens a rule is a review blocker.

---

## Files to inspect first

| Concern                                                        | File                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **The audit — every gap, file:line, severity, ramp**           | `docs/audit/eslint-hardening-audit.md`                                                  |
| Web flat config (no typed parser today — ES-01/ES-04/ES-05)    | `apps/web/eslint.config.mjs`                                                            |
| API flat config (`...tseslint.configs.strict` :10 — ES-02)     | `apps/api/eslint.config.mjs` (typed parser already at :39–42)                           |
| Unlinted packages (`echo` stubs — ES-03)                       | `packages/ai/package.json`, `packages/shared/package.json` (`lint` scripts :25–26)      |
| Shared-config home for ES-03/ES-04/ES-05                       | `packages/config/` (lists an `eslint` dir in `files`, ships none)                       |
| Per-app report scripts (measure the violation count)           | `apps/web/package.json` / `apps/api/package.json` → `lint-report-ts`, `lint-report-all` |
| Shared compiler strictness (what's already backstopped)        | `tsconfig.base.json` (full strict matrix)                                               |
| CI posture (lint is advisory today, R1)                        | `.github/workflows/ci.yml`; `docs/audit/02-risk-register.md` R1                         |
| The safety-critical unlinted code (do these first under ES-03) | `packages/ai/src/safety.ts`, `packages/ai/src/redaction.ts`                             |

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Prettier: no semicolons, single quotes,
width 100.

### 0. Branch first

```bash
git checkout -b chore/eslint-harden-<finding>   # e.g. chore/eslint-harden-es04-budgets
```

### 1. Snapshot the BEFORE violation count (your evidence)

You cannot ramp without a baseline. Generate a JSON report per app (these scripts
exist already):

```bash
pnpm --filter @auraspear/web lint-report-ts     # → apps/web/eslint-reports/eslint-ts-report.json
pnpm --filter @auraspear/api lint-report-ts     # → apps/api/eslint-reports/eslint-ts-report.json
```

Record the count for the rule you are adding (the report is JSON — count entries
whose `ruleId` matches). This BEFORE number is what you must drive to zero before
ratcheting to `error`.

### 2. Add the rule as `warn` (never `error` on day one)

Edit the relevant `eslint.config.mjs`. Examples for the headline findings:

- **ES-04 (size/complexity budgets, `warn`):** add to both apps (web has none) —
  `max-lines` (e.g. 400, `skipBlankLines`/`skipComments`), `max-depth` (4),
  `max-params` (4); add `complexity` + `max-lines-per-function` to **web** (the API
  already has `max-lines-per-function` warn 50 scoped to `*.service.ts` at
  `apps/api/eslint.config.mjs:410`, and `complexity` at :145/:420).
- **ES-01 (web type-aware, `warn`):** add a typed block scoped to `src/**/*.{ts,tsx}`
  with `languageOptions.parserOptions.projectService: true`, then introduce
  `@typescript-eslint/no-floating-promises`, `no-misused-promises`,
  `prefer-nullish-coalescing`, `prefer-optional-chain` as `warn`. Keep the typed
  block **off test files** (tests already relax strict rules).
- **ES-02 (API preset):** swap `...tseslint.configs.strict` →
  `...tseslint.configs.strictTypeChecked` (parser already wired). Expect a
  `no-unsafe-*` / `restrict-template-expressions` spike at trust boundaries.
- **ES-05 (`ban-ts-comment`):** add `@typescript-eslint/ban-ts-comment: 'error'`
  explicitly to **both** apps (it can land at `error` directly **only if** the
  report shows zero existing `@ts-` comments; otherwise warn-first).
- **ES-03 (unlinted packages):** create a shared flat config under
  `packages/config/eslint`, replace the `echo` stubs in `packages/ai`/`packages/shared`
  `package.json` with real `eslint .` scripts, and lint `safety.ts`/`redaction.ts`
  first.

Lint stays **advisory in CI** (R1) throughout the warn phase — do not flip the job
to blocking in the same change (`eslint-hardening-audit.md` §5).

### 3. Fix the violations (never disable them)

Re-run the report and work the list to zero:

```bash
pnpm --filter @auraspear/web lint-report-ts
```

Fix the **root cause**: add explicit types / `unknown` narrowing at boundaries
(ES-02), refactor an over-long function/file (ES-04 — see
[`../backend/split-god-service.md`](../backend/split-god-service.md) /
[`../frontend/split-large-react-component.md`](../frontend/split-large-react-component.md)),
remove the `@ts-` comment and fix the type (ES-05). **Never** add `any`,
`// eslint-disable`, `@ts-ignore`, or `@ts-expect-error` to absorb a finding — those
are absolute bans (`apps/api/CLAUDE.md` & `apps/web/CLAUDE.md` rules 1–2) and ES-05
exists precisely to catch the last two.

### 4. Ratchet to `error` once the count is zero

When the BEFORE count is driven to zero (per directory if you are ramping
incrementally — newest/cleanest dirs first, `eslint-hardening-audit.md` §4), change
the rule level `warn → error` for that scope. `lint:strict` (`--max-warnings 0`)
should already be clean on touched files.

### 5. Re-validate the hard gates

A config change can change types/builds. Confirm:

```bash
pnpm --filter @auraspear/api prisma:generate
pnpm typecheck     # HARD gate
pnpm build         # HARD gate
```

### 6. Document the posture

Update `docs/audit/eslint-hardening-audit.md` (mark the finding's status) and, if a
gate stays advisory because of remaining backlog, note the owner + promotion
condition in `docs/audit/02-risk-register.md` (R1).

---

## Validation commands (real pnpm commands, from repo root)

Run and read the output — quote BEFORE/AFTER counts (`AGENTS.md` §5, §13;
`eslint-hardening-audit.md` §5: "no remediation is done until the before/after
warning counts are quoted from real `pnpm lint` output").

```bash
# measure (BEFORE) and re-measure (AFTER)
pnpm --filter @auraspear/web lint-report-ts
pnpm --filter @auraspear/api lint-report-ts

# run the gates
pnpm lint                                   # turbo run lint (advisory in CI today)
pnpm lint:strict                            # turbo run lint:strict (--max-warnings 0)
pnpm --filter @auraspear/web lint:strict    # per-app, on touched files
pnpm --filter @auraspear/api lint:strict
pnpm typecheck                              # HARD gate
pnpm build                                   # HARD gate
```

Hard gates (`typecheck`, `build`) must be green. The lint count must be **lower or
zero** for the rule you ramped — never higher.

---

## Common mistakes

- **Landing a new rule at `error` on day one** — flips a wall of red. Warn-first,
  measure, fix, then ratchet (GOD MODE §11).
- **`// eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `any`** to drive the
  count to zero — absolute bans; ES-05 is the rule that catches the last two.
- **Flipping the CI lint job to blocking in the same change** as the rule promotion
  — separate steps (`eslint-hardening-audit.md` §5; that is `add-ci-gate.md`'s job).
- **Loosening a rule** (lowering a level, dropping a selector, raising a budget) to
  make output green — a review blocker.
- **ES-01/ES-02 without scoping** — type-aware linting is slow; scope to `src/**`,
  exclude tests and config/scripts, rely on `--concurrency=auto` (already in the
  scripts).
- **Claiming a count without a report** — generate `lint-report-ts` and quote it; an
  exit code is not a count.
- **Skipping `prisma:generate`** before re-typechecking the API after a config change.
- **Claiming green without running `pnpm typecheck` / `pnpm build`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md` §5, `eslint-hardening-audit.md`, the target `eslint.config.mjs`,
      and the per-app `CLAUDE.md`.
- [ ] Branched (`chore/eslint-harden-<finding>`), not on `main`.
- [ ] BEFORE violation count captured from a real `lint-report-ts` report.
- [ ] Rule added as `warn` (or `error` only if the report proves zero existing
      violations); CI lint left advisory during the warn phase.
- [ ] Violations fixed at the **root cause** — no `any` / `eslint-disable` /
      `@ts-ignore` / `@ts-expect-error` added.
- [ ] Count driven to zero, then ratcheted `warn → error` for the cleared scope.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them); AFTER count quoted and
      lower/zero; `lint:strict` reported.
- [ ] No rule loosened; posture documented in `eslint-hardening-audit.md` (+ risk
      register R1 if a gate stays advisory).
- [ ] Final response uses the `AGENTS.md` §13 report block.
