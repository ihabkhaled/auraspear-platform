# rules/global/branch-safety.md — Branch & destructive-change safety

> Read [`AGENTS.md`](../../AGENTS.md) first (loading order + the one rule: _no AI
> agent may edit first and understand later_). This file is the authoritative
> expansion of **`AGENTS.md` §8 (Branch & safety rules)**. It governs how you use
> git and Docker: where you commit, what you may never run unasked, and the
> "prove before delete" discipline. A change that violates any rule here is wrong
> even if it typechecks and builds.

Toolchain reminder: **pnpm only** (`pnpm@10.30.3`), **Node 22** (`engines.node:
">=22 <25"`), Turborepo. Never substitute `npm`/`yarn` at the root
(`ADR-0001`, `ADR-0002`). Related: `absolute-rules.md` §7, `validation-gates.md`,
`repo-navigation.md` ("Navigation guardrails").

---

## 1. Never work on `main`

- **Never commit, edit, or push directly to `main`.** Branch first, always —
  this is `AGENTS.md` §8 and is non-negotiable. The default branch is `main`;
  the git start state may show `master` as the local current branch — confirm
  with `git status` / `git branch --show-current` and **branch off before your
  first edit**, not after.
- **One branch per task.** Don't pile unrelated work onto an existing branch.
- **Create the branch before editing**, e.g.:
  ```bash
  git switch -c feat/<area>-<short-desc>   # from an up-to-date main
  ```

## 2. Branch naming

Use a **type prefix + kebab-case description** that matches the commit-type
convention already enforced here (`@commitlint/config-conventional` is installed
at the root). `AGENTS.md` §8 lists the prefixes:

| Prefix    | Use for                                             |
| --------- | --------------------------------------------------- |
| `feat/…`  | new feature / endpoint / page / capability          |
| `fix/…`   | bug fix                                             |
| `chore/…` | tooling, deps, config, scaffolding, docs-only infra |

- Examples: `feat/cases-bulk-close`, `fix/auth-refresh-replay`,
  `chore/upgrade-prisma`. Other conventional types (`refactor/`, `docs/`,
  `test/`, `ci/`) are acceptable when they fit better — keep the
  `type/kebab-description` shape.
- Lowercase, hyphen-separated, no spaces, no PascalCase, no ticket-only names
  like `JIRA-123` with no description.

## 3. Commit & push discipline

- **Commit/push only when the user asks.** Don't auto-push. Don't open a PR
  unless requested.
- **Conventional Commit messages** (`type(scope): subject`), e.g.
  `feat(cases): add bulk close endpoint` — commitlint config is present and
  expects this shape.
