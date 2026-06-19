# rules/docs/documentation-rules.md — Documentation rules (no stale docs)

> Read [`AGENTS.md`](../../AGENTS.md) first (loading order §1 + the one rule §0:
> _no AI agent may edit first and understand later_). This file is the
> authoritative hard rule for **docs as a contract**: docs must match behavior,
> link instead of duplicate, keep [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md)
> current, update INSTALL/ENVIRONMENT when setup changes, and — when a guide and
> the code disagree — **code wins**. It formalizes the `rules/docs/` scaffold that
> [`.cursor/rules/07-docs.mdc`](../../.cursor/rules/07-docs.mdc) has been the
> interim source of truth for; keep the two aligned. ADR conventions live in that
> `.mdc` §2; this file governs sync/index/setup/conflict.

Toolchain: **pnpm only** (`pnpm@10`), **Node 22** (`engines.node: ">=22 <25"`).
Markdown is Prettier-formatted (`.husky/pre-commit` formats staged `.md`; gate is
`pnpm format:check`). **Never work on `main`** — branch first
(`chore/docs-…`, `feat/…`, `fix/…`); see
[`rules/global/branch-safety.md`](../global/branch-safety.md). Related:
[`rules/global/validation-gates.md`](../global/validation-gates.md),
[`rules/global/repo-navigation.md`](../global/repo-navigation.md).

---

## 1. Docs must match behavior — change behavior, change docs in the same change

A code/config change that leaves its docs describing the old behavior is an
**incomplete change**, not a follow-up. Update the doc in the **same** branch/PR.
Map the change to the doc(s) it touches before you commit:

