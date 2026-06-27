# CODEX.md — Codex / GPT rules for AuraSpear

> **Inherits from [`AGENTS.md`](AGENTS.md). Read `AGENTS.md` first.** This file
> adds Codex/GPT-specific discipline. Per-app deep conventions:
> [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md), [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).

## The one rule

**No AI agent may edit first and understand later.** Use the `AGENTS.md` §1
loading order: `AGENTS.md` → `memory/` → `context/` → `rules/` → `skills/` →
`docs/` + code → then edit.

## How to use this repo's brain

- **`rules/`** — hard constraints. Load `rules/global/*` always, then the area
  (`rules/frontend`, `rules/backend`, `rules/security`, `rules/ai`,
  `rules/testing`, `rules/docs`).
- **`skills/`** — step-by-step recipes. Find the matching skill before coding a
  new page/endpoint/permission/env var/AI feature (`skills/**`).
- **`memory/`** — stable truths (`PROJECT/BUSINESS/TECHNICAL/SECURITY/AI/
DECISIONS/COMMANDS_MEMORY.md`). Do not put task notes here.
- **`context/`** — per-area onboarding (`context/*_CONTEXT.md`): where files
  live, which rules/skills/docs apply, common mistakes, validation commands.
- **`docs/audit/`** — the §16.1 audit set (`README.md` maps it): architecture/
  clean-code, ESLint hardening, testing/coverage, security/performance, and
  AI-docs/rules audits with the prioritized remediation roadmap. Before
  refactoring read `rules/global/refactor-workflow.md` and the matching
  remediation skill (`split-god-service`, `split-large-react-component`,
  `harden-eslint`, `perform-security-review`, `perform-performance-review`).

## Patch discipline

- Make the **smallest correct change**. Match the surrounding code style.
- One logical change per commit; conventional commit messages (commitlint is
  enforced by the `commit-msg` hook). Example: `feat(api): add cases export`.
- Branch first (`feat/...`, `fix/...`, `chore/...`); never commit to `main`.
- Preserve existing work — read, merge, improve, link. Do not blindly overwrite.
- Prove before removing files, deps, or env vars (search code, Docker, CI, docs,
  Prisma, seed, tests, examples).

## No fake work, no fake green

- **No fake background work.** Do not say a long task is "running" if it is not.
- **No fake green.** Do not say a gate passed unless you ran it and saw success.
  Report advisory failures honestly. "Should work" is banned.
- For CI status, check it (`gh pr checks`, `gh run view`) — do not assume.

## Exact command + reporting expectations

Run and report the real output of the gates that apply:

```bash
pnpm install --frozen-lockfile
pnpm typecheck      # hard gate (tsc) — must pass
pnpm build          # hard gate — must pass
pnpm lint           # advisory (pre-existing debt)
pnpm format:check   # advisory
pnpm test           # advisory
pnpm audit --audit-level=low   # advisory
```

`tsc` is the source of truth for typechecking. `tsgo` (`pnpm typecheck:fast`) is
fast/experimental and advisory only — never the sole blocking gate.

## Security & AI invariants (summary — full list in AGENTS.md §6–7)

- Tenant isolation, RBAC (`@RequirePermission`), no auth bypass, no committed/
  fallback secrets, connector secrets encrypted, mutations audited.
- AI analyzes/suggests; destructive actions are approval-required + permissioned;
  never render raw AI output as HTML; AI memory is tenant-scoped and secret-free.

## Final response format

End every task with the `AGENTS.md` §13 block (Branch / Commits / Files created /
Files updated / Commands run / Green checks / Failed checks / Blockers / Risks /
Next steps). Do not hide failures.
