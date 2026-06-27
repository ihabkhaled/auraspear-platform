# GOD MODE §16.1 — Testing & Coverage Audit

> Honest, evidence-backed accounting of the **test surface** of the
> **AuraSpear Platform** monorepo: what is genuinely well-tested (and it is a
> lot), where the coverage story has structural holes, and a staged plan to make
> the gates actually gate. Every claim cites a real file/count, gathered by
> `find`/`grep` against the working tree. No test counts are estimated.
>
> **Companion audits:** [`architecture-clean-code-audit.md`](./architecture-clean-code-audit.md) ·
> [`security-performance-audit.md`](./security-performance-audit.md) ·
> [`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md) ·
> [`eslint-hardening-audit.md`](./eslint-hardening-audit.md) ·
> [audit index](./README.md)
>
> **Remediation skill:** [`skills/devsecops/harden-eslint.md`](../../skills/devsecops/harden-eslint.md)
> **Governing rules:** [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md) ·
> [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md)

**Severity:** how much risk the gap carries if left open (Low / Medium / High).
**Gate class:** `hard gate` (must be green to merge — `typecheck` + `build`),
`advisory` (`continue-on-error`, runs and annotates but does not block — `test`),
or `staged` (proposed ramp). Current posture is documented in
[`02-risk-register.md`](./02-risk-register.md) and
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

---

## 1. Executive summary

AuraSpear is **well-tested for a platform of its age**, with a real spec corpus,
not smoke tests: **102** `*.spec.ts` on the API (Jest + ts-jest), **95**
`*.test.ts`/`.tsx` on the web app (Vitest), **5** Playwright e2e specs, and **1**
NestJS supertest e2e spec. Backend **tenant-isolation and RBAC** coverage is a
genuine strength, and **AI safety** (redaction, approval/budget) is tested at the
API layer. Test integrity is clean: **zero** `.skip` / `.only` / `.todo` markers
anywhere.

The gaps are not "we don't have tests" — they are "the tests we have don't
**gate** anything, and three areas aren't covered at all":

1. **No coverage thresholds exist** anywhere — Jest's `collectCoverageFrom` is
   set but there is no `coverageThreshold`; Vitest has the v8 coverage provider
   installed but no `coverage.thresholds`. The GOD MODE §12 coverage target is
   therefore unenforced.
2. **The shared packages have zero tests** — `packages/ai` (incl. `safety.ts`,
   `redaction.ts`) and `packages/shared` have no test files and no test script.
3. **The web suite is a node-only Vitest suite with no DOM** — there is no
   `jsdom` / `@testing-library`, so the mandated component-render tests and the
   "every page route → Playwright test" rule are unmet (5 e2e specs vs 61 page
   routes).
4. **The CI `test` job is `continue-on-error`** — red tests can merge.

All remediations follow GOD MODE §11 staged enforcement: stand up the threshold
infrastructure low, ratchet upward; promote a curated safety subset to a hard
gate before promoting the whole suite. Nothing below proposes flipping the entire
test job to blocking in one move.

---

## 2. Strengths (the parts that are genuinely strong)

### 2.1 Real, sizeable spec corpus on correct runners

| Surface          | Count                  | Runner / config                                                                 |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------- |
| API unit/service | **102** `*.spec.ts`    | Jest + ts-jest ([`apps/api/package.json`](../../apps/api/package.json):117–142) |
| API e2e          | **1** `*.e2e-spec.ts`  | supertest (`apps/api/test/auth/auth-flow.e2e-spec.ts`)                          |
| Web              | **95** `*.test.ts(x)`  | Vitest ([`apps/web/vitest.config.ts`](../../apps/web/vitest.config.ts))         |
| Web e2e          | **5** Playwright specs | `apps/web/e2e/*.spec.ts` + `apps/web/playwright.config.ts`                      |

Runner choice is correct: Jest/ts-jest for NestJS (decorator metadata), Vitest
for the Next.js app, Playwright for browser e2e. The web `test` script uses
`vitest run --pool=threads` and the API uses `jest --maxWorkers=100%`
(`apps/*/package.json`).

### 2.2 Tenant isolation & RBAC are seriously tested (backend)

`grep` finds tenant-isolation / cross-tenant / RBAC assertions recurring across
**13** API spec/source files. Concretely:
`apps/api/test/services/tenant-privacy.spec.ts` exercises cross-tenant query
scoping; `apps/api/test/guards/tenant.guard.spec.ts` and the permissions/roles
guard specs cover the guard chain; `tenants.service.spec.ts` covers tenant
management. For a multi-tenant SOC platform this is the single most important
invariant to test, and it is tested broadly rather than once.

### 2.3 AI safety is tested at the API layer

`apps/api/test/utils/redaction.utility.spec.ts` covers the redaction utility
(the PII/secret stripping that must run before model calls). Approval/budget
behavior is covered by `apps/api/test/modules/usage-budget.service.spec.ts`,
`apps/api/src/modules/ai/usage-budget/__tests__/usage-budget.service.spec.ts`,
`apps/api/test/modules/orchestrator.service.spec.ts`, and
`apps/api/test/modules/ai.service.execute-task.spec.ts`. The approval-policy and
token-budget paths — the AI-safety invariants — have direct coverage.

### 2.4 Test integrity is clean

`grep` for `(describe|it|test)\.(skip|only|todo)` across all test dirs returns
**0**. No quarantined, focused, or stubbed-out tests are masking gaps or hiding a
single-file accidental `.only`. This is a real, verifiable hygiene win.

---

## 3. Findings

### TC-01 — No coverage threshold enforced anywhere (§12 target unenforced) · High

**Evidence.** The Jest config in
[`apps/api/package.json`](../../apps/api/package.json):133–137 sets
`collectCoverageFrom` (`src/**/*.ts`, `!src/main.ts`) and `coverageDirectory`
but has **no** `coverageThreshold` key.
[`apps/web/vitest.config.ts`](../../apps/web/vitest.config.ts) defines `test` but
no `coverage` block at all — even though `@vitest/coverage-v8` is a devDependency
([`apps/web/package.json`](../../apps/web/package.json):77). So coverage can be
**collected** but no minimum is **enforced**, on either app.

**Impact.** The GOD MODE §12 high-coverage target is a documented aspiration with
no machine enforcement. Coverage can silently regress to zero on a module and
nothing fails. With 197 spec/test files this is a real waste — the data exists,
nothing acts on it. High because it is the keystone gap: every other testing
remediation is hard to defend without a ratchet that prevents backsliding.

**Fix (staged).** Add `coverageThreshold.global` to the Jest config and
`test.coverage.thresholds` to the Vitest config, seeded at the **current measured
coverage** (run `pnpm --filter @auraspear/api test:cov` and `vitest run
--coverage` first — do not guess), then ratchet up over milestones toward §12.
Add per-changed-file thresholds where the runner supports it. Wire a `test:cov`
step into CI as the gating mechanism (see TC-04). Land advisory, ratchet the
numbers, then make `test:cov` a hard gate once stable.

### TC-02 — `packages/ai` and `packages/shared` have zero tests and no test script · High

**Evidence.** `find packages -name "*.test.ts" -o -name "*.spec.ts"` returns
**0**. Neither [`packages/ai/package.json`](../../packages/ai/package.json) nor
[`packages/shared/package.json`](../../packages/shared/package.json) defines a
`test` script (only `typecheck` and the `echo`-stub `lint`). The untested source
includes `packages/ai/src/safety.ts`, `redaction.ts`, `model-router.ts`,
`evaluators.ts` — verified present — i.e. the AI safety/approval classifier, the
redaction layer, the provider-routing cascade, and the eval harness.

**Impact.** The most security-critical **shared** code on the platform has no
unit coverage in its own package. The API tests in §2.3 exercise the API's
copies/wrappers, but the shared primitives that **both** apps import are
untested at source. These are pure functions (ideal unit-test targets) doing
redaction and safety classification — exactly the logic where a silent
regression is most dangerous and a unit test is cheapest. High due to maximal
blast radius (consumed by both apps) and zero current coverage.

**Fix (staged).** Add Vitest to `packages/ai` and `packages/shared` with `test`
and `test:cov` scripts and a Turbo `test` task that actually runs them (today the
pipeline runs nothing for these packages). Prioritize golden-case tests for
`safety.ts` (approval-category classification) and `redaction.ts` (full
sensitive-key matrix, plus a ReDoS-safety check on redaction regexes), then
`model-router.ts` cascade ordering and `evaluators.ts`. Set a coverage threshold
on these two packages immediately (they start near 100% as tests are written).

### TC-03 — Web suite is node-only (no DOM); render tests & route-coverage rule unmet · High

**Evidence.** [`apps/web/vitest.config.ts`](../../apps/web/vitest.config.ts):12
sets `environment: 'node'` with no `jsdom`/`happy-dom` and no `@testing-library`
in devDependencies ([`apps/web/package.json`](../../apps/web/package.json):67–95
— none present). The test files **self-document** this constraint:
`apps/web/test/permission-sync.test.ts:13` ("Since we cannot render React hooks
without @testing-library/react…"), `notification-page.test.ts:28` ("Since the
project uses a node-only vitest environment without jsdom…"), and
`ai-triage-hook.test.ts:24` ("…here we test the service calls"). Meanwhile
`apps/web/CLAUDE.md` mandates component-render tests (loading/empty/error/data)
and rule #48 requires **every page route → a Playwright test** — but there are
**5** Playwright specs against **61** `page.tsx` routes (`find` counts).

**Impact.** Two stated testing mandates are unmet. The 95 web tests are real but
necessarily test **service calls and logic**, not rendered components — so the
loading/empty/error render states the design system depends on are not asserted,
and ~56 page routes have no e2e coverage. The web app's 95 tests give a false
sense of UI coverage; they are logic tests wearing a UI suite's name. High
because it is a direct, documented rule violation across the majority of routes.

**Fix (staged).** Choose one of two coherent paths and commit to it:
**(A)** add `jsdom` (or `happy-dom`) + `@testing-library/react` + jest-dom
matchers to Vitest, switch a `components`/`hooks` test project to the DOM
environment, and write render-state tests for the highest-traffic pages first;
**or (B)** accept node-only Vitest for logic and realign the docs, then close the
route gap by expanding Playwright toward the 61 routes (template-driven: loaded /
empty / error / responsive per route). Either way, ratchet route coverage
(specs ÷ routes) as a tracked number. Path A is closer to the existing
`CLAUDE.md` intent.

### TC-04 — CI `test` job is `continue-on-error` (red tests can merge) · Medium

**Evidence.** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) sets
`continue-on-error: true` at the **job** level (:58–61) and again at the **step**
level (:92–94, `pnpm test`). Only the `validate` job (typecheck + build) is a
hard gate (:17–34). So the entire unit-test suite is advisory — a PR with failing
tests still goes green overall.

**Impact.** The 102 + 95 + safety/tenant specs in §2 are **observational, not
protective** — they annotate, they do not block. A regression that breaks tenant
isolation or redaction is caught by the suite but does not stop the merge. This
is deliberate today (consistent with the lint-debt posture in
[`02-risk-register.md`](./02-risk-register.md) R1), but it means the platform's
best safety nets aren't load-bearing.

**Fix (staged).** Do not promote the whole job at once. First carve a **curated
guard subset** — the tenant-isolation specs (`tenant-privacy.spec.ts`,
`tenant.guard.spec.ts`, permissions/roles guard specs), the redaction spec, and
the approval/budget specs — into a **hard-gate** CI step (a Jest
`--testPathPattern` / project that must pass). Keep the remainder advisory.
Then, as TC-01 thresholds stabilize, promote the full `test` + `test:cov` job to
blocking. This gives the highest-value invariants gate protection now without
waiting for full green.

### TC-05 — Backend e2e is a single file; no cross-tenant/RBAC/AI-approval e2e · Medium

**Evidence.** `find apps/api -name "*.e2e-spec.ts"` returns exactly **1**:
`apps/api/test/auth/auth-flow.e2e-spec.ts`. The other 101 API specs are
unit/service specs with mocked repositories (the architecture's repository
pattern makes this easy — but it means the full guard → service → repository →
Prisma chain is only exercised end-to-end for auth). There is an
`apps/api/test/jest-e2e.json` and a `test:e2e` script, but one spec uses it.

**Impact.** Tenant isolation and RBAC are well unit-tested (§2.2), but with
mocked repos a real cross-tenant leak through an actual Prisma `where` clause —
the thing that would actually exfiltrate data — is not exercised end-to-end.
Medium: the unit coverage substantially mitigates this, but a true e2e proof of
"tenant A cannot read tenant B" against a live Postgres is the gold standard the
platform currently has only for auth. The CI `test` job already provisions
Postgres + Redis services ([`ci.yml`](../../.github/workflows/ci.yml):62–82), so
the infrastructure to run DB-backed e2e exists.

**Fix (staged).** Add focused e2e specs under `apps/api/test/` for: (1)
cross-tenant access returning 403/404 (read **and** mutate paths), (2) RBAC
denial for an under-privileged role on a guarded endpoint, (3) the
approval-required AI action path creating an `ApprovalRequest` before execution.
Run them against the CI Postgres/Redis services already configured. Fold the
cross-tenant e2e into the TC-04 curated hard-gate subset once stable.

---

## 4. Prioritized remediation table

Ordered by severity, then leverage. "Land as" reflects GOD MODE §11 staged
enforcement.

| #     | Gap                                                         | Sev    | Land as                  | Ratchet target                                       | Evidence                                                                                              |
| ----- | ----------------------------------------------------------- | ------ | ------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TC-01 | No coverage threshold (Jest + Vitest)                       | High   | advisory (seed)          | thresholds → §12 target; `test:cov` → hard gate      | `apps/api/package.json:133-137` (no `coverageThreshold`); `apps/web/vitest.config.ts` (no `coverage`) |
| TC-02 | `packages/ai` + `packages/shared` have zero tests           | High   | advisory                 | `safety.ts`/`redaction.ts` golden cases at threshold | `find packages` → 0 tests; no `test` script in either package                                         |
| TC-03 | Web suite node-only; render tests & route rule (#48) unmet  | High   | tracked metric           | route coverage ratchet; render tests on top pages    | `vitest.config.ts:12` `environment:'node'`; 5 Playwright vs 61 routes                                 |
| TC-04 | CI `test` job `continue-on-error` (red tests can merge)     | Medium | curated subset hard gate | full `test`+`test:cov` → hard gate                   | `.github/workflows/ci.yml:58-61, :92-94`                                                              |
| TC-05 | Backend e2e is 1 file; no cross-tenant/RBAC/AI-approval e2e | Medium | advisory e2e             | cross-tenant e2e into TC-04 hard-gate subset         | only `test/auth/auth-flow.e2e-spec.ts`                                                                |

---

## 5. Sequencing notes

- **Measure before you threshold.** TC-01 must start from a real `test:cov` run,
  not a guessed number — set the floor at current coverage so nothing breaks, then
  ratchet. Per `CLAUDE.md`, no "coverage is X%" claim is valid without pasted
  runner output.
- **Hard-gate the invariants first.** TC-04's curated subset (tenant isolation +
  redaction + approval/budget) is the highest-value, lowest-risk promotion: these
  specs already pass, so making them blocking protects the crown-jewel invariants
  immediately without waiting on the long tail.
- **Shared packages unlock two findings.** TC-02 (tests for `packages/ai` /
  `packages/shared`) pairs naturally with the ESLint shared-config work in
  [`eslint-hardening-audit.md`](./eslint-hardening-audit.md) ES-03 — both stand up
  tooling for the same unlinted/untested packages, so do them together.
- **Pick a lane for the web suite.** TC-03 has two valid resolutions (add DOM, or
  realign docs + expand Playwright). The audit recommends Path A (DOM +
  `@testing-library`) as the smaller delta from the documented `CLAUDE.md` intent,
  but either is acceptable provided the docs and the suite agree afterward.
- **Evidence discipline.** Per GOD MODE §16.1, a testing remediation is "done"
  only when the new gate is shown green from real CI output (`gh pr checks` /
  `gh run view`), not asserted. The `validate` hard gates (`typecheck` + `build`)
  must remain green throughout.
