# rules/security/dependency-audit.md — Dependency audit & upgrade policy

> **Read [`../../AGENTS.md`](../../AGENTS.md) first** (loading order + the one
> rule: understand before you edit). This file is a **hard constraint**, not
> guidance. It governs how dependencies enter, change, and leave this monorepo —
> the package manager, the scan gates, the upgrade order, what you must prove
> before removing a dep, and how an unfixable advisory gets documented.
>
> Sibling files: toolchain + "prove before delete" discipline in
> [`../global/branch-safety.md`](../global/branch-safety.md); secret/scan gates
> and credential handling in [`security-rules.md`](./security-rules.md) §11;
> the broader inventory + per-package upgrade posture in
> [`../../docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md);
> live `pnpm audit` tracking in
> [`../../docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md);
> the step-by-step recipe in `../../skills/devsecops/upgrade-dependency.md`
> (AGENTS.md §11) and `../../skills/devsecops/run-security-scan.md`.

This is a pnpm + Turborepo monorepo: root `auraspear-platform`, workspaces
`apps/web` (`@auraspear/web`) and `apps/api` (`@auraspear/api`), plus
`packages/*`. A bad dependency is a supply-chain attack surface on a multi-tenant
SOC platform — treat every add/upgrade/remove as a security change, not a chore.

---

## 1. pnpm only — one package manager, one lockfile

- **pnpm is the only package manager.** Root declares
  `"packageManager": "pnpm@10.30.3"` and `engines: { node: ">=22 <25", pnpm:
">=10" }` (root `package.json`). Use **Node 22**. `ADR-0001`
  (`docs/decisions/ADR-0001-monorepo-pnpm-turborepo.md`) and `ADR-0002`
  (`…-node-22-lts.md`) make this binding.
- **Never run `npm install` / `yarn` at the root or in any workspace.** They
  generate a `package-lock.json` / `yarn.lock` that fights `pnpm-lock.yaml`.
- **One lockfile, committed: `pnpm-lock.yaml` at the repo root** (pnpm hoists the
  workspace lock to root — there is exactly one). **No mixed lockfiles, ever** — a
  committed `package-lock.json` or `yarn.lock` is a review blocker; if you see one
  outside `node_modules/`, delete it and report it.
- Install dependencies with `pnpm install`; add to a workspace with
  `pnpm --filter @auraspear/web add <pkg>` (or `@auraspear/api`). Shared meta
  tooling (commitlint, husky, lint-staged, prettier, turbo, typescript) lives in
  **root** devDependencies — don't add app runtime deps there.
- **CI installs with `pnpm install --frozen-lockfile`** (`.github/workflows/
security.yml:64`, `ci.yml`). If `pnpm-lock.yaml` is stale your PR fails the
  install — **always commit the updated lockfile** alongside any `package.json`
  change.

## 2. Scan gates — `pnpm audit` + Trivy (run them, read them)

The root scripts are the source of truth (root `package.json`):

