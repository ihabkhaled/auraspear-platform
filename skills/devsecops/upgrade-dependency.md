# Skill: Upgrade a dependency safely

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the
> command map (§4), **§5 "Validation gates"** (_"Never claim 'all green' unless the
> required gates actually passed — run them"_), **§6 Security invariants**, and
> **§8 Branch & safety** (_"Never work directly on `main`"_, _"Prove before removing
> files/deps/env vars"_, _"Never run destructive commands … unless explicitly
> required and documented"_). Then read the hard constraint this skill executes:
> [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
> (pnpm-only/one-lockfile §1, scan gates §2, **patch/minor first, majors via ADR
> §3**, prove-before-remove §4, document-exceptions §5). Supporting rules/docs:
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md) (toolchain,
> destructive-command discipline),
> [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md) (when/how to write an
> ADR), and the inventory you must keep current →
> [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md).
> Sibling onboarding: [`skills/`](../) (notably
> [`run-security-scan.md`](./run-security-scan.md)),
> [`rules/`](../../rules/) (especially [`rules/security/`](../../rules/security/)),
> [`memory/`](../../memory/) (commands →
> [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md), decisions →
> [`DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/).
>
> **No AI agent may edit first and understand later.** A dependency is a
> supply-chain attack surface on a multi-tenant SOC platform — treat every bump as
> a security change, not a chore. Some version skew here is **deliberate and
> documented** (api on Zod 3, web on Zod 4; `tsgo` advisory-only). Do not "align" a
> pin without reading why it exists. **pnpm is the only package manager**, Node 22,
> one committed lockfile.

This recipe upgrades a dependency the safe way: take the **smallest** version step
that clears the need (patch/minor, or a pnpm `overrides` pin for a transitive),
keep **framework majors** out of drive-by changes (own branch + ADR + PR), change
**one batch at a time**, **re-validate** (`pnpm typecheck` + `pnpm build` +
`pnpm test`), **commit the regenerated `pnpm-lock.yaml`**, and keep
[`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md) and the
vulnerability tracker in sync. The wiring already in the repo is your template —
copy it.

There are **three** kinds of upgrade. Decide which one you have _before_ you touch
anything:

| Kind                              | When                                                                                                                   | Where the change lands                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **A. Direct patch/minor**         | bump a package you declare, within the same major (e.g. `next 16.1.x → 16.2.x`)                                        | the workspace `package.json` (`apps/web` or `apps/api` or root `devDependencies`) + `pnpm-lock.yaml`               |
| **B. Transitive-only advisory**   | the vulnerable package is _not_ a direct dep (e.g. `multer` via `@nestjs/platform-express`)                            | a pnpm `overrides` entry in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) + `pnpm-lock.yaml`                  |
| **C. Framework / breaking major** | major bump of a load-bearing dep (`next`, `react`, `@nestjs/*`, `prisma`/`@prisma/client`, `express`, `zod`, `vitest`) | **own branch + own PR + an ADR** in [`docs/decisions/`](../../docs/decisions/) + `package.json` + `pnpm-lock.yaml` |

---

## When to use

Use this skill when **any** of these is true:

- `pnpm audit:security` / `pnpm audit:deps` (or `dependency-review` / CodeQL on a
  PR) flags a HIGH/CRITICAL advisory you must clear.
- A feature needs a newer minor of a package you already depend on.
- You are pinning a transitive dependency to its patched release via `overrides`.
- You are planning a framework major (then this skill routes you to write an ADR
  first — Kind C).

Do **not** use this skill to **remove** a dependency — that is a deletion governed
by [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
§4 ("prove non-use first": grep every consumer, mind barrels, record the evidence).
Do **not** bundle a major with unrelated work — one major per PR.

---

## Files to inspect first (read before editing)

1. [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md) — the
   per-package **why it exists** + **upgrade risk** table for `apps/web` and
   `apps/api`, the intentional pins ("api stays on Zod 3 (intentional)"; web on Zod
   4), the known duplications, and the root tooling list. **Find your package here
   first** — the "Upgrade risk" column tells you whether you are in Kind A or C.
2. [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
   — the live `pnpm audit` tracker + exception register (CVE id, fix target, owner,
   expiry). If you are clearing an advisory, your entry lives here.
3. [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) — the existing
   `overrides:` (e.g. `multer: '>=2.2.0'`, `esbuild`, `vite`, `postcss`,
   `js-yaml`, `zod@4: 4.4.3`), the `packageExtensions` (ADR-0004 Zod peer), and
   `onlyBuiltDependencies` / `ignoredBuiltDependencies` (pnpm 10 build-script
   policy — a new dep that needs a postinstall build must be allow-listed here).
4. The **workspace `package.json`** that declares your dep:
   [`apps/web/package.json`](../../apps/web/package.json),
   [`apps/api/package.json`](../../apps/api/package.json), or the **root**
   [`package.json`](../../package.json) (shared meta tooling only — commitlint,
   husky, lint-staged, prettier, turbo, typescript).
5. [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
   — the binding policy (read §3 "Safe upgrade strategy" before you choose a step).
6. [`docs/decisions/`](../../docs/decisions/) — the ADRs (`ADR-0001`…`ADR-0005`).
   **Read before any major.** Match their format; note `ADR-0004` is itself a
   dependency-graph fix and `ADR-0005` makes `tsc` (not `tsgo`) the blocking
   typecheck.
7. [`docs/audit/05-dependency-report.md`](../../docs/audit/05-dependency-report.md)
   — inventory + duplication findings (the "verify direct usage" cases).
8. The CI install path —
   [`.github/workflows/security.yml`](../../.github/workflows/security.yml) /
   [`ci.yml`](../../.github/workflows/ci.yml) — installs with
   `pnpm install --frozen-lockfile`. A **stale lockfile fails the PR at install**.

> **Identify the package and its blast radius before bumping.** Confirm whether
> it's direct or transitive, and which app(s) consume it:
>
> ```bash
> # is it a direct dep, and where?
> grep -rn '"<pkg>"' package.json apps/web/package.json apps/api/package.json packages/*/package.json
> # who actually imports it (mind barrels: @/components, @/services, @/hooks, @/stores, @/types, @/enums on web; @/* on api)
> grep -rn "from '<pkg>'\|require('<pkg>')" apps/web/src apps/api/src packages/*/src
> ```

---

## Exact step-by-step implementation

> **Branch first — never on `main`**
> ([`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)):
>
> ```bash
> git switch -c chore/upgrade-<pkg>-<version>     # or fix/sec-<pkg> for an advisory
> ```

### Step 0 — Baseline (know what you are changing, and that you start green)

```bash
pnpm install                       # ensure node_modules matches the committed lockfile
pnpm audit:deps                    # pnpm -r outdated  +  pnpm audit --audit-level high
pnpm audit:security                # pnpm audit --audit-level=low && trivy fs (read the output)
```

Cross-reference the package's row in
[`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md). The
**Upgrade risk** column decides your path: `low`/patch-or-minor → **Kind A**;
transitive advisory → **Kind B**; `medium (major)` / framework → **Kind C**.

### Step 1 — Pick the smallest safe step (policy §3)

1. **Security patch / minor first.** Prefer the smallest bump that clears the
   advisory. The repo's model: `next 16.1.6 → 16.2.9` cleared 8 HIGH advisories as
   a **patch-level (16.x)** bump, re-validated with build + typecheck
   (`docs/audit/vulnerability-remediation.md`).
2. **Transitive-only → pin via `overrides`**, don't adopt it as a direct dep.
3. **Framework major → ADR + dedicated PR** (Kind C below). Never a drive-by.

**Change ONE batch at a time.** A "batch" is one logical group (one package, or one
override). Do not mix a major with unrelated bumps; do not bump ten packages and
then try to bisect a type break.

### Kind A — Direct patch/minor bump

1. **Bump the dep in the workspace that declares it** (never edit `pnpm-lock.yaml`
   by hand). Use `--filter`; pin the exact target:

   ```bash
   # web app
   pnpm --filter @auraspear/web up next@16.2.9
   # api app
   pnpm --filter @auraspear/api up @nestjs/common@11.1.6
   # root meta tooling only (turbo, prettier, typescript, husky, …)
   pnpm -w up turbo@2.5.8
   ```

   `pnpm up <pkg>@<version>` updates `package.json` **and** `pnpm-lock.yaml`
   together. Respect the range style already in the file (`^`/exact) — the matrix
   notes some are pinned exact (e.g. `zod` web pinned `4.4.3`).

2. **Do not "align" an intentional pin.** api stays on **Zod 3**, web on **Zod 4**
   (`docs/audit/dependency-matrix.md`); `tsgo` (`@typescript/native-preview`) is
   **advisory only** — `tsc` is the blocking typecheck (`ADR-0005`). If your bump
   would converge a documented skew, that is **Kind C** (needs an ADR), not Kind A.

### Kind B — Transitive-only advisory (pin via `overrides`)

1. **Add or tighten the pin in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)**
   under the existing `overrides:` block (mirror `multer: '>=2.2.0'`). Pin to the
   smallest patched range, with a comment pointing at the tracker:

   ```yaml
   overrides:
     zod@4: 4.4.3
     multer: '>=2.2.0'
     # <pkg>: '>=<patched>'   # CVE-XXXX / GHSA-… — see docs/audit/vulnerability-remediation.md
   ```

2. **Re-resolve and confirm the override took:**

   ```bash
   pnpm install
   pnpm why <pkg>            # prove the resolved version satisfies the patched range
   ```

3. **Verify framework compatibility** — an override forces the version on _every_
   consumer. Make sure the package that pulled it in (e.g.
   `@nestjs/platform-express` for `multer`) works with the new range. If not, the
   fix may need a framework bump → escalate to **Kind C**.

4. If the override needs a new postinstall build, add the package to
   `onlyBuiltDependencies` in the same file (pnpm 10 blocks build scripts by
   default).

### Kind C — Framework / breaking major (ADR + dedicated PR)

A major bump of a load-bearing dep (`next`, `react`, `@nestjs/*`,
`prisma`/`@prisma/client`, `express`, `zod`, `vitest`) is **never bundled** with
other work.

1. **Write the ADR first** in `docs/decisions/ADR-XXXX-<kebab-slug>.md` — next
   number is highest existing + 1 (today `ADR-0005` → next `ADR-0006`). Follow
   [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md) §3 (required sections:
   **Context / Decision / Consequences / Alternatives**; valid **Status** + Date).
   State the breaking changes, the migration, and the validation you will run.
   **Link it** from [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)
   in the same change.
2. **Own branch, one major per PR.** Do not pull in unrelated bumps.
3. **Do the bump**, then migrate call sites. **No `any`, no `eslint-disable`,
   no `@ts-ignore`/`@ts-expect-error`** to paper over the break
   ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #1–#2,
   [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #1–#2, #12) — fix the call sites
   or hold the upgrade.
4. **Area-specific risk** must be re-validated (matrix "Upgrade risk" column):
   - **Zod major** → the api `ZodValidationPipe` and every `*.dto.ts`
     `.max()` / `z.enum` / `.refine()` (and never a raw string-literal union —
     `apps/api/CLAUDE.md` #12).
   - **Prisma major** → `pnpm prisma:generate`, migrations, and the seed.
   - **Next/React major** → the App Router build, `next.config.ts` CSP, server vs
     client components.
   - **NestJS/express major** → guard chain, Helmet/throttler config, `main.ts`
     hardening.
   - **vitest major** → the web unit-test config + coverage.

### Step 2 — Re-validate (run them, do not assume)

Run the gates **for every kind** — see "Validation commands" below. The lockfile
**must** end up regenerated and committed.

---

## Validation commands (real pnpm commands — run from repo root)

**pnpm only**, Node 22 ([`AGENTS.md`](../../AGENTS.md) §4). Run after the bump:

```bash
# 1. Re-resolve the graph + regenerate the lockfile (must change with package.json)
pnpm install

# 2. HARD GATE — typecheck (tsc; blocking). Catches API breaks from the new version.
pnpm typecheck

# 3. HARD GATE — build (web Next build + api nest build).
pnpm build

# 4. Tests — required for any risky batch / major; run for advisories too.
pnpm test
#   end-to-end if the change touches runtime behavior:
pnpm test:e2e

# 5. Security scans — confirm you cleared (not introduced) advisories.
pnpm audit:security      # pnpm audit --audit-level=low && trivy fs HIGH,CRITICAL
pnpm audit:deps          # pnpm -r outdated + pnpm audit --audit-level high (advisory report)
pnpm scan:secrets        # gitleaks — must be clean (hard gate)

# 6. For a transitive overrides pin (Kind B) — prove it resolved:
pnpm why <pkg>

# 7. Advisory bundle (lint:strict + format:check via turbo, then prettier check):
pnpm validate
#   or the fuller pass that also runs tests + build:
pnpm validate:full
```

> **Know which gate blocks vs is advisory** ([`AGENTS.md`](../../AGENTS.md) §5,
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)):
> **hard gates** = `pnpm typecheck`, `pnpm build`, Docker image builds, gitleaks
> (`pnpm scan:secrets`), CodeQL. The CI **`pnpm audit` job and `trivy fs` are
> advisory today** (`security.yml`: `pnpm-audit` is `continue-on-error: true`;
> `trivy-fs` runs `--exit-code 0`) **because of tracked debt** — advisory ≠ ignore:
> a **new** HIGH/CRITICAL you introduce must be fixed or formally excepted (§5),
> never waved through under cover of the existing backlog.
> **Do not claim a gate is green unless you ran it and saw it pass**
> ([`AGENTS.md`](../../AGENTS.md) §5, §13).

---

## Docs to update

- **[`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md)** —
  update the package's **Version** and, if the posture changed, its **Upgrade
  risk** note (e.g. a planned major that landed, or an advisory now cleared). This
  is mandatory for any version change.
- **[`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)**
  — if you cleared an advisory, mark it resolved (with the version that fixed it).
  If an advisory **can't** be fixed now, add an exception entry: **package + version
  path** (direct/transitive/dev-only), **CVE/GHSA id + severity**, **the concrete
  fix** (target version), **why deferred**, and **owner + expiry**
  ([`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
  §5). Never silently accept an advisory.
- **[`docs/decisions/ADR-XXXX-*.md`](../../docs/decisions/)** + **a row in
  [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)** — for **every
  framework major** (Kind C). An ADR isn't "done" until it's linked.
- **[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)** /
  [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md) — only
  if the change alters a command or a gate.
- Cross-check **[`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md)** if you touched a
  doc a feature page references (e.g. a `vitest`/test-tooling change → test docs).

---

## Security checks (non-negotiable)

- [ ] **pnpm only; one lockfile.** Used `pnpm` (never `npm`/`yarn`);
      `pnpm-lock.yaml` regenerated and **committed**; **no** `package-lock.json` /
      `yarn.lock` anywhere outside `node_modules/` (a stray one is a review blocker
      — delete and report it).
- [ ] **No new HIGH/CRITICAL.** Ran `pnpm audit:security` and read the output; the
      change clears advisories and introduces none. CI `dependency-review`
      (`fail-on-severity: high`) and CodeQL not made redder than you found them.
- [ ] **Smallest safe step.** Patch/minor or an `overrides` pin for a transitive;
      any framework **major** has its **own branch + PR + an ADR**.
- [ ] **Intentional pins respected.** Did not converge a documented skew (Zod 3 api
      / Zod 4 web; `tsgo` advisory-only) without an ADR.
- [ ] **No type-break cover-ups.** No `any`, no `// eslint-disable`, no
      `@ts-ignore`/`@ts-expect-error` added to absorb the upgrade.
- [ ] **No invariant weakened.** The bump did not loosen tenant scoping, an
      `@RequirePermission`, the auth guard chain, secret encryption, or AI
      approval-required gating ([`AGENTS.md`](../../AGENTS.md) §6–§7). A Zod/NestJS
      major in particular must keep every DTO `.max()`/`.refine()` and every guard
      intact.
- [ ] **No secret committed.** `pnpm scan:secrets` (gitleaks) is clean — the
      lockfile/diff carries no credential.
- [ ] **Build-script policy honored.** Any new dep needing a postinstall build was
      added to `onlyBuiltDependencies` deliberately (pnpm 10 blocks scripts by
      default); nothing else was silently allow-listed.
- [ ] **Unfixable advisory documented** in `vulnerability-remediation.md` with CVE
      id, fix target, owner, and expiry — not silenced via undocumented
      `overrides`/`ignore` or by lowering `--audit-level`.

---

## Common mistakes

- **Editing `pnpm-lock.yaml` by hand** — always let `pnpm up` / `pnpm install`
  regenerate it. A hand-edited lockfile fails CI's `--frozen-lockfile` install.
- **Forgetting to commit the lockfile.** A `package.json` change without the
  regenerated `pnpm-lock.yaml` fails the PR **at install** (CI uses
  `pnpm install --frozen-lockfile`).
- **Running `npm install` / `yarn`** at the root or in a workspace — generates a
  competing lockfile that fights `pnpm-lock.yaml`. pnpm only.
- **Bundling a major with unrelated bumps.** One major per PR, with its ADR. A big
  multi-package diff makes a type break impossible to bisect.
- **Adopting a transitive package as a direct dep** to fix an advisory, instead of
  pinning it via `overrides` in `pnpm-workspace.yaml`.
- **"Aligning" an intentional pin** (Zod 3 api ↔ Zod 4 web) without reading
  `docs/audit/dependency-matrix.md` / `ADR-0004` — that skew is deliberate.
- **Bumping `@typescript/native-preview` (tsgo) thinking it's the blocking
  typecheck** — `tsc` is (`ADR-0005`); tsgo is advisory.
- **Claiming "all green" without running the gates.** Run `pnpm typecheck` +
  `pnpm build` (+ `pnpm test`) and paste the result.
- **Skipping `pnpm prisma:generate` after a Prisma bump** — the client is stale and
  typecheck/runtime breaks.
- **Papering over a type break with `any`/`eslint-disable`** — banned; fix the call
  sites or hold the upgrade.
- **Silently accepting an advisory** by deleting it from the tracker, an
  undocumented `ignore`, or lowering `--audit-level`. The scan output is the record.
- **A new postinstall-building dep left out of `onlyBuiltDependencies`** — its build
  silently doesn't run under pnpm 10.

---

## Final checklist

- [ ] Branched off `main` (`chore/upgrade-…` or `fix/sec-…`); never worked on
      `main`.
- [ ] Identified the **kind** (A direct patch/minor · B transitive `overrides` · C
      framework major) using `docs/audit/dependency-matrix.md`; took the **smallest
      safe step**; changed **one batch**.
- [ ] Bump done via `pnpm up <pkg>@<version>` (`--filter` the right workspace) or an
      `overrides` entry in `pnpm-workspace.yaml`; **no** hand-edited lockfile.
- [ ] **Kind C only:** ADR added under `docs/decisions/ADR-XXXX-*` (4 required
      sections, valid Status/Date), linked in `memory/DECISIONS_MEMORY.md`, own PR.
- [ ] Re-validated: `pnpm typecheck` (blocking) + `pnpm build` + `pnpm test`
      (+ `pnpm test:e2e` / area-specific risk); no `any` / `eslint-disable` added.
- [ ] `pnpm audit:security` + `pnpm scan:secrets` run and read — no **new**
      HIGH/CRITICAL, gitleaks clean; `pnpm why <pkg>` confirms a Kind-B pin resolved.
- [ ] `pnpm-lock.yaml` regenerated and **committed**; no `package-lock.json` /
      `yarn.lock` outside `node_modules/`.
- [ ] `docs/audit/dependency-matrix.md` updated; `vulnerability-remediation.md`
      updated (advisory cleared, or exception with CVE id + fix target + owner +
      expiry).
- [ ] No tenant/RBAC/auth/secret/AI-approval invariant weakened; intentional pins
      respected.
- [ ] Final response uses the [`AGENTS.md`](../../AGENTS.md) §13 report format; no
      "all green" unless the hard gates actually passed.
