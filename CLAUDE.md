# CLAUDE.md — Claude Code rules for AuraSpear

> **Inherits from [`AGENTS.md`](AGENTS.md). Read `AGENTS.md` first** (loading
> order, monorepo map, command map, security/AI invariants, branch safety).
> This file adds Claude-specific behavior. The deep per-app conventions live in
> [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) and [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md)
> — load the one for the app you are editing.

## The one rule

**No AI agent may edit first and understand later.** Follow `AGENTS.md` §1
loading order before any edit.

## When to delegate to a subagent (`.claude/agents/`)

Delegate when the work is specialized, multi-step, or read-heavy across many
files. Stay in the main context for small, single-file, well-understood edits.

| Situation                                     | Subagent                           |
| --------------------------------------------- | ---------------------------------- |
| "Where does X live / what exists?"            | `repo-archaeologist`               |
| Coordinate a multi-part task, demand evidence | `orchestrator`                     |
| Frontend feature in `apps/web`                | `frontend-architect`               |
| Backend module/endpoint in `apps/api`         | `backend-architect`                |
| Prisma schema / migration / seed              | `database-prisma-agent`            |
| AI feature / `packages/ai` / ai modules       | `ai-platform-agent`                |
| Deps / TypeScript / tsgo / upgrades           | `dependency-modernization-agent`   |
| Security / Trivy / secrets / Docker / CI      | `devsecops-security-agent`         |
| Install / DX / env / doctor                   | `dx-install-agent`                 |
| rules/skills/memory/context consistency       | `rules-skills-memory-agent`        |
| Product / business docs                       | `product-business-analyst`         |
| **Verify a claim / gate a release**           | `qa-gatekeeper` (strict, no edits) |

Launch independent subagents in parallel (one message, multiple tool uses).
When several subagents could touch the same files, sequence them or use
worktree isolation.

## Evidence requirements (non-negotiable)

- **Never claim a command passed unless you ran it** and saw the output.
- Quote the real command + its result. "Should pass" / "looks fine" is not
  evidence.
- The `qa-gatekeeper` and `orchestrator` will reject work without command output.
- For CI: confirm with `gh pr checks` / `gh run view`, not assumptions.

## Validation behavior

Before saying a task is done, run the gates that apply (`AGENTS.md` §5):

```bash
pnpm typecheck          # hard gate
pnpm build              # hard gate
pnpm lint               # advisory (pre-existing debt; see docs/audit/02-risk-register.md)
pnpm format:check       # advisory
pnpm test               # advisory
```

Hard gates must be green. Advisory failures must be reported, not hidden.
`tsc` is the trusted typecheck; `tsgo` (`pnpm typecheck:fast`) is advisory only.

## Harness / environment notes

- Windows host; primary shell is PowerShell, but a Bash tool is available — use
  POSIX syntax in Bash, PowerShell syntax in PowerShell. Do not mix.
- `corepack enable` may hit EPERM on Windows (Program Files); standalone pnpm
  works. See `docs/TROUBLESHOOTING.md`.
- The repo has a husky `pre-commit` (lint-staged → Prettier) and `commit-msg`
  (commitlint, conventional commits). Use conventional commit messages.

## Final answer checklist (every task)

End with the `AGENTS.md` §13 block:

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

- [ ] Read `AGENTS.md` + relevant memory/context/rules/skills before editing.
- [ ] Worked on a branch, not `main`.
- [ ] No `any`, no eslint-disable, no secrets, no auth/tenant/permission bypass.
- [ ] Tenant-owned queries scoped by `tenantId`; mutations audited.
- [ ] AI changes respect approval policy; no raw AI HTML.
- [ ] Docs updated if behavior changed (`rules/docs/documentation-rules.md`).
- [ ] Ran the gates and reported real results.
