# Refactor workflow — the safe procedure for changing code without changing behavior

> **Read `AGENTS.md` first** (repo root) — §1 loading order and the one rule:
> _no AI agent may edit first and understand later._ A refactor that breaks
> behavior, a contract, or a security invariant is a regression, not a cleanup.
> GOD MODE §16 (safe refactor) is the source. This file is the **hard
> procedure** for AuraSpear.

A refactor changes the **shape** of code while preserving its **behavior**.
The clean-code/SOLID targets live in `clean-code-rules.md` and `solid-rules.md`;
this file is _how_ you reach them without regressing. The known refactor targets
(god hooks FE-02/FE-03, god services BE-03, the PKG-01 contract divergence) are
in `docs/audit/architecture-clean-code-audit.md`.

---

## 1. Understand before you touch (AGENTS.md loading order)

- **Read `AGENTS.md` §1, then the relevant memory/context/rules/skills, then the
  code** — in that order — before editing (`AGENTS.md` §1, §10). Identify the
  unit's responsibilities, callers, and contracts first.
- **Know the contract you must preserve:** the HTTP response shape, the function
  signature, the enum string values, the error `messageKey`, the
  permission/tenant scoping. If callers depend on it, it is frozen by the
  refactor.

## 2. Branch first

- **Never refactor on `main`** — branch (`chore/…`, `refactor/…`)
  (`AGENTS.md` §8; `branch-safety.md`). Large refactors that may touch shared
  files benefit from worktree isolation so parallel agents don't collide.

## 3. Characterization tests BEFORE the refactor

- **Pin current behavior with tests first.** Write or run characterization tests
  that capture what the code does **today** (including quirks) before you change
  it — they are your safety net that behavior didn't drift
  (`../testing/test-strategy.md`, `../../skills/qa/add-unit-test.md`).
- If the area has no tests (e.g. `packages/ai` ships safety logic with zero
  tests — audit PKG-03), **add them before refactoring**, especially for pure,
  easily-testable logic like `evaluateApproval`/`redact`. Backend services are
  covered via e2e; pure utilities and guards via unit tests
  (`apps/api/CLAUDE.md` "Testing"; `../testing/test-strategy.md`).
- A new frontend page route still needs its Playwright states (loaded / empty /
  error / responsive) intact after the move (`apps/web/CLAUDE.md` rule 48).

## 4. Refactor in small, behavior-preserving steps

- **Extract, don't rewrite.** Move logic to its home file
  (`file-organization-rules.md`): inline utility → `<module>.utilities.ts` /
  `src/lib/`; inline hook logic → `src/hooks/`; inline type/enum/const → its
  home. The split patterns to copy: the `cases` module decomposition (backend god
  service) and the Knowledge hooks split (frontend god hook) — audit §4.
- **Preserve the contract at every step.** Same inputs → same outputs, same
  errors, same `messageKey`s, same enum values. Re-run the characterization tests
  after each step.
- **Respect the layering you're refactoring within.** A backend extraction keeps
  Controller → Service → Repository → Utilities intact (no Prisma in services —
  `../backend/layering-rules.md`); a frontend extraction keeps `.tsx`
  render-only (`../frontend/component-rules.md`).

## 5. Never weaken a security/AI invariant while cleaning up

A refactor is never a license to drop a guard. These survive every refactor:

- **Tenancy:** every tenant-owned query/`update`/`delete` stays scoped by
  `tenantId` (`../security/tenant-isolation.md`; `apps/api/CLAUDE.md` rules 8,
  26). The SEC-03 cleanup (repo `update`/`delete` keyed by `id` alone) is itself
  a behavior-preserving hardening — do not undo it.
- **RBAC:** every endpoint keeps `@RequirePermission(...)`
  (`../security/rbac-rules.md`; rule 25). Don't drop a decorator during a move
  (the guard fails open without it — SEC-04).
- **AI safety:** approval-required actions keep their persisted-approval gate and
  redaction; never render raw AI HTML (`../ai/ai-safety-rules.md`; rule 97).
- **No new `any`, no `eslint-disable`, no secrets** (`clean-code-rules.md`).

## 6. Validate against the gates (hard vs advisory)

Run the gates from the repo root (`AGENTS.md` §5; `validation-gates.md`):

```bash
pnpm typecheck          # HARD gate — must be green (tsc, the trusted check)
pnpm build              # HARD gate — must be green
pnpm lint:strict        # advisory (report failures, never hide)
pnpm test               # advisory — must still pass the characterization tests
pnpm format:check       # advisory
```

- **Hard gates (`typecheck`, `build`) must pass.** Advisory failures must be
  **reported, not hidden** (`AGENTS.md` §5).
- **Never claim green without running it** (`AGENTS.md` §13; the `qa-gatekeeper`
  rejects unproven claims).

## 7. Prove the deletion

- **Before removing the old code/file/export, audit every consumer** — imports,
  proxy routes, Docker, CI, Prisma, seed, tests, docs, `*.example`
  (`AGENTS.md` §8). State the evidence in your report. A refactor that leaves a
  dangling import or a 404'd proxy route is incomplete.

---

## Self-check before you call a refactor done

- [ ] Read AGENTS.md loading order + the unit's contract before editing.
- [ ] Branched (not `main`); isolated if it touches shared files.
- [ ] Characterization tests existed/were added and still pass — behavior
      unchanged.
- [ ] Refactored by extraction into home files; layering preserved; contracts
      (signatures, response shapes, enum values, `messageKey`s) intact.
- [ ] Tenancy / RBAC / AI-safety invariants untouched; no new `any` /
      `eslint-disable` / secret.
- [ ] `pnpm typecheck` + `pnpm build` green (ran them); advisory results reported.
- [ ] Every consumer of removed code re-pointed/verified; deletion evidence in
      the report.
- [ ] Linked skills used: `../../skills/backend/add-module.md` (backend split
      shape), `../../skills/frontend/add-hook.md` / `add-component.md` (frontend
      split), `../../skills/qa/add-unit-test.md`.
