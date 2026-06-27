# Skill: Investigate a production bug (safe diagnosis → root-cause fix → prove it)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_). Once you have a root cause and
> are about to change code, the fix is a behavior change to an existing surface —
> follow [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md)
> (characterization test first, contract preserved, invariants untouched). The
> invariants you must never weaken while "just fixing it":
> [`rules/security/tenant-isolation.md`](../../rules/security/tenant-isolation.md),
> [`rules/security/rbac-rules.md`](../../rules/security/rbac-rules.md),
> [`rules/ai/ai-safety-rules.md`](../../rules/ai/ai-safety-rules.md). Operational
> diagnosis reference: [`docs/TROUBLESHOOTING.md`](../../docs/TROUBLESHOOTING.md)
> (pnpm/corepack, Prisma generate/migrate, env-validation, Docker health, ports,
> seed). Then load the per-app `CLAUDE.md` for the area you touch. Sibling recipes:
> [`skills/qa/add-unit-test.md`](add-unit-test.md), [`skills/qa/validate-release.md`](validate-release.md),
> [`skills/qa/perform-security-review.md`](perform-security-review.md).
>
> **No band-aids.** A symptom suppressed is a bug shipped. You reproduce it, find
> the real cause, pin it with a failing test, fix the root, and prove the fix —
> without trading away tenancy, RBAC, or AI safety to make the symptom disappear.

This recipe is the safe diagnosis-and-fix loop for a bug reported in the running
AuraSpear platform: reproduce → read logs → locate the cause via the loading order
→ write a failing characterization test → fix the root → validate the gates →
document.

---

## When to use

Use this skill when something that should work is failing: a 500/404, a wrong/empty
result, a cross-tenant leak, a job stuck PENDING, an AI action that ran when it
shouldn't, a boot/migration/Docker failure, or a frontend crash. Use it whenever the
fix is to an **existing** behavior rather than a new feature.

**Do not** use this skill for: building a new feature (use the relevant add-\* skill);
a pure maintainability refactor with no bug (→ the split skills); a dependency CVE (→
[`../devsecops/upgrade-dependency.md`](../devsecops/upgrade-dependency.md)). If the
"bug" is actually a security finding, also run
[`perform-security-review.md`](perform-security-review.md).

---

## Files to inspect first (orient before you touch anything)

| Concern                                                     | Where to look                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Operational symptoms (boot, Prisma, env, Docker, ports)** | `docs/TROUBLESHOOTING.md`                                                             |
| Structured (pino) logging + credential redaction config     | `apps/api/src/app.module.ts` (pino redaction of authorization/cookie/password)        |
| The error contract (what reaches the client)                | the `GlobalExceptionFilter` + `BusinessException` (`apps/api/src/common/`)            |
| The module that owns the failing behavior                   | `apps/api/src/modules/<module>/` (controller → service → repository → utilities)      |
| Frontend symptom owner (page-hook + service + proxy route)  | `apps/web/src/hooks/use<Area>Page.ts`, `src/services/`, `src/app/api/<area>/route.ts` |
| Test pattern to pin behavior (mocked repo + logger)         | `apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts`          |
| Job-stuck-PENDING class of bug (handler must be registered) | `apps/api` jobs module `onModuleInit()` (every `JobType` needs a handler)             |

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Diagnose first; do not edit until you can
explain the cause.

### 0. Branch first (never fix on `main`)

```bash
git checkout -b fix/<area>-<symptom>
```

### 1. Reproduce deterministically

Pin down the exact inputs (tenant, role/permissions, payload, route) and a repeatable
trigger. Run the relevant stack locally:

```bash
pnpm docker:infra        # Postgres + Redis if the bug needs them
pnpm dev:api             # NestJS BFF (or pnpm dev:web for a frontend bug)
```

If you can't reproduce, you can't prove a fix. Capture the failing request/response
and the exact error message the user sees.

### 2. Read the logs (pino structured) — follow the real failure, not the symptom

The API logs structured pino JSON (`app.module.ts`), with `authorization`/`cookie`/
password fields **redacted** — do not try to "fix" logging to print a secret. Trace
the failing request: the `GlobalExceptionFilter` sanitizes outbound errors (generic
message, paths/table names stripped — rules 44, 77, 81), so the **real** cause is in
the logs/stack, not the client response. For boot/migration/env/Docker symptoms,
match the message to `docs/TROUBLESHOOTING.md` (e.g. corepack EPERM, `prisma generate`
missing engine, `JWT_SECRET` too short, container never healthy, port conflict).

### 3. Locate the cause via the loading order (understand before editing)

Follow `AGENTS.md` §1 loading order, then read the owning code path **end to end**
before changing anything (`refactor-workflow.md` §1):

- **Backend:** controller (route/guards) → service (orchestration) → repository
  (tenant-scoped Prisma) → utilities. The bug is usually one layer; common shapes:
  a repository `where` missing `tenantId` (wrong/empty results or a leak), a service
  throwing a raw exception instead of `BusinessException`, an unregistered job handler
  (PENDING forever), a missing frontend proxy route (404 HTML instead of JSON).
- **Frontend:** page-hook → service → proxy route → BFF. Common shapes: a query key
  missing `tenantId` (stale data after tenant switch), an unhandled error state, a
  missing `errors.<module>.<key>` translation rendering a raw key.

State the root cause in one sentence before you write the fix.

### 4. Write a FAILING characterization test that captures the bug