- Pre-commit hooks run on **staged files only** (Husky + lint-staged →
  ESLint + `tsc --noEmit` + Prettier, per each app's `CLAUDE.md`). Passing the
  hook is **not** the full gate — the repo-wide hard gates in
  `validation-gates.md` still apply. **Never** bypass hooks (`--no-verify`)
  unless the user explicitly asks.
- **Prefer a new commit over amending**; never rewrite or force-push shared
  history. History was deliberately flattened for this repo and the original
  per-file history lives upstream (`ADR-0003`) — do not attempt to rewrite or
  graft it.

## 4. No destructive git/docker commands without documented approval

Per `AGENTS.md` §8: never run a destructive command **unless it is explicitly
required and documented**. "Documented" means the user asked for it (or a skill
step calls for it) **and** you state in your final report exactly what you ran
and why. When unsure, **stop and ask** — surface it as a blocker, don't guess.

**Git — do not run unasked:**

| Command                                            | Why it's dangerous                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `git reset --hard`                                 | discards uncommitted work irreversibly                              |
| `git clean -fd` / `-fdx`                           | deletes untracked files (incl. local `.env`, generated artifacts)   |
| `git checkout -- <path>` / `git restore` (discard) | overwrites local changes                                            |
| `git push --force` / `--force-with-lease`          | rewrites remote history                                             |
| `git rebase -i` / history rewrites                 | not supported in this environment and rewrites history (`ADR-0003`) |
| `git branch -D`                                    | force-deletes a branch with unmerged work                           |

**Docker — know which scripts destroy data** (root `package.json` scripts):

| Script                       | Expands to                           | Data impact                                               |
| ---------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `pnpm docker:down`           | `compose … down`                     | safe — stops containers, **keeps volumes**                |
| `pnpm docker:infra:down`     | `compose -f …infra.yml down`         | safe — keeps volumes                                      |
| `pnpm docker:clean`          | `compose … down -v --remove-orphans` | **DESTRUCTIVE** — `-v` deletes the Postgres/Redis volumes |
| raw `docker compose down -v` | —                                    | **DESTRUCTIVE** — same; named in `AGENTS.md` §8           |

- **DB-volume deletion (`-v` / `docker:clean`) requires explicit approval.** It
  wipes local Postgres/Redis data (and any seeded tenants/users). Never run it
  to "fix" a container problem without the user agreeing to lose the data.
- `docker:rebuild` (`up … --force-recreate`) recreates containers but **keeps
  volumes** — acceptable for normal iteration.

## 5. Preserve existing work — read, merge, improve, link

`AGENTS.md` §8: _preserve existing work — read, merge, improve, link; don't
blindly overwrite._

- Before changing a file, **read it** (the one rule: understand before editing).
- **Merge into** existing rules/skills/memory/docs and **cross-link** them
  (relative paths to `rules/`, `skills/`, `memory/`, `context/`, `docs/`,
  `.claude/agents/`) instead of replacing or duplicating content.
- Don't clobber someone's in-progress branch or uncommitted changes. If you find
  unexpected local modifications, stop and report rather than reset them away.
- When a `Write` would overwrite a non-trivial existing file, treat that as a
  merge task, not a fresh write.

## 6. Prove before you delete

`AGENTS.md` §8: _prove before removing files/deps/env vars._ Deletion is the
highest-risk edit — a removed export, route, env var, or migration can break the
build, CI, Docker, or a tenant's data silently. **Never delete on a hunch.**

Before removing a **file, export, dependency, env var, Prisma model/field,
migration, seed entry, or `*.example` line**, search every consumer and record
the evidence in your report:

- **Code & imports** — `Grep` the symbol/path across `apps/web/src` and
  `apps/api/src` (and `packages/*`). Mind barrels: `@/components`, `@/services`,
  `@/hooks`, `@/stores`, `@/types`, `@/enums` (web) and `@/*` (api).
- **Frontend ⇄ backend wiring** — a backend endpoint usually has a matching
  `apps/web/src/app/api/.../route.ts` proxy (`proxyToBackend()`); a permission
  spans 8–10 files end-to-end (`apps/api/CLAUDE.md` rule 85 /
  `apps/web/CLAUDE.md` rule 34). Don't delete one leg and orphan the others.
- **Env vars** — grep usage **and** `config/env.validation.ts` (api),
  `.env.example` files, `docs/ENVIRONMENT.md`, Docker compose, and CI. Removing a
  validated var can make the app fail loudly at startup (by design).
- **DB** — removing a model/field needs a Prisma migration and a seed review;
  never drop a column without one (`apps/api/CLAUDE.md` rule 30).
- **Infra/CI/docs** — check `infra/docker/`, `.github/workflows/`, and any
  `docs/**` / `memory/**` that reference the thing.
- **i18n** — a removed `messageKey` must be removed (or kept) consistently across
  **all 6 locale files** (`apps/api/CLAUDE.md` rule 49).

If you cannot prove a thing is unused, **do not delete it** — flag it as a
follow-up in your report instead.

---

## When in doubt

Stop and surface a **blocker** (per the `AGENTS.md` §13 final-response block:
fill _Branch / Commands run / Blockers / Risks_). Branching wrong, force-pushing,
running `-v`, or deleting unproven code are not recoverable by "looks done" — ask
first. See `absolute-rules.md` §7 and `validation-gates.md` for the gates your
branch must still pass before it's done.
