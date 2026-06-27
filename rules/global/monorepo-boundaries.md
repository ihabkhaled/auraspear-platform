# Monorepo boundary rules — dependency direction, no cycles, one contract

> **Read `AGENTS.md` first** (repo root) for the AI loading order and §3 (the
> monorepo map). The authoritative architecture doc is
> `docs/architecture/MONOREPO.md`; the evidence-based posture is
> `docs/audit/architecture-clean-code-audit.md` §3. GOD MODE §4.3 (dependency
> direction) is the source. This file is the **hard constraint** version.

The repo is a pnpm + Turborepo workspace:

```
apps/web      Next.js 16 / React 19      (@auraspear/web)
apps/api      NestJS 11 / Prisma 7       (@auraspear/api)
packages/shared  cross-app contracts     (@auraspear/shared)  — scaffolded
packages/ai      provider-free AI logic  (@auraspear/ai)
packages/config  tooling presets         (@auraspear/config)
```

A boundary violation is an architecture break even if it typechecks. The
dependency direction is currently **correct** (audit §3: zero `apps → packages`
cycle, zero `apps → apps` imports, no cycles) — keep it that way.

Related: `solid-rules.md` §DIP (depend on the shared contract),
`library-wrapper-rules.md` (wrap externals), `clean-code-rules.md` §6 (DRY /
one source of truth), `file-organization-rules.md`.

---

## 1. Dependency direction is one-way: apps → packages

- **Apps MAY import packages.** `apps/web` and `apps/api` may depend on
  `@auraspear/{shared,ai,config}`. Wire them as `"@auraspear/shared":
"workspace:*"` so pnpm links the local source (`docs/architecture/MONOREPO.md`
  §2).
- **Packages MUST NOT import apps.** Nothing under `packages/*/src/**` may import
  from `apps/web` or `apps/api`. Packages are the shared foundation; they cannot
  know about their consumers. (Verified: zero `apps/*` imports inside `packages/*`
  — audit §3.)
- **Apps MUST NOT import each other.** `apps/web` never imports from `apps/api`
  and vice-versa. `apps/web` talks to `apps/api` only over HTTP via the proxy
  routes (`apps/web/CLAUDE.md` rule 33; `../frontend/api-client-rules.md`), never
  by importing its TypeScript.
- **`packages/ai` stays dependency-free / SDK-free.** It is a provider-agnostic
  safety layer (`redaction.ts`, `safety.ts`, `model-router.ts`, `evaluators.ts`,
  `prompts.ts`). Never import a vendor SDK (`@aws-sdk/*`, `openai`, …) into it —
  provider SDKs belong in the api's connector adapters
  (`../backend/integration-rules.md`).

## 2. No cycles, ever

- **`import-x/no-cycle` (maxDepth 4)** is enabled in both apps' ESLint configs
  (`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` import rules). A circular import is
  a violation even at `warn` level — break it by extracting the shared piece to
  its home file (`file-organization-rules.md`) or to `packages/shared`.
- The package layer must form a DAG: a package may depend on another package only
  in one direction, never back. Today `packages/ai` is standalone — keep new
  shared logic from creating a `shared ↔ ai` cycle.

## 3. Current reality — packages are scaffolded, not yet consumed

This is **documented, deliberate deferral**, not a defect (audit PKG-04;
`packages/shared/src/index.ts` states it openly; `docs/architecture/MONOREPO.md`
§2). Encode the truth so no agent "fixes" a non-bug or assumes a package is live:

- **Neither app declares `@auraspear/shared`, `@auraspear/ai`, or
  `@auraspear/config` in its `dependencies` yet.** There are **zero**
  `@auraspear/*` runtime imports in `apps/*/src/**` today. The Turborepo `^build`
  edge is therefore a no-op until an app is wired in.
- **`@auraspear/shared` is a ~19-line placeholder**; both apps still own their
  own copies of contracts (enums, types, permissions) pending the R4 contract-
  consolidation milestone (`docs/audit/02-risk-register.md` R4).
- When you **do** wire a package in, follow `../../skills/devsecops/upgrade-dependency.md`,
  add the `workspace:*` dep, and run the full gates (`validation-gates.md`).

## 4. The consolidation target — `AiActionCategory` (PKG-01)

The highest-value boundary fix, called out so agents converge on one direction:

- **`apps/api/src/common/enums/ai-feature.enum.ts` (L39) and
  `packages/ai/src/safety.ts` (L9) both define `AiActionCategory` — with
  different string values.** The api uses **underscores**
  (`'analysis_only'`, `'approval_required'`, …); the package uses **hyphens**
  (`'analysis-only'`, `'approval-required'`, …). The frontend governance UI
  expects the hyphen form (`apps/web/CLAUDE.md` rule 44). This is a **correctness
  landmine**: the two serialize differently, so data crossing the boundary
  silently mismatches (audit PKG-01).
- **Do not add a third copy.** When this is consolidated, `packages/ai` becomes
  the single source for the category enum + approval/cascade contract and
  `apps/api` imports it (reconciling the string values in a migration-aware way).
  Until then, never introduce a new divergent copy, and be aware which vocabulary
  a given surface uses. See `library-wrapper-rules.md` and
  `../ai/ai-safety-rules.md`.

## 5. `packages/config` manifest must match disk

- `packages/config/package.json` `files`/`exports` must list only directories
  that exist (today: `tsconfig/`, `prettier/`). Declaring `eslint/` or
  `tailwind/` presets that do not exist is a dishonest manifest (audit PKG-02) —
  add the preset or drop the entry (`file-organization-rules.md`).

---

## Self-check before you commit a cross-package change

- [ ] Direction is apps → packages only: no `packages → apps` import, no
      `apps ↔ apps` import.
- [ ] No new import cycle (`import-x/no-cycle` clean); shared logic moved to its
      home file or `packages/shared`.
- [ ] `packages/ai` stayed SDK-free / dependency-free.
- [ ] If a package was wired into an app: added `workspace:*` dep, ran full gates,
      followed the upgrade-dependency skill.
- [ ] Did not create a new divergent copy of a contract (esp. `AiActionCategory`);
      reused the single source where one exists.
- [ ] Gates green (`validation-gates.md`); branched first (`branch-safety.md`);
      proved before deleting any package file/export (`AGENTS.md` §8).
