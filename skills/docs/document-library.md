# Skill: Document a library/tool in `docs/tools/*`

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1: _read
> before you edit_), **§0 "the one rule"** (_no AI agent may edit first and
> understand later_), the command map (**§4**), **§5 Validation gates** (_"Never
> claim 'all green' unless the required gates actually passed — run them"_), the
> security/AI **invariants (§6–7)**, **§8 Branch & safety** (_branch first; prove
> before you remove a dep/file/env_), and the docs map (**§12**, central index →
> [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md)). Then read the **authoritative
> hard rule** this recipe lives next to:
> [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
> (pnpm only · scan gates · patch/minor-first/majors-via-ADR · **prove non-use
> before removing** · document exceptions with CVE id + owner + expiry) and the
> docs contract [`rules/docs/documentation-rules.md`](../../rules/docs/documentation-rules.md)
> (docs match behavior · **link, don't duplicate** · keep the index current ·
> **code/`package.json` wins** over prose · an **invariant wins over a doc**).
> Sibling onboarding to link, never re-explain:
> [`rules/`](../../rules/), [`skills/`](../) (esp.
> [`skills/devsecops/upgrade-dependency.md`](../devsecops/upgrade-dependency.md),
> [`skills/devsecops/add-ci-gate.md`](../devsecops/add-ci-gate.md),
> [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md),
> sibling docs recipe [`skills/docs/update-docs.md`](./update-docs.md)),
> [`memory/`](../../memory/) (commands →
> [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md); decisions →
> [`DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/) (tools →
> [`docs/tools/`](../../docs/tools/)).
>
> **A library in the tree with no entry in `docs/tools/*` — or an entry that lies
> about its version, owner, or upgrade risk — is the bug, not a follow-up.** This
> recipe documents one load-bearing library/tool the way the existing entries do:
> _why · where · owner app/package · validate · upgrade risk · security notes ·
> removal criteria_ — every concrete claim traced to the repo, then proven with
> the real gate (`pnpm format:check`).

This is a **reference doc**, not a rule (see the framing in
[`docs/tools/LIBRARIES.md`](../../docs/tools/LIBRARIES.md) "What this file is").
It explains a library so a future contributor or agent does not reverse-engineer
it from `node_modules`. The **source of truth for versions is the `package.json`
files** — [`apps/web/package.json`](../../apps/web/package.json),
[`apps/api/package.json`](../../apps/api/package.json),
[`package.json`](../../package.json) (root). When this doc and a `package.json`
disagree, the `package.json` wins — fix the doc. Toolchain: **pnpm only**
(`pnpm@10.30.3`), **Node 22** (`engines.node: ">=22 <25"`). Markdown is
Prettier-formatted; the hard gate is `pnpm format:check`.

---

## When to use

Use this skill when a library/tool needs a documented entry in `docs/tools/*`, or
when an existing entry is stale. Triggers:

- You **added a direct dependency** to `apps/web`, `apps/api`, `packages/*`, or
  root — it needs a row in the matching `docs/tools/*` file (below) **and** the
  canonical version/why/risk matrix
  [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md). The
  dependency change itself goes through
  [`skills/devsecops/upgrade-dependency.md`](../devsecops/upgrade-dependency.md);
  come back here to write the tour entry.
- You **upgraded or pinned** a load-bearing library (e.g. a `next`/`react`/
  `@nestjs/*`/`prisma`/`zod`/`express` move) and its `Version` / `Upgrade risk` /
  `security notes` are now wrong.
- You **changed where/how** a library is wrapped (e.g. a new `@/components/common`
  wrapper, a new `@/lib/*` module, a new repository/util owner) so its **Where**
  is wrong.
- You are documenting a **CLI tool / scanner / formatter** (gitleaks, Trivy,
  Prettier, ESLint, Husky, `tsgo`) — same recipe, in the matching tools file.
- An audit/report flagged a dep to **verify or remove** (`date-fns`, `ws`,
  `form-data`, `multer` advisory — see
  [`docs/audit/05-dependency-report.md`](../../docs/audit/05-dependency-report.md)
  §3–§4) — its entry must carry the **removal criteria** / advisory status.

**Pick the right file** (each `docs/tools/*` already exists — extend it, do not
spawn a parallel doc):

| Tool / library kind                               | File to edit                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| General "by app" library tour (grouped overview)  | [`docs/tools/LIBRARIES.md`](../../docs/tools/LIBRARIES.md)                     |
| Web runtime/UI/state lib (`@auraspear/web`)       | [`docs/tools/FRONTEND_LIBRARIES.md`](../../docs/tools/FRONTEND_LIBRARIES.md)   |
| API runtime/data/auth lib (`@auraspear/api`)      | [`docs/tools/BACKEND_LIBRARIES.md`](../../docs/tools/BACKEND_LIBRARIES.md)     |
| AI SDK / provider / `@auraspear/ai` tooling       | [`docs/tools/AI_TOOLS.md`](../../docs/tools/AI_TOOLS.md)                       |
| Docker / Turbo / CI / pnpm / dev tooling          | [`docs/tools/DEVOPS_TOOLS.md`](../../docs/tools/DEVOPS_TOOLS.md)               |
| Security scanner (gitleaks, Trivy, audit, CodeQL) | [`docs/tools/SECURITY_TOOLS.md`](../../docs/tools/SECURITY_TOOLS.md)           |
| `typescript` / `tsgo`                             | [`docs/tools/TYPESCRIPT_AND_TSGO.md`](../../docs/tools/TYPESCRIPT_AND_TSGO.md) |

Do **not** use this skill to invent a `pnpm` script that does not exist, to
restate an invariant that lives in `AGENTS.md`/`rules/` (link it), or to duplicate
the version/why/risk row that the matrix owns — **link** it instead (§2 of the
docs rule).

---

## Files to inspect first (read before editing)

1. [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
   — the law for how deps enter/change/leave: pnpm only (§1), scan gates (§2),
   upgrade order (§3), **prove-non-use before removing** (§4), exception register
   (§5). Your "Upgrade risk", "Security notes", and "Removal criteria" lines must
   agree with it.
2. [`rules/docs/documentation-rules.md`](../../rules/docs/documentation-rules.md)
   — docs-as-contract: match behavior, link don't duplicate, keep the index
   current, code/`package.json` wins, invariant wins over a doc.
3. **The target `docs/tools/*` file** (from the table above) — read its existing
   rows/sections; you are extending an established shape, not appending a new one.
   [`docs/tools/LIBRARIES.md`](../../docs/tools/LIBRARIES.md) defines the
   **Why · Where · Validate · Upgrade risk** column convention — match it.
4. **The `package.json` that declares the dep** — the version, the `dependencies`
   vs `devDependencies` placement (dev/test-only never ships in the Docker images
   — note that), and the workspace it belongs to. This is the version source of
   truth: [`apps/web/package.json`](../../apps/web/package.json),
   [`apps/api/package.json`](../../apps/api/package.json),
   [`package.json`](../../package.json).
5. **The wrapper/owner in code** — where the library is actually used (most are
   wrapped, not used raw): web wrapping rules in
   [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (e.g. third-party UI behind
   `@/components/common`, web rule #63; dates only via `@/lib/dayjs`); api layering
   in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (Prisma only in repositories,
   api rule 14a; outbound HTTP SSRF-validated, api rule #59).
6. **The canonical matrix + audit docs** you will link instead of copy:
   [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md)
   (version/why/risk of record),
   [`docs/audit/05-dependency-report.md`](../../docs/audit/05-dependency-report.md)
   (inventory, duplication, "verify direct usage" cases),
   [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
   (live `pnpm audit` tracker + exception register).
7. [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) and
   [`AGENTS.md`](../../AGENTS.md) §4 — confirm any **validation command** you cite
   is a real root script (don't invent `pnpm docs:lint`; it does not exist).

> **Verify before you write.** Every concrete claim — version, owner app/package,
> wrapper path, validate command, rule number, advisory id — must be true against
> the current repo. Find what already references the library so you don't create a
> second (contradictory) home:
>
> ```bash
> # version + placement (source of truth) — which workspace declares it, dep vs devDep?
> grep -rn "\"<pkg>\"" package.json apps/web/package.json apps/api/package.json packages/*/package.json
> # who actually imports it (the real "Where" / owner)?
> grep -rn "from '<pkg>'\|require('<pkg>')" apps/web/src apps/api/src packages/*/src
> # is it already documented somewhere (don't fork the truth)?
> grep -rni "<pkg>" docs/tools/ docs/audit/dependency-matrix.md docs/audit/05-dependency-report.md
> ```

---

## Exact step-by-step implementation

> Branch first — **never work on `main`**
> ([`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)):
>
> ```bash
> git switch -c docs/tools-<pkg>     # or ride along the feat/fix branch that added the dep
> ```
>
> If you are documenting a dep you just **added/upgraded**, the tools entry rides
> in the **same branch/PR** as that change (a doc describing the old state is an
> incomplete change). A standalone `docs/tools-...` branch is for fixing a stale
> entry you found.

### Step 1 — Pin the facts from `package.json` and the code

Read the declaring `package.json` and record, verbatim:

- **Exact version range** as written (`^4.3.6`, `16.2.9`, a pinned override) —
  quote it; don't paraphrase. If it's pinned for a reason (advisory cleared, peer
  fix), note that.
- **Owner app/package**: `@auraspear/web`, `@auraspear/api`, a `packages/*`, or
  root — and whether it's `dependencies` (ships) or `devDependencies` (dev/test
  only, never in the Docker images).
- **Where it's used** from the grep: the wrapper module/owner (e.g.
  `@/lib/api` for axios, the repository layer for Prisma, `main.ts` for helmet),
  not "everywhere."

### Step 2 — Write the entry in the matching `docs/tools/*` file

Match the **house shape** of the file you're editing. For
`LIBRARIES.md`/`FRONTEND_LIBRARIES.md`/`BACKEND_LIBRARIES.md` that is a table row
in the right section with the four-part **Why · Where · Validate · Upgrade risk**
cell; for a CLI/scanner doc it's a short subsection. Cover every required facet:

- **Why used** — the one reason it's in the tree (what breaks without it). One
  sentence, concrete.
- **Where** — the wrapper/module/owner that uses it, with the path. Cite the
  governing `CLAUDE.md` rule if the wrapper is mandatory (e.g. "never import
  `Virtuoso` raw, web rule #63"; "Prisma only in repositories, api rule 14a").
- **Owner app/package** — `@auraspear/web` / `@auraspear/api` / `packages/*` /
  root, dep vs devDep.
- **Validation command** — the **real** gate(s) to run after touching it (Step 4),
  e.g. `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e`,
  `pnpm lint:strict`. Per
  [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md).
- **Upgrade risk** — `low` / `medium` / `high`, **consistent with**
  [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md).
  Framework majors (`next`, `react`, `@nestjs/*`, `prisma`, `express`, `zod`) are
  `medium`+ and need an ADR + dedicated PR (dependency-audit §3) — say so.
- **Security notes** — anything security-relevant: SSRF-validated URLs
  (`apps/api/CLAUDE.md` #59), AES-256-GCM at rest, credential redaction
  (#57/#66), HS256-only JWT (#29/#38), `--audit-level` posture, or an open
  advisory with its `GHSA-…`/`CVE-…` id and fix target. If none, say "no direct
  security surface."
- **Removal criteria** — when this dep may be dropped, and the **proof** required
  first (dependency-audit §4: grep every consumer, distinguish "direct but
  transitively satisfied" from "truly unused", check proxy routes/Docker/CI/
  migrations). For audit-flagged deps, link the exact case (e.g. `date-fns` is a
  flagged `dayjs` duplicate, [report §3.2](../../docs/audit/05-dependency-report.md);
  `ws`/`form-data` migration-added, [report §4](../../docs/audit/05-dependency-report.md)).

### Step 3 — Link the canonical homes; do not duplicate

One fact, one home (docs rule §2). **Link** the matrix/report/remediation/ADR
instead of copying their numbers:

- Version/why/upgrade posture of record → link
  [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md).
- Duplication / "verify direct usage" findings → link
  [`docs/audit/05-dependency-report.md`](../../docs/audit/05-dependency-report.md).
- Open advisory + remediation plan → link
  [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md).
- A major-version decision → link the ADR in
  [`docs/decisions/`](../../docs/decisions/) (e.g. Zod-resolver peer ADR-0004,
  tsc/tsgo ADR-0005).
- A mandatory wrapping/usage rule → link the `CLAUDE.md` rule number, don't restate
  it.

### Step 4 — Keep the index current (if you added a new tools doc)

You are normally **extending** an existing `docs/tools/*` file, so the index entry
already exists. **Only if** you create a brand-new `docs/tools/*.md`, add it to
[`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) under the `tools/` line (docs rule
§3; sibling recipe [`skills/docs/update-docs.md`](./update-docs.md) Step 4). Do
not silently add a file the index doesn't know about.

### Step 5 — Format the markdown

```bash
pnpm format        # Prettier rewrites your table/wrapping to house style
```

---

## Validation commands (run these — do not assume)

Run from the repo root. **pnpm only**, Node 22 ([`AGENTS.md`](../../AGENTS.md) §4;
[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)). For a docs-only
change the **hard gate is `pnpm format:check`**.

```bash
# 1. HARD GATE for docs — Prettier must be clean (pre-commit + CI run this).
pnpm format:check

# 2. Prove the VERSION you wrote matches package.json (it is the source of truth).
grep -rn "\"<pkg>\"" package.json apps/web/package.json apps/api/package.json packages/*/package.json

# 3. Prove the OWNER / "Where" — that the wrapper path you cited really imports it.
grep -rn "from '<pkg>'\|require('<pkg>')" apps/web/src apps/api/src packages/*/src
ls <every wrapper/module path you cited>

# 4. Prove every VALIDATION COMMAND you cited is a real root script (no invented ones).
pnpm run            # lists real scripts; compare against AGENTS.md §4 + COMMANDS_MEMORY.md

# 5. Security posture you claimed is real — run the scans you reference (no NEW HIGH/CRITICAL).
pnpm audit:security # pnpm audit --audit-level=low && trivy fs (dependency-audit §2)
pnpm scan:secrets   # gitleaks — also confirms you pasted no secret into the doc

# 6. If you edited a code sample (not just prose): blocking typecheck.
pnpm typecheck

# 7. Advisory full pass:
pnpm validate       # typecheck + lint:strict + format:check
```

> **Do not claim a gate is green unless you ran it and saw it pass**
> ([`AGENTS.md`](../../AGENTS.md) §5;
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)).
> The `qa-gatekeeper` subagent rejects claims without command output. There is
> **no `pnpm docs:lint`** in this repo — link/claim checking is the greps above
> plus `pnpm format:check`. The workspace may be mid-upgrade; if `pnpm install`
> is not currently runnable, treat the scan commands as references and document
> that in your report rather than faking output (see the note in
> [`docs/tools/LIBRARIES.md`](../../docs/tools/LIBRARIES.md)).

---

## Docs to update

- The **target `docs/tools/*` file** (the one row/section you wrote).
- [`docs/audit/dependency-matrix.md`](../../docs/audit/dependency-matrix.md) — the
  table-of-record version/why/upgrade-risk row, **if** you added/upgraded the dep
  (the tools doc links it; the matrix owns it). Keep the two consistent.
- [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
  — **if** the library carries an open advisory or you accepted a time-boxed
  exception (CVE id + fix target + owner + expiry; dependency-audit §5).
- [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) — **only if** you created a new
  `docs/tools/*.md` file (Step 4).
- An **ADR** in [`docs/decisions/`](../../docs/decisions/) — **only if** you're
  documenting a load-bearing **major** decision; then use
  [`skills/docs/add-adr.md`](./add-adr.md) and note it in
  [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md).
- Cross-doc sweep for anything that referenced the old version/owner → use the
  sibling recipe [`skills/docs/update-docs.md`](./update-docs.md).

---

## Security checks (non-negotiable)

- [ ] **No secret, key, token, host, port, or real `.env` value** pasted into the
      doc or any example. Connector/JWT/encryption secrets stay **empty + comment**
      ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #53). `pnpm scan:secrets`
      (gitleaks) is clean.
- [ ] **No internal service URL/host/port** disclosed in a snippet
      (`apps/api/CLAUDE.md` #60/#81).
- [ ] **Security notes don't weaken an invariant.** The entry never implies you
      can skip auth, tenant scoping (`tenantId` on every tenant-owned query/
      `update`/`delete`), `@RequirePermission`, AES-256-GCM connector-secret
      encryption, SSRF validation on outbound URLs, or AI **approval-required**
      gating for destructive actions ([`AGENTS.md`](../../AGENTS.md) §6–7;
      `apps/api/CLAUDE.md` #23/#25/#26/#56/#59). If prose contradicts an invariant,
      the **invariant wins and the doc is the bug**.
- [ ] **For an AI/provider lib**: the entry still says AI output is rendered as
      markdown/plain text, **never raw HTML**
      ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #43), and PII/secrets are
      redacted before model calls.
- [ ] **Any open advisory is recorded, not buried** — its `GHSA-…`/`CVE-…`, fix
      target, owner, and expiry live in
      [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
      (dependency-audit §5). You did not suppress it by lowering `--audit-level`.
- [ ] **Ran `pnpm audit:security`** and introduced no **new** HIGH/CRITICAL via
      whatever dep this entry documents.

---

## Common mistakes

- **Inventing the version instead of quoting `package.json`.** The `package.json`
  is the source of truth; when the doc and it disagree, fix the doc.
- **Duplicating the matrix row** (version/why/risk) into the tools doc instead of
  linking [`dependency-matrix.md`](../../docs/audit/dependency-matrix.md) — the copy
  goes stale and lies (docs rule §2).
- **Vague "Where" ("used everywhere").** Name the wrapper/owner path and the
  `CLAUDE.md` rule that mandates wrapping it (web #63; api 14a/#59).
- **Citing a validation command that doesn't exist** (`pnpm docs:lint`,
  `pnpm depcheck`). Prove it with `pnpm run` first.
- **Guessing the upgrade risk** instead of aligning with the matrix; calling a
  framework major `low` (it's `medium`+ and needs an ADR + dedicated PR,
  dependency-audit §3).
- **Removal criteria with no proof step.** "Probably unused" is not a criterion —
  the criterion is the greps + proxy/Docker/CI/migration check from
  dependency-audit §4. Confusing "direct but transitively satisfied" with "truly
  unused" (`date-fns`, `ws`, `form-data` — report §3–§4).
- **Pasting a secret/key/internal URL** into an example to "show config."
- **Spawning a new `docs/tools/*.md`** for a library that belongs in an existing
  file, then forgetting [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).
- **Hand-formatting the table** Prettier will rewrite — run `pnpm format`, then
  `pnpm format:check`.
- **Claiming "documented, all green"** without running `pnpm format:check`
  ([`AGENTS.md`](../../AGENTS.md) §5).

---

## Final checklist

- [ ] Branched off `main` (`docs/tools-...` or the riding `feat/`/`fix/` branch).
- [ ] Entry lands in the **correct** existing `docs/tools/*` file (table above),
      matching its house shape — not a parallel doc.
- [ ] Covers every facet: **why used · where (wrapper/owner path + rule) · owner
      app/package (dep vs devDep) · validation command · upgrade risk · security
      notes · removal criteria**.
- [ ] **Version quoted from `package.json`** (source of truth) and verified by grep;
      owner workspace and dep/devDep placement correct.
- [ ] **Upgrade risk consistent** with
      [`dependency-matrix.md`](../../docs/audit/dependency-matrix.md); any framework
      major flagged as ADR-worthy (dependency-audit §3).
- [ ] **Linked, not duplicated**: matrix / `05-dependency-report.md` /
      `vulnerability-remediation.md` / ADR / the `CLAUDE.md` rule number.
- [ ] **Removal criteria** state the proof required (greps + proxy/Docker/CI/
      migration check, dependency-audit §4); audit-flagged deps link the case.
- [ ] **Every validation command cited is a real root script** (`pnpm run`
      confirmed); no invented gate.
- [ ] No secret/key/internal URL in the doc/example; no invariant weakened; AI
      libs keep "no raw AI HTML" + redaction; any open advisory recorded with
      CVE id + owner + expiry.
- [ ] `pnpm scan:secrets` clean; `pnpm audit:security` introduced no new
      HIGH/CRITICAL; `pnpm format` then `pnpm format:check` passes (and
      `pnpm typecheck` if a code sample changed).
- [ ] [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) updated **only if** a new
      `docs/tools/*.md` was created.
- [ ] Final response uses the [`AGENTS.md`](../../AGENTS.md) §13 report format; no
      "all green" unless the hard gate (`pnpm format:check`) actually passed — list
      the exact file(s) in `Files updated:`.