| Command               | What it runs                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm audit:security` | `pnpm audit --audit-level=low && pnpm scan:trivy`                                                                              |
| `pnpm scan:trivy`     | `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed --skip-dirs node_modules --exit-code 0 .` |
| `pnpm scan:secrets`   | `gitleaks detect --source . --redact --no-banner`                                                                              |
| `pnpm audit:deps`     | `node scripts/ci/dependency-report.mjs` (outdated/inventory report)                                                            |

- **Run `pnpm audit:security` before adding/upgrading a dependency and before you
  claim a dependency change is done.** Don't eyeball `package.json` — run the scan.
- **Know which gate is blocking vs advisory** (AGENTS.md §5,
  `../global/validation-gates.md`): **gitleaks (no secrets) and the Trivy image
  build path are hard gates**; the CI **`pnpm audit` job and `trivy fs` are
  advisory today** (`security.yml`: `pnpm-audit` has `continue-on-error: true`;
  `trivy-fs` runs with `--exit-code 0`) **because of tracked debt** in
  `../../docs/audit/vulnerability-remediation.md`. Advisory ≠ ignore: a **new**
  HIGH/CRITICAL you introduce must be fixed or formally excepted (§5), not waved
  through under cover of the existing backlog.
- **`dependency-review`** (`.github/workflows/dependency-review.yml`) runs on PRs
  to `main` with `fail-on-severity: high` (advisory until the base dependency
  graph is populated). **CodeQL** (`codeql.yml`) also runs. Your job is to not
  make any of these redder than you found them.
- Trivy `--ignore-unfixed` means unpatched-upstream findings are skipped — so a
  finding Trivy _does_ report has a fix available. Take it.

## 3. Safe upgrade strategy — patch/minor first, majors via ADR

Order of preference, always:

1. **Security patch / minor first.** Prefer the smallest version bump that clears
   the advisory. Example from this repo: `next 16.1.6 → 16.2.9` cleared 8 HIGH
   advisories as a **patch-level (16.x)** bump — direct dep, re-validated build +
   typecheck (`docs/audit/vulnerability-remediation.md`). That is the model.
2. **Transitive-only advisory → pin via pnpm `overrides`.** When the vulnerable
   package is transitive (e.g. `multer` via `@nestjs/platform-express` →
   `>=2.2.0`), add a pnpm `overrides` entry rather than adopting it as a direct
   dep, and verify framework compatibility first.
3. **Framework / breaking majors → ADR + dedicated PR.** A major bump of a
   load-bearing dependency (`next`, `react`, `@nestjs/*`, `prisma`/`@prisma/
client`, `express`, `zod`, `vitest`) is **never** a drive-by. It needs:
   - an ADR in `docs/decisions/` (follow the existing `ADR-0001…0005` format;
     e.g. Zod 3→4 convergence, vitest 2→3 are pending and ADR-worthy),
   - its **own branch and PR** (one major per PR — never bundle a major with
     unrelated work), and
   - full re-validation: `pnpm typecheck` (blocking), `pnpm build`, `pnpm test`,
     and the area-specific risks (e.g. a Zod major must be validated against the
     API `ZodValidationPipe` and every `*.dto.ts` `.max()`/`z.enum`/`.refine()`).

- **Respect intentional version pins.** Some skew is deliberate and documented:
  api stays on **Zod 3**, web on **Zod 4** (`docs/audit/dependency-matrix.md`);
  `tsgo` (`@typescript/native-preview`) is **advisory only** — `tsc` is the
  blocking typecheck (`ADR-0005`). Don't "align" a pin without reading why it
  exists.
- **Validate after risky batches.** After a multi-package bump, run
  `pnpm validate` (typecheck + `lint:strict` + `format:check`) and the relevant
  tests. Never claim "all green" unless the required gates actually passed
  (AGENTS.md §5, §13).
- **No `any`, no `eslint-disable`** to paper over a type break introduced by an
  upgrade (`apps/api/CLAUDE.md` #1–#2, `apps/web/CLAUDE.md` #1–#2, #12) — fix the
  call sites or hold the upgrade.

## 4. Removing a dependency — prove non-use first

Removing a dep is a deletion: **prove before you delete** (AGENTS.md §8,
`../global/branch-safety.md` §6). A dep that _looks_ unused may resolve a peer,
back a transitive feature, or be imported through a barrel.

- **Grep every consumer** before removing a direct dependency. Search
  `apps/web/src` and `apps/api/src` (and `packages/*`) for
  `from '<pkg>'`, `require('<pkg>')`, and the barrel forms. Mind barrels —
  `@/components`, `@/services`, `@/hooks`, `@/stores`, `@/types`, `@/enums` (web),
  `@/*` (api).
- **Distinguish "direct but transitively satisfied" from "truly unused."** The
  audit flagged real cases to verify, not blind-delete (`docs/audit/
05-dependency-report.md` §3–§4): `date-fns` (web) likely only needed
  transitively by `react-day-picker`; `ws` / `@types/ws` / `form-data` (api) may
  be satisfied by `socket.io` / `axios`’s bundled `form-data`. Confirm there is no
  **first-party** `import` before dropping the direct declaration; keep
  `@types/*` only while the runtime dep stays direct.
- **A removal is end-to-end.** Removing a runtime dep that feeds a feature can
  orphan a Next.js proxy route, a permission’s 8–10 files, a Docker stage, or a
  seed/migration — check `apps/web/src/app/api/`, `infra/docker/`,
  `.github/workflows/`, and `docs/**` (`../global/branch-safety.md` §6).
- **Record the evidence in your final report** (the greps you ran, the zero
  matches). **If you cannot prove it is unused, do not remove it** — flag it as a
  follow-up instead.
- Removing a dep changes `pnpm-lock.yaml` — commit the regenerated lockfile and
  re-run `pnpm install --frozen-lockfile` mentally (CI will).

## 5. Documenting exceptions — CVE id + expiry, never silent

When an advisory genuinely cannot be fixed now (no upstream patch, or the fix is a
major that needs its own ADR/PR), **it must be documented, not silently
accepted.**

- **Where:** add the entry to
  `../../docs/audit/vulnerability-remediation.md` (the live `pnpm audit` tracker)
  and, for inventory-level posture, `../../docs/audit/dependency-matrix.md`.
- **Every exception entry MUST include:**
  1. **Package + version path** (is it a direct dep, transitive, or dev/test
     only — dev/test-only never ships in the Docker images, note that),
  2. **Advisory / CVE id and severity** (`GHSA-…` / `CVE-…`),
  3. **The concrete fix** (target version, e.g. `>=2.2.0`),
  4. **Why it is deferred** (e.g. "needs major 2→3 + config migration + test
     re-validation — belongs in a focused PR"),
  5. **An owner and an expiry / re-evaluation date** — an exception is
     time-boxed, not permanent. It is re-checked at the next `pnpm audit` run.
- This mirrors the existing discipline: _"No exceptions are being accepted
  silently: each remaining item has an owner path and a concrete fix"_
  (`docs/audit/vulnerability-remediation.md`). Keep it that way — every remaining
  finding has a path and a plan.
- **Never** suppress an advisory by deleting it from the tracker, by an
  undocumented `overrides`/`ignore` entry, or by lowering `--audit-level`. The
  scan output is the record of truth.

---

## Checklist before you commit a dependency change

- [ ] Used **pnpm only**; `pnpm-lock.yaml` regenerated and **committed**; no
      `package-lock.json` / `yarn.lock` anywhere outside `node_modules/`.
- [ ] Ran `pnpm audit:security` (pnpm audit + Trivy) and read the output — no
      **new** HIGH/CRITICAL introduced.
- [ ] Upgrade took the smallest safe step (patch/minor, or `overrides` for a
      transitive); any **framework major** has its own branch + PR + an ADR in
      `docs/decisions/`.
- [ ] Re-validated: `pnpm typecheck` (blocking gate) + `pnpm build` (+ `pnpm test`
      for risky batches); no `any` / `eslint-disable` added to absorb breakage.
- [ ] Any removed dep is **proven unused** (greps recorded in the report); no
      orphaned proxy route / Docker stage / migration / seed.
- [ ] Any unfixable advisory is **documented** in
      `docs/audit/vulnerability-remediation.md` with CVE id, fix target, owner,
      and an expiry — never silently accepted.
- [ ] **Branched first — never worked on `main`** (`../global/branch-safety.md`);
      committed/pushed only if asked.

## Related

- `../../AGENTS.md` — §4 command map (`audit:security`, `scan:trivy`), §5
  validation gates, §8 branch/prove-before-delete, §11 `upgrade-dependency` skill.
- `../global/branch-safety.md` — pnpm-only/Node 22 toolchain, "prove before
  delete," no destructive commands unasked.
- `../global/validation-gates.md` — which gates block vs are advisory.
- `security-rules.md` — §11 secrets/connector encryption, scan gate context.
- `../../docs/audit/dependency-matrix.md` — per-package version + upgrade posture.
- `../../docs/audit/vulnerability-remediation.md` — live `pnpm audit` tracker +
  exception register.
- `../../docs/audit/05-dependency-report.md` — inventory + duplication findings
  (the "verify direct usage" cases).
- `../../docs/decisions/` — ADRs (`ADR-0001` pnpm/turbo, `ADR-0002` Node 22,
  `ADR-0005` tsc/tsgo) — read before a major upgrade.
- `../../skills/devsecops/upgrade-dependency.md` /
  `../../skills/devsecops/run-security-scan.md` — step-by-step recipes.