| You changed…                                           | Update (same change)                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| API endpoint / Next.js `app/api/**` proxy route        | [`docs/API.md`](../../docs/API.md)                                                                |
| Layering / module structure                            | [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (+ `docs/architecture/`)                     |
| AI governance / provider cascade / memory              | [`docs/AI.md`](../../docs/AI.md) (+ `docs/ai/`) and `memory/AI_MEMORY.md`                         |
| Auth / RBAC / tenancy / secrets / connector encryption | [`docs/SECURITY.md`](../../docs/SECURITY.md) (+ `docs/security/`) and `memory/SECURITY_MEMORY.md` |
| New/renamed/removed env var                            | `docs/ENVIRONMENT.md` **and** the `*.env.example` files — see §4                                  |
| Install / run / deploy / ops                           | `INSTALL.md`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/TROUBLESHOOTING.md` — see §4      |
| New pnpm script / command                              | `memory/COMMANDS_MEMORY.md` **and** AGENTS.md §4 command map                                      |
| Product / feature scope                                | [`docs/PRODUCT.md`](../../docs/PRODUCT.md), [`docs/ROADMAP.md`](../../docs/ROADMAP.md)            |
| An ESLint-enforced / numbered rule                     | the numbered list in `apps/api/CLAUDE.md` (#1–100) or `apps/web/CLAUDE.md` (#1–63)                |

- **The enforced rule list lives in the app `CLAUDE.md` files**, not in `docs/`.
  When you add or change a numbered rule, update that list — and if it is an
  AI-onboarding rule, the mirror under `rules/` and the matching
  `.cursor/rules/*.mdc`.
- **Docs don't replace i18n.** A new `messageKey` or user-facing string still
  needs all 6 locale files (`en, ar, es, fr, de, it`) per `apps/api/CLAUDE.md`
  #49 / `apps/web/CLAUDE.md` rule on translations; docs only describe it.
- **Docs never weaken an invariant.** A doc that implies you can skip auth, tenant
  scoping (`tenantId` on every tenant-owned query/`update`/`delete`),
  `@RequirePermission`, AES-256-GCM connector-secret encryption, or AI
  approval-gating is wrong by construction — those bypasses do not exist
  (AGENTS.md §6–7; api `CLAUDE.md` #23, #25, #26, #56). If a doc contradicts an
  invariant, the **invariant wins and the doc is the bug** — fix the doc.

## 2. Link, do not duplicate

One fact, one home. Duplicated prose goes stale in one copy and lies.

- **Don't copy** an invariant, command, env table, or rule into a second doc —
  **link** to its single source by relative path. Canonical homes: invariants →
  AGENTS.md §6–7 + `rules/security/`, `rules/ai/`; commands →
  `memory/COMMANDS_MEMORY.md` + AGENTS.md §4; gates →
  [`rules/global/validation-gates.md`](../global/validation-gates.md); env →
  `docs/ENVIRONMENT.md`; enforced rules → the app `CLAUDE.md` files.
- **Reference siblings by relative path**, never re-explain them: `rules/`,
  `skills/`, `memory/`, `context/`, `docs/`, `.claude/agents/`. Point at where a
  rule is _enforced_ (CLAUDE.md rule number, ESLint rule, ADR), don't restate it.
- If two docs genuinely need the same paragraph, that paragraph belongs in **one**
  place and both link to it. When you catch a duplicate, collapse it to a link.
- Internal links must resolve — **no broken or forward-dangling links**. If you
  cite a doc, it must exist; if it doesn't, create it or fix the link.

## 3. Keep `docs/DOCS_INDEX.md` current

[`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) is the central map AGENTS.md §12
points to. It already exists — keep it accurate (older `.cursor/rules/07-docs.mdc`
text calling it "does not exist yet" is stale; fix that line if you touch it).

- **New top-level doc** (`docs/*.md`, a new `docs/<area>/` dir, a new ADR, or a new
  `rules/` / `skills/` / `memory/` / `context/` file worth surfacing) → add it to
  `DOCS_INDEX.md` in the right section in the **same** change.
- **Renamed or removed doc** → update or drop its `DOCS_INDEX.md` entry and every
  inbound link, so the index never points at a dead path.
- The index lists `rules/` areas (`global, frontend, backend, security, ai,
testing, docs`) and `skills/` areas — when you add a new area or a notable file,
  reflect it there.

## 4. Update INSTALL / ENVIRONMENT when setup changes

Setup docs are load-bearing for onboarding and CI; a wrong one breaks a new clone.

- **Env vars** — adding/renaming/removing one is a multi-file change, never just a
  doc edit. Touch, in one change: the var's usage, the enforced Zod schema
  `apps/api/src/config/env.validation.ts` (fail-loud at boot, no fallback/default
  secrets — AGENTS.md §6; api `CLAUDE.md` #24, #53), the relevant `*.env.example`
  template (root, `apps/api/`, `apps/web/` — **`*.example` only, never a real
  secret**), `docs/ENVIRONMENT.md`, and Docker compose / CI if referenced. Follow
  the canonical recipe `skills/devsecops/add-env-variable.md` (AGENTS.md §11).
  `docs/ENVIRONMENT.md` is **authoritative** over the imperfect `pnpm audit:env`
  grep (R6).
- **Install / run / build** — if the steps, prerequisites (pnpm version, Node 22),
  scripts, or order change, update `INSTALL.md` (root) and the per-app
  `apps/api/INSTALL.md` / `apps/web/INSTALL.md`, plus `docs/DEPLOYMENT.md` /
  `docs/OPERATIONS.md` / `docs/TROUBLESHOOTING.md` for deploy/ops impact. The
  command map in AGENTS.md §4 and `memory/COMMANDS_MEMORY.md` must agree with the
  actual root `package.json` scripts.

## 5. Code wins — guides yield to behavior

When a guide and the code conflict, the **code is the source of truth**; the doc
is the defect. (Exception: a doc that contradicts a **security/AI invariant** —
there the invariant wins and the _code_ is the bug; see §1.)

- **Verify before you write.** Every concrete claim — file path, command, script,
  env var, endpoint, permission key, rule number — must be true against the
  current repo. `Grep`/`Glob` it; if you cite it, it exists. A wrong doc is worse
  than a missing one.
- **Found a stale doc?** Fix it forward to match real behavior in the same change —
  don't leave it, don't "document around" it, and don't change the code to match a
  wrong doc.
- **Prove before you delete from a doc** (AGENTS.md §8). Before removing a
  documented file/dep/env/route/command/permission, confirm it is actually gone
  from code, `app/api/**` proxy routes, Docker, CI, Prisma + seed, tests, and
  `*.env.example`. A backend endpoint usually has a matching `app/api/.../route.ts`
  proxy; a permission spans 8–10 files end-to-end (api `CLAUDE.md` #85 / web rule
  #34) — don't delete one leg and orphan the doc for the others. If you can't prove
  it's gone, don't delete the line.

## 6. Style — practical, scannable, enforceable

- Match the house style of existing docs and `.cursor/rules/*.mdc`: ATX `#`
  headings, short scannable bullets, fenced code blocks with a language, relative
  links. No fluff, no marketing copy in technical docs.
- **Cite paths, not vibes.** State a rule, then point to where it's enforced.
- Markdown must pass `pnpm format:check` (Prettier: `lf`, print width 100,
  `es5` trailing commas). Don't hand-format tables Prettier will rewrite — run
  `pnpm format`.

## 7. Branch & validate before claiming done

- Branch first; never run destructive commands unless required **and** documented
  (`rules/global/branch-safety.md`).
- A docs-only change still runs `pnpm format:check` (and `pnpm typecheck` if you
  edited code samples that compile). **Never say "all green" unless the required
  gate actually passed** — the `qa-gatekeeper` subagent rejects claims without
  command output (`rules/global/validation-gates.md`). Close with the AGENTS.md
  §13 report block; list the exact docs in `Files updated:`.

---

## Where to go next

- **Interim/peer source of truth:** [`.cursor/rules/07-docs.mdc`](../../.cursor/rules/07-docs.mdc)
  (ADR format §2; keep aligned with this file).
- **Stable truths:** `memory/PROJECT_MEMORY.md`, `memory/DECISIONS_MEMORY.md`,
  `memory/COMMANDS_MEMORY.md`.
- **Hard rules:** [`rules/global/branch-safety.md`](../global/branch-safety.md),
  [`rules/global/validation-gates.md`](../global/validation-gates.md), plus the
  area rule you changed (`rules/backend`, `rules/frontend`, `rules/security`,
  `rules/ai`, `rules/testing`).
- **Recipes:** `skills/docs/*` (scaffold); the per-task skill you ran (e.g.
  `skills/backend/add-endpoint.md`, `skills/devsecops/add-env-variable.md`) names
  the doc it changes.
- **Reference docs:** [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md),
  `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/AI.md`, `docs/SECURITY.md`,
  `docs/ENVIRONMENT.md`, `INSTALL.md`, `docs/decisions/`. Full enforced law:
  `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`.
- **Delegate:** `.claude/agents/rules-skills-memory-agent`, `repo-archaeologist`
  (verify a claim before writing it), `qa-gatekeeper`.

> If a rule here conflicts with a request, the rule wins. Stop and surface it.