Before fixing, pin the behavior with a test that **fails today and will pass after
the fix** (`refactor-workflow.md` §3; [`add-unit-test.md`](add-unit-test.md)). Use the
mocked-repo pattern from `notifications.service.spec.ts` for a service bug; assert the
correct behavior (including the `tenantId` scoping or the expected `messageKey`). Run
it red:

```bash
pnpm --filter @auraspear/api exec jest src/modules/<module>
```

This is your proof the bug existed and that the fix actually addresses it.

### 5. Fix the root cause (not the symptom)

Change the minimal code that fixes the cause, preserving the contract (response
shape, signatures, enum values, `messageKey`s) and the invariants
(`refactor-workflow.md` §4–§5):

- Restore the missing `tenantId` in the repository `where` (the _correct_ fix for an
  empty-result/leak bug — never broaden the query to "make it return rows").
- Throw `BusinessException` with the right `messageKey` (add it to **all 6** i18n
  files if frontend-visible — rule 49) — never swallow the error or return a fake
  success.
- Register the missing job handler; add the missing proxy route; add the missing
  query-key `tenantId`.
- **Never** weaken a guard, drop `@RequirePermission`, skip redaction/approval, or add
  a `NODE_ENV`/auth bypass to make the symptom go away (`ai-safety-rules.md`,
  `rbac-rules.md`, tenant-isolation; SEC-02/SEC-04 are exactly the gaps not to widen).
- **Never** `any` / `eslint-disable` / `@ts-ignore` to silence the type that surfaced
  the bug.

### 6. Validate, then prove the fix and the deletion

Run the gates and re-run the now-passing test (step 7). If you removed code, grep for
every consumer (`refactor-workflow.md` §7; `AGENTS.md` §8).

### 7. Document

Note the root cause and fix in the PR description. If the symptom matches a recurring
operational class, add/extend the entry in `docs/TROUBLESHOOTING.md`. If a durable
convention surfaced, record it in `memory/TECHNICAL_MEMORY.md`. Record a regression
note if the bug was a previously-untested path.

---

## Validation commands (real pnpm commands, from repo root)

Run and read the output. **Never claim fixed without the failing→passing test and the
gates** (`AGENTS.md` §5, §13).

```bash
# Reproduce / iterate
pnpm docker:infra ; pnpm dev:api            # or pnpm dev:web
pnpm --filter @auraspear/api exec jest src/modules/<module>   # red before, green after

# Hard gates
pnpm --filter @auraspear/api prisma:generate
pnpm typecheck                              # HARD gate
pnpm build                                   # HARD gate

# Advisory (run + report)
pnpm test                                    # the regression test now passes
pnpm lint:strict
pnpm format:check
pnpm docker:infra:down                       # tidy infra (never docker:clean / down -v)
```

Hard gates (`typecheck`, `build`) must be green; advisory results reported, not
hidden. `tsc` is the trusted typecheck.

---

## Common mistakes

- **Band-aiding the symptom** — broadening a query to "return rows" instead of
  restoring the missing `tenantId`; catching and swallowing the error; returning a
  fake success. Fix the cause.
- **Editing before understanding** — skipping the loading-order read; you fix the
  wrong layer (`refactor-workflow.md` §1).
- **No failing test first** — you can't prove the bug existed or that the fix works
  (`refactor-workflow.md` §3).
- **Weakening security to clear the symptom** — dropping a guard / `@RequirePermission`,
  skipping redaction/approval, adding a `NODE_ENV`/auth bypass (tenant-isolation,
  `rbac-rules.md`, `ai-safety-rules.md`).
- **`any` / `eslint-disable` / `@ts-ignore`** to silence the type that exposed the bug
  (rules 1, 2).
- **Trying to log a redacted secret** to debug — pino redaction is intentional; debug
  from the structured fields and stack, not the secret.
- **Changing the response contract** (renaming a field, a different `messageKey`) while
  fixing — that breaks callers; preserve it (`refactor-workflow.md` §4).
- **Adding a `messageKey` to only `en.json`** — all 6 locale files (rule 49).
- **`docker:clean` / `docker compose down -v`** to "reset" — volume-destroying and
  forbidden as a casual step; use `pnpm docker:infra:down` (`branch-safety.md`).
- **Claiming fixed without the test + `pnpm typecheck` / `pnpm build`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `refactor-workflow.md`, `docs/TROUBLESHOOTING.md`, and the
      owning code path end to end.
- [ ] Branched (`fix/<area>-<symptom>`), not on `main`.
- [ ] Reproduced deterministically; captured the failing request + real error.
- [ ] Read the pino structured logs / matched the operational symptom; root cause
      stated in one sentence.
- [ ] Failing characterization test written (red before the fix).
- [ ] Root cause fixed (not the symptom); contract preserved; `messageKey`s in all 6
      locales if frontend-visible.
- [ ] No security/tenant/RBAC/AI-safety invariant weakened; no `any` / `eslint-disable`
      / `@ts-ignore`; no `NODE_ENV`/auth bypass.
- [ ] Test now green; `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them); advisory
      gates run and reported; consumers of any removed code re-pointed.
- [ ] Root cause + fix documented (PR description, `TROUBLESHOOTING.md` /
      `memory/TECHNICAL_MEMORY.md` if durable).
- [ ] Final response uses the `AGENTS.md` §13 report block (Branch / Commits / Files /
      Commands run / Green checks / Failed checks / Blockers / Risks / Next steps).
