# Skill: Run a security scan (`pnpm audit:security` · `scan:trivy` · `scan:secrets`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the
> command map (§4, "Security scans" row), and especially **§5 "Validation gates
> (what 'green' means)"**, which marks **gitleaks (no secrets) and the Trivy image
> build as hard gates**, and **`pnpm audit` + Trivy fs as advisory** _because of
> tracked debt_. It ends with _"Never claim 'all green' unless the required gates
> actually passed — run them."_ That sentence is the whole point of this skill.
>
> Then read the hard constraints behind it:
> [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
> §2 (scan gates: blocking vs advisory) + §5 (documenting exceptions — CVE id +
> owner + expiry, never silent) and
> [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md)
> §1 + §6 (gitleaks is a hard gate; if it fires, **rotate + scrub history**, don't
> just delete the line). Sibling onboarding: [`skills/`](../) (next door:
> [`upgrade-dependency.md`](./upgrade-dependency.md), [`add-ci-gate.md`](./add-ci-gate.md),
> [`add-env-variable.md`](./add-env-variable.md)), [`rules/`](../../rules/)
> (security + [`testing/quality-gates.md`](../../rules/testing/quality-gates.md),
> [`global/validation-gates.md`](../../rules/global/validation-gates.md),
> [`global/branch-safety.md`](../../rules/global/branch-safety.md)),
> [`memory/`](../../memory/) (commands → [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)),
> [`context/`](../../context/), and [`docs/`](../../docs/) — the **remediation
> tracker** [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
> (source of truth for findings + exceptions), plus
> [`docs/security/SECURITY_SCANS.md`](../../docs/security/SECURITY_SCANS.md),
> [`docs/security/VULNERABILITY_MANAGEMENT.md`](../../docs/security/VULNERABILITY_MANAGEMENT.md),
> and [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md).
>
> **No AI agent may edit first and understand later.** Running a scan is reading,
> not changing — but _acting on the result_ (a dependency bump, an `overrides`
> pin, a documented exception) is a security change on a multi-tenant SOC
> platform. Do not paper over a finding, do not lower a threshold, do not delete a
> tracker entry to make output look clean. **pnpm only · Node 22.**

This recipe runs the three scanners the repo ships, reads their output correctly,
and records what you find. The scripts are the source of truth in root
[`package.json`](../../package.json) (`scripts`):

| Command               | Exact script (root `package.json`)                                                                                             | Needs                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `pnpm audit:security` | `pnpm audit --audit-level=low && pnpm scan:trivy`                                                                              | Trivy (for the chained `scan:trivy`)         |
| `pnpm scan:trivy`     | `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed --skip-dirs node_modules --exit-code 0 .` | **`trivy`** on PATH                          |
| `pnpm scan:secrets`   | `gitleaks detect --source . --redact --no-banner`                                                                              | **`gitleaks`** on PATH                       |
| `pnpm audit:deps`     | `node scripts/ci/dependency-report.mjs`                                                                                        | (outdated/inventory report; not a vuln scan) |

Trivy and gitleaks are **not bundled** ([`docs/security/SECURITY_SCANS.md`](../../docs/security/SECURITY_SCANS.md)
"Local scripts") — install them first or the scan errors out. The CI mirror is
[`.github/workflows/security.yml`](../../.github/workflows/security.yml): three
jobs — `gitleaks (secret scan)` (**hard**), `trivy (filesystem)` (real scan,
`--exit-code 0`, non-blocking), `pnpm audit (advisory)` (`continue-on-error: true`).

---

## When to use

Use this skill when **any** of these is true:

- You **changed dependencies** (added/upgraded/removed a package, edited
  `package.json` or `pnpm-workspace.yaml` `overrides`) — `dependency-audit.md` §2
  requires `pnpm audit:security` _before you claim the change is done_.
- You are **about to push / open a PR** and need to confirm you introduced **no new
  HIGH/CRITICAL** and **no committed secret** (gitleaks is a hard CI gate, so a
  committed secret fails the merge — `secret-handling.md` §1).
- You **touched env files, connector config, encryption, or anything secret-bearing**
  → run `pnpm scan:secrets` (gitleaks) before pushing (`secret-handling.md` §1, §6).
- You are doing a **periodic security pass** (the CI `security.yml` runs weekly on a
  `schedule:` cron — Monday 06:00 UTC) and want the local picture.
- You need to **triage or re-evaluate** an existing finding and update
  [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md).

**Do not** use this skill when:

- You are **adding a new CI scan gate** (a new workflow/job) → that's
  [`add-ci-gate.md`](./add-ci-gate.md).
- You are **fixing** a dependency vuln (the upgrade itself, `overrides` strategy,
  ADR for a major) → that's [`upgrade-dependency.md`](./upgrade-dependency.md);
  come back here to _verify_ the fix.
- You are tempted to make output look clean by **lowering `--audit-level`, dropping
  `--severity`, deleting a tracker row, or adding an undocumented `overrides`/ignore**.
  That is forbidden — see **Security checks** below and `dependency-audit.md` §5.

---

## Files to inspect first

Open these before running anything — they define what the commands are, which gate
is hard vs advisory, and where findings get recorded.

| Concern                                                                      | File                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The exact scan scripts (don't retype the flags — read them)                  | [`package.json`](../../package.json) `scripts` → `audit:security`, `scan:trivy`, `scan:secrets`, `audit:deps`                                                                             |
| Hard-vs-advisory rule for each scan + "documenting exceptions"               | [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md) §2, §5                                                                                                   |
| gitleaks = hard gate; what to do when it fires (rotate + scrub)              | [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md) §1, §6                                                                                                     |
| Which gates block vs annotate in CI                                          | [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md), [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md), [`AGENTS.md`](../../AGENTS.md) §5 |
| **Where findings + exceptions are recorded** (the tracker)                   | [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)                                                                                                |
| Scan inventory (local + CI) + "do not claim a scan passed unless you ran it" | [`docs/security/SECURITY_SCANS.md`](../../docs/security/SECURITY_SCANS.md)                                                                                                                |
| Triage SLAs + fix-order policy + "no silent exceptions"                      | [`docs/security/VULNERABILITY_MANAGEMENT.md`](../../docs/security/VULNERABILITY_MANAGEMENT.md)                                                                                            |
| Inventory-level posture + intentional pins (api Zod 3 / web Zod 4)           | [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md)                                                                                                                |
| The CI mirror you're reproducing locally                                     | [`.github/workflows/security.yml`](../../.github/workflows/security.yml)                                                                                                                  |
| Risk register (why a gate is advisory)                                       | [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)                                                                                                                  |

---

## Exact step-by-step implementation

### 0. Branch first (if you'll act on a finding)

Running scans changes nothing. But the moment you _fix_ something (bump a dep,
add an `overrides` pin, edit the tracker), you must be on a branch — never `main`
([`rules/global/branch-safety.md`](../../rules/global/branch-safety.md); AGENTS §8):
`git switch -c chore/security-scan` (or `fix/<advisory>`).

### 1. Confirm the toolchain (pnpm + Node 22) and that the scanners exist

```bash
node -v          # expect v22.x (engines: >=22 <25 — AGENTS §4; dependency-audit.md §1)
pnpm -v          # pnpm only — never npm/yarn
trivy --version  # required by scan:trivy / audit:security
gitleaks version # required by scan:secrets
```

If `trivy` or `gitleaks` is missing, install it (they are not bundled —
[`docs/security/SECURITY_SCANS.md`](../../docs/security/SECURITY_SCANS.md)):
Trivy → <https://trivy.dev/latest/getting-started/installation/>, gitleaks →
<https://github.com/gitleaks/gitleaks#installing>. Running `pnpm scan:trivy`
without `trivy` on PATH just errors — that is **not** a clean scan. CI installs
Trivy by direct release-binary download (`security.yml` → `trivy-fs`, currently
`v0.71.2`) because the marketplace action was flaky; locally, any recent Trivy is
fine.

> Windows note: run these from a shell where `trivy`/`gitleaks` resolve. The
> scripts themselves are cross-platform pnpm scripts.

### 2. Run dependency vulnerabilities — `pnpm audit`

```bash
pnpm install --frozen-lockfile   # same as CI; a stale pnpm-lock.yaml fails honestly first
pnpm audit --audit-level=low     # the level audit:security uses (low = show everything)
```

- `--audit-level=low` is what `audit:security` runs, so you see **every** severity,
  not just high. (Note: the CI `pnpm audit (advisory)` job uses `--audit-level high`
  — narrower. Locally, look at everything.)
- A **clean** run prints `No known vulnerabilities found.` — the current tracked
  state is **0** (`vulnerability-remediation.md`: 31 → 12 → **0** after the `next`
  patch + vitest bump + transitive `overrides`). Your job is to **not regress that**.
- Read the table by severity. For each finding note: package, version path
  (**direct / transitive / dev-or-test-only**), advisory id (`GHSA-…`/`CVE-…`),
  and whether a fix version exists. Dev/test-only tooling (vitest/vite/esbuild)
  never ships in the Docker images — lower urgency, still tracked
  (`VULNERABILITY_MANAGEMENT.md` fix policy §4).

### 3. Run the filesystem scan — `pnpm scan:trivy`

```bash
pnpm scan:trivy
# = trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL \
#       --ignore-unfixed --skip-dirs node_modules --exit-code 0 .
```

Read the flags so you read the output correctly:

- **`--scanners vuln,secret,misconfig`** — three finding classes in one pass:
  dependency/OS vulns, hardcoded secrets, and IaC/Dockerfile misconfig.
- **`--severity HIGH,CRITICAL`** — MEDIUM/LOW are filtered out by design here.
- **`--ignore-unfixed`** — only findings **with a fix available** are shown. So a
  finding Trivy _does_ report **has a fix — take it** (`dependency-audit.md` §2).
- **`--skip-dirs node_modules`** — source/config tree, not installed packages.
- **`--exit-code 0`** — Trivy **never fails the process**; it annotates. The exit
  code being `0` does **not** mean "clean" — **you must read the table.** This is
  exactly why §5 of AGENTS says never claim green without reading the output.

### 4. Run the secret scan — `pnpm scan:secrets` (this one is a hard gate)

```bash
pnpm scan:secrets
# = gitleaks detect --source . --redact --no-banner
```

- `--redact` means a matched secret is masked in output (so the scan log itself
  doesn't leak it). `--no-banner` keeps output clean.
- gitleaks scans the working tree here; **in CI it runs over full history**
  (`security.yml` → `secret-scan` uses `fetch-depth: 0`), and it is a **hard gate**
  — a committed secret **anywhere in history** fails the merge (`secret-handling.md`
  §1; AGENTS §5).
- **If gitleaks fires, do NOT just delete the line.** That secret is compromised:
  **rotate it, then scrub it from git history** (`secret-handling.md` §1, §6).
  Deleting the line leaves it in history where CI's full-history scan still finds
  it. Only `*.example` files belong in the repo, with **empty** secret slots
  (`secret-handling.md` §1).

### 5. Or run the bundle — `pnpm audit:security`

```bash
pnpm audit:security   # = pnpm audit --audit-level=low && pnpm scan:trivy
```

This chains `pnpm audit` (low) **and** `pnpm scan:trivy` in one shot — the
canonical "is this dependency/fs change safe?" command from `dependency-audit.md`
§2. It does **not** include gitleaks — run `pnpm scan:secrets` separately when you
touched anything secret-bearing.

### 6. Triage every finding (don't just stare at it)

For each HIGH/CRITICAL (and any new finding at all), decide the path — fix order
from `VULNERABILITY_MANAGEMENT.md` and `dependency-audit.md` §3:

1. **Patch/minor bump** the direct dep that clears the advisory (the model: `next`
   16.1.6 → 16.2.9 closed 8 HIGH). Smallest safe step first. → use
   [`upgrade-dependency.md`](./upgrade-dependency.md).
2. **Transitive-only** → pin via pnpm `overrides` in
   [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) (e.g. `multer: '>=2.2.0'`),
   after verifying framework compatibility — **never** adopt it as a new direct dep.
3. **Framework / breaking major** (`next`, `react`, `@nestjs/*`, `prisma`,
   `express`, `zod`, `vitest`) → its **own branch + PR + an ADR** in
   `docs/decisions/`. Never a drive-by. Respect intentional pins (api Zod 3 / web
   Zod 4 — `dependency-matrix.md`).
4. **Cannot fix now** → document an exception (step 7). Never silent.

### 7. Record findings & exceptions in the tracker (the only sanctioned outcome)

Update [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
— the live source of truth for status and decisions. If you fixed something, update
the count/table and the "How" notes. If a finding **genuinely can't be fixed now**,
add an exception entry. Per `dependency-audit.md` §5 / `VULNERABILITY_MANAGEMENT.md`
"No silent exceptions", **every exception MUST include**:

1. **Package + version path** — direct / transitive / **dev-or-test-only** (note if
   it never ships in the Docker images).
2. **Advisory / CVE id + severity** (`GHSA-…` / `CVE-…`).
3. **The concrete fix** (target version, e.g. `>=2.2.0`).
4. **Why it's deferred** (e.g. "needs major 2→3 + config migration + test
   re-validation — belongs in a focused PR").
5. **Owner + expiry / re-evaluation date** — exceptions are time-boxed, re-checked
   at the next `pnpm audit` run.

For scan-gate posture (a gate that stays advisory because of backlog), also note it
in [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md).

### 8. Re-validate after any fix

A dependency fix is still a code change — re-run the blocking gates before you claim
done (`dependency-audit.md` §3; AGENTS §5):

```bash
pnpm typecheck     # BLOCKING gate
pnpm build         # BLOCKING gate
pnpm test          # for risky/multi-package batches (advisory but run it)
pnpm audit:security # confirm the finding is actually gone — no NEW HIGH/CRITICAL
```

No `any`, no `eslint-disable` to absorb a type break from an upgrade
(`apps/api/CLAUDE.md` #1–#2, `apps/web/CLAUDE.md` #1–#2/#12) — fix the call sites or
hold the upgrade. Commit the regenerated `pnpm-lock.yaml` alongside any
`package.json`/`overrides` change.

---

## Validation commands (real pnpm commands, run from repo root)

**Never claim a scan passed unless you actually ran it and saw the output**
(`SECURITY_SCANS.md`; AGENTS §5). pnpm only · Node 22.

```bash
node -v && pnpm -v && trivy --version && gitleaks version   # toolchain present

pnpm install --frozen-lockfile        # exactly what CI installs
pnpm audit --audit-level=low          # dependency vulns (every severity)
pnpm scan:trivy                        # fs: vuln + secret + misconfig (HIGH,CRITICAL)
pnpm scan:secrets                      # gitleaks (hard gate) — committed secrets
pnpm audit:security                    # the chained bundle (audit + trivy)

# After acting on a finding — re-validate the blocking gates:
pnpm typecheck                         # BLOCKING
pnpm build                             # BLOCKING
pnpm test                              # for risky batches
```

Compare against CI to know "hard vs advisory" before you report green:

```bash
gh workflow list
gh run list --workflow=security.yml --limit 5
gh run view <run-id> --log            # read gitleaks (hard) + trivy/audit (advisory) jobs
```

A passing local run is evidence only if you **paste the relevant output** (the
`No known vulnerabilities found.` line, the empty/clean Trivy table, gitleaks "no
leaks found"). Do not say "should be clean" (AGENTS §13).

---

## Docs to update

- **[`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)**
  — the live tracker. Update the count/table when you fix or introduce a finding;
  add a full **exception entry** (package+path, CVE id, fix target, reason, owner,
  expiry) for anything you can't fix now. This is the **source of truth** — never
  let it drift from the actual `pnpm audit` output.
- **[`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)** — if a
  scan stays advisory because of tracked debt, the debt needs an owner + a
  promotion condition here.
- **[`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md)** — for
  inventory-level posture / deferred-major tracking after a dependency action.
- **[`docs/security/SECURITY_SCANS.md`](../../docs/security/SECURITY_SCANS.md)** /
  **[`docs/security/VULNERABILITY_MANAGEMENT.md`](../../docs/security/VULNERABILITY_MANAGEMENT.md)**
  — only if scan **commands/flags or policy** actually change (these mirror the
  `package.json` scripts — keep them true). A routine finding does **not** edit these.
- **[`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)** §2
  — only if the **set of scan gates** changes (e.g. a new scanner). Not for a normal scan run.
- **[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)** — only if you added
  a **new** scan script to `package.json`.

> Most scan _runs_ update **only** `vulnerability-remediation.md`. The rule/doc
> files change only when the _gates themselves_ change.

---

## Security checks (do not ship without these)

- **Never make the scan look clean by weakening it.** Do **not** raise
  `--audit-level`, drop `--severity HIGH,CRITICAL` to hide findings, remove a
  scanner from `--scanners`, delete a row from the remediation tracker, or add an
  **undocumented** `overrides`/ignore entry. The scan output is the record of truth
  (`dependency-audit.md` §5). A diff that only loosens a scan is a review blocker.
- **A committed secret = rotate + scrub, not delete.** If gitleaks fires, the
  secret is burned. Rotate it and remove it from history; deleting the line leaves
  it where CI's full-history scan (`fetch-depth: 0`) still catches it
  (`secret-handling.md` §1, §6). Only `*.example` files with **empty** secret slots
  belong in the repo.
- **Advisory ≠ ignore.** `pnpm audit` and Trivy fs being advisory in CI covers
  _pre-existing_ tracked debt only. A **new** HIGH/CRITICAL _you_ introduce must be
  fixed or formally excepted with owner + expiry — not waved through under the
  existing backlog (`dependency-audit.md` §2).
- **`--exit-code 0` / `continue-on-error` is not "pass".** Trivy returns `0` by
  design and the CI audit job is `continue-on-error`. Exit status proves nothing —
  **read the table.** Claiming green off an exit code is exactly the failure AGENTS
  §5/§13 forbids.
- **Don't trade a security invariant for a green scan.** A scan fix must not excuse
  dropping `tenantId` scoping, `@RequirePermission(...)`, auth/secret/permission
  checks, AI approval-required gating, or the never-render-raw-AI-HTML rule
  (AGENTS §6–§7). Scans enforce these — they are not negotiable against them.
- **pnpm only, lockfile committed.** Never `npm`/`yarn` (it spawns a rival lockfile).
  Any dep change → commit the regenerated `pnpm-lock.yaml` (`dependency-audit.md` §1).
- **No `any` / no `eslint-disable`** to absorb breakage from a security upgrade —
  fix the code or hold the bump.

---

## Common mistakes

- **Calling Trivy's `0` exit "clean."** `--exit-code 0` means it always returns 0;
  it annotates. Read the findings table — the exit code tells you nothing.
- **Running `pnpm scan:trivy` / `scan:secrets` without the tool installed.** It
  errors out; that is **not** a passing scan. Install Trivy/gitleaks first
  (`SECURITY_SCANS.md`).
- **Auditing with the narrow level.** CI's audit job uses `--audit-level high`;
  locally use `--audit-level=low` (what `audit:security` runs) so you see _every_
  severity, not just high.
- **Forgetting gitleaks scans history in CI.** Deleting a leaked line locally still
  fails the hard CI gate (`fetch-depth: 0`). Rotate + scrub history.
- **Silently pinning via `overrides` or lowering a threshold** to make output green
  — forbidden; document the decision in the tracker instead (`dependency-audit.md` §5).
- **Treating a Trivy `--ignore-unfixed` finding as "no fix."** The opposite:
  `--ignore-unfixed` means everything shown **has** a fix. Take it.
- **Editing `SECURITY_SCANS.md` / rules on a routine run.** A normal scan updates
  the **tracker** (`vulnerability-remediation.md`), not the gate definitions.
- **Skipping `prisma:generate` before re-validating the API** after a fix —
  `pnpm typecheck`/`build` on the api needs the client (`pnpm --filter @auraspear/api prisma:generate`).
- **Claiming "0 vulns" from memory.** The count lives in the tracker and is only
  true if `pnpm audit` actually prints `No known vulnerabilities found.` Run it.
- **Working on `main`.** Branch before any fix (`branch-safety.md`; AGENTS §8).

---

## Final checklist

- [ ] Toolchain confirmed: Node 22, pnpm; **`trivy` and `gitleaks` installed** and on PATH.
- [ ] `pnpm install --frozen-lockfile` ran (lockfile not stale).
- [ ] Ran the scans and **read the output**, not just the exit code:
      `pnpm audit --audit-level=low` (or `pnpm audit:security`), `pnpm scan:trivy`,
      `pnpm scan:secrets`.
- [ ] **No new HIGH/CRITICAL** introduced; any new finding is **fixed** or **formally
      excepted** (owner + expiry), never waved through under existing debt.
- [ ] gitleaks clean. If it fired: secret **rotated + scrubbed from history**, line
      not merely deleted; only `*.example` (empty slots) committed.
- [ ] Findings/exceptions recorded in
      [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
      with package+path, CVE id, fix target, reason, owner, expiry (+ risk register
      if a gate stays advisory).
- [ ] **No scan weakened** (no raised `--audit-level`, no dropped `--severity`/scanner,
      no deleted tracker row, no undocumented `overrides`/ignore).
- [ ] After any fix: `pnpm typecheck` + `pnpm build` (+ `pnpm test` for risky batches)
      green; `pnpm-lock.yaml` regenerated and committed; no `any`/`eslint-disable`.
- [ ] No security/tenant/RBAC/AI invariant traded for a green scan. **Branched first
      — never worked on `main`.** Committed/pushed only if asked.

---

> **Final response format** (AGENTS §13): end with Branch / Commits / Files created /
> Files updated / Commands run / Green checks / Failed checks / Blockers / Risks /
> Next steps. Do not say "scans clean" unless you actually ran each scan and read the
> output — for Trivy and `pnpm audit`, "clean" means an empty findings table, **not**
> an exit code of `0`.
