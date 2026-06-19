# Skill: Add an Architecture Decision Record (ADR)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1: rules →
> skills → docs → then edit), **the one rule** (_"No AI agent may edit first and
> understand later"_), §5 "Validation gates" (_"Never claim 'all green' unless the
> required gates actually passed — run them"_), §8 "Branch & safety" (_"Never work
> directly on `main`"_; _"read, merge, improve, link — don't blindly overwrite"_),
> and §12 (docs map: `docs/decisions/` holds ADRs). Then read the **authoritative
> hard rule** behind this skill: [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md)
> — it governs **when** a decision is ADR-worthy, the required structure, numbering,
> and the supersede-don't-rewrite law. This skill is the followable recipe; that
> file is the constraint. Sibling onboarding to link from your ADR/PR:
> [`rules/`](../../rules/) (esp. [`rules/docs/`](../../rules/docs/),
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
> [`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/)),
> [`skills/`](../), [`memory/`](../../memory/) (index →
> [`DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md), commands →
> [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md), stable truths →
> [`TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/) (index →
> [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md), ADRs →
> [`docs/decisions/`](../../docs/decisions/)).
>
> **No AI agent may edit first and understand later.** An ADR is the permanent
> record a future contributor (or agent) reads to avoid reverse-engineering a
> decision from code. An **Accepted** ADR is immutable history — rewriting its
> reasoning destroys the record. Read the five existing ADRs (`ADR-0001` …
> `ADR-0005`) before you write one: they set the house style and you must match it.

This recipe adds **one** ADR file at `docs/decisions/ADR-XXXX-<kebab-slug>.md`,
links it from [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md), and
cross-links the area rule/memory the decision affects — without ever rewriting an
accepted ADR. The existing ADRs are your template; copy their shape, don't invent
a new one.

---

## When to use

Use this skill when a **significant, hard-to-reverse decision** is being made —
one a future contributor would otherwise have to reverse-engineer from the code.
Per [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md) §1, the triggers
(non-exhaustive) are:

- **Toolchain / build / CI**: package manager, Node version, monorepo
  orchestration, typecheck strategy, what's a blocking vs. advisory gate (cf.
  [`ADR-0001`](../../docs/decisions/ADR-0001-monorepo-pnpm-turborepo.md) pnpm +
  Turborepo, [`ADR-0002`](../../docs/decisions/ADR-0002-node-22-lts.md) Node 22,
  [`ADR-0005`](../../docs/decisions/ADR-0005-typescript-and-tsgo.md) tsc + tsgo).
- **Dependency-graph fixes** not obvious from app code (cf.
  [`ADR-0004`](../../docs/decisions/ADR-0004-zod-resolver-peer.md) re-declaring the
  Zod peer via pnpm `packageExtensions`).
- **Security / tenancy / RBAC architecture**: how tenant isolation is enforced, the
  auth-guard chain, the AES-256-GCM connector-secret scheme, the approval model for
  AI destructive actions. A decision touching an `AGENTS.md` §6–§7 invariant almost
  always warrants an ADR.
- **AI safety**: provider cascade/routing, what `approval-required` means, why AI
  output is never rendered as raw HTML.
- **Data model / migration strategy**, cross-cutting API/contract shapes.

**Do NOT** write an ADR for a single endpoint, a bug fix, a rename, a routine
dependency bump, or anything fully captured by an existing `rules/**` file — those
live in code + the relevant rule/skill, not in `docs/decisions/`. When unsure,
err toward a short one-page ADR (cheaper than lost context).

**Superseding an existing decision?** You still use this skill to write the **new**
ADR — see step 6. You never rewrite the old one's body.

## Files to inspect first (read before you write)

| File                                                                                                             | Why                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AGENTS.md`](../../AGENTS.md)                                                                                   | Loading order, the one rule, §5 gates, §8 branch safety, §12 docs map.                                                                                                                                                                                                                          |
| [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md)                                                       | The authoritative rule: when, structure, numbering, supersede law, workflow checklist.                                                                                                                                                                                                          |
| [`docs/decisions/`](../../docs/decisions/)                                                                       | List the directory — find the **highest** existing `ADR-XXXX` so you pick the next number. Today the highest is `ADR-0005`, so the next is `ADR-0006` (verify, don't assume).                                                                                                                   |
| [`docs/decisions/ADR-0001-monorepo-pnpm-turborepo.md`](../../docs/decisions/ADR-0001-monorepo-pnpm-turborepo.md) | House style for a toolchain decision with `Deciders`.                                                                                                                                                                                                                                           |
| [`docs/decisions/ADR-0005-typescript-and-tsgo.md`](../../docs/decisions/ADR-0005-typescript-and-tsgo.md)         | House style + an extra measured **Result** table (extra evidence sections are welcome; the four core sections are not optional).                                                                                                                                                                |
| [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)                                                 | The index table you must add a row to. Match its 3-column format exactly.                                                                                                                                                                                                                       |
| The **area** rule/memory the decision bites                                                                      | e.g. a build decision → [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md) (already references `ADR-0001`/`ADR-0002`); a TS decision → [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md) + [`docs/tools/`](../../docs/tools/). Don't leave the ADR orphaned. |

## Exact step-by-step implementation

### 1. Branch first (never `main`)

```bash
git checkout -b docs/adr-<short-slug>
```

`AGENTS.md` §8 and [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md):
never work directly on `main`. Use a `docs/...` (or the feature) branch.

### 2. Pick the next ADR number

List `docs/decisions/` and find the highest `ADR-XXXX`. The next number is
**highest + 1**, zero-padded to 4 digits, **monotonically increasing**. Numbers are
**never reused or renumbered**, even for superseded/rejected ADRs — the number is a
permanent ID. (Highest today: `ADR-0005` → next is `ADR-0006`; confirm by listing
the directory.)

### 3. Choose the filename

`docs/decisions/ADR-XXXX-<kebab-slug>.md`. The slug is short, lowercase,
hyphenated, and describes the decision — mirror the existing names
(`monorepo-pnpm-turborepo`, `node-22-lts`, `zod-resolver-peer`,
`typescript-and-tsgo`). No spaces, no uppercase, no `_`.

### 4. Write the ADR (all four required sections)

Create the file with **exactly** this shape (from
[`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md) §3 — see `ADR-0001` /
`ADR-0005` for live examples). Keep it short and concrete: real paths, `pnpm`
scripts, config keys, ESLint rule names, measured results — not prose.

```markdown
# ADR-XXXX — <imperative title of the decision>

- Status: Accepted
- Date: 2026-06-20
- Deciders: <optional — who/what milestone decided>

## Context

What forced the decision: the problem, constraints, and relevant repo facts
(cite real paths/scripts). What was true before.

## Decision

What we chose, stated plainly. Pin the concrete change — config keys, scripts,
file paths, exact values. (Past ADRs pin exact versions/keys; do the same.)

## Consequences

The results — good **and** bad. Trade-offs accepted, follow-ups created, what
this now constrains.

## Alternatives considered

Each viable option and the one-line reason it was rejected. ("Considered but not
chosen" is part of the record — don't omit it.)
```

Rules for the body:

- **Status** is required, one of: `Proposed` | `Accepted` | `Superseded by ADR-YYYY`
  | `Deprecated` | `Rejected`. A new ADR is `Accepted` once it merges (or
  `Proposed` while under review).
- **Date** is required, `YYYY-MM-DD` (today: `2026-06-20`).
- All four sections — **Context / Decision / Consequences / Alternatives
  considered** — are required. Extra evidence (a measured **Result** table like
  `ADR-0005`) is welcome on top; the four are not optional.
- Cite **real** repo facts only. No invented APIs, scripts, or config keys. (The
  one rule: understand before you write.)
- If the decision touches a **security / tenancy / RBAC / AI-safety invariant**
  (`AGENTS.md` §6–§7), the Decision section must state how the invariant is
  _upheld_, never weakened — e.g. tenant scoping by `tenantId`, `@RequirePermission`
  on every endpoint, AI destructive actions remain `approval-required` with a
  persisted approval, AI output is never rendered as raw HTML. An ADR is a record,
  not a license to bypass an invariant.

### 5. Link it from `DECISIONS_MEMORY.md` (in the same change)

An ADR isn't "done" until it's linked. Add one row to the table in
[`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md), matching the
existing 3-column format: a relative markdown link to the ADR
(`../docs/decisions/ADR-XXXX-<slug>.md`), the **decision** in one line, and the
**why** in one line.

```markdown
| [ADR-XXXX](../docs/decisions/ADR-XXXX-<slug>.md) | <one-line decision> | <one-line why> |
```

Then **cross-link the area** where the decision actually bites so it isn't orphaned
in `docs/decisions/` only — e.g. a build/branch decision → reference it in
[`rules/global/branch-safety.md`](../../rules/global/branch-safety.md) (already
cites `ADR-0001`/`ADR-0002`); a toolchain/TS decision →
[`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md) and the matching
[`docs/tools/`](../../docs/tools/) reference (e.g. `ADR-0005` →
`docs/tools/TYPESCRIPT_AND_TSGO.md`).

### 6. Only if you are reversing/replacing an existing ADR (supersede — never rewrite)

An **Accepted** ADR is immutable history. To change or reverse it (per
`rules/docs/adr-rules.md` §5):

1. **Write a new ADR** (`ADR-YYYY`, next free number) with its own
   Context/Decision/Consequences/Alternatives. In its **Context**, reference the
   ADR it replaces (e.g. _"supersedes `ADR-0002`"_).
2. **Edit only the old ADR's `Status` line** to `Superseded by ADR-YYYY` (optionally
   a one-line pointer). **Do NOT** touch its Context/Decision/Consequences — the
   original reasoning must stay readable as written. (Allowed edits to an accepted
   ADR: fix a broken link, a typo, or flip the Status line per this flow — nothing
   that alters the recorded reasoning.)
3. **Update `DECISIONS_MEMORY.md`** so the table reflects the now-active decision
   and points at the superseding ADR.

`Proposed` ADRs (not yet merged/accepted) may still be edited freely.

### 7. Update any command/gate docs the decision changes

If the decision changes a command or a CI gate, also update
[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) and the validation-gate
reference so they stay the single source of truth (`rules/docs/adr-rules.md` §4).

## Validation commands (real `pnpm` commands — run from repo root)

ADRs are markdown and go through the normal doc gates. Run these and **read the
output** — `AGENTS.md` §5: never claim green without running the gate.

```bash
# Format the new/edited markdown to Prettier (rules/docs/adr-rules.md §6 checklist)
pnpm format

# Verify formatting is clean (the check gate — what CI runs)
pnpm format:check
```

- `pnpm format` / `pnpm format:check` are the root scripts (see `AGENTS.md` §4
  command map and [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)).
- `pnpm typecheck` / `pnpm build` / `pnpm lint` are **code** gates — a docs-only ADR
  change does not touch TypeScript, so they aren't required for this change. Do not
  claim they "pass" for an ADR unless you actually ran them. If your change also
  edited code (e.g. you wired a config the ADR records), run the full
  [`pnpm validate`](../../memory/COMMANDS_MEMORY.md) and report real results.
- Sanity-check every relative link you added resolves (the ADR file exists at the
  path, the `DECISIONS_MEMORY.md` row points to it). Broken links are the most
  common ADR defect.

## Docs to update (checklist of touch-points)

- [ ] `docs/decisions/ADR-XXXX-<slug>.md` — the new ADR (required).
- [ ] [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md) — new table
      row linking the ADR (required; the ADR is not "done" without it).
- [ ] The **area** rule/memory/doc the decision affects — cross-link it (e.g.
      [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
      [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md),
      [`docs/tools/`](../../docs/tools/), or the relevant `rules/security/` /
      `rules/ai/` file). Don't leave the ADR orphaned.
- [ ] [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) +
      validation-gate doc — **only if** the decision changed a command or gate.
- [ ] When **superseding**: the old ADR's `Status` line flipped to
      `Superseded by ADR-XXXX` (body untouched).

## Security checks (an ADR must not weaken an invariant)

- [ ] **No secrets in the ADR.** Never paste a real key, token, password, or
      connector credential into `docs/decisions/`. gitleaks (an `AGENTS.md` §5 hard
      gate) will flag it. Use placeholders / `*.example`-style references only.
- [ ] **Invariants stay upheld, never bypassed.** If the decision touches
      `AGENTS.md` §6–§7, the Decision section states how tenant isolation
      (`tenantId` scoping), RBAC (`@RequirePermission` on every endpoint), auth (no
      bypass in any environment), secret-at-rest (AES-256-GCM), AI approval-required
      destructive actions, and "never render raw AI output as HTML" are _preserved_.
      An ADR may record a trade-off; it may not record a security bypass.
- [ ] **No internal hostnames / credentials / private URLs** copied into the
      record (same hygiene as `apps/api/CLAUDE.md` rules on not leaking internal
      paths/URLs).
- [ ] **Supersede, don't rewrite.** Erasing an accepted ADR's reasoning is itself a
      record-integrity violation — mirror `ADR-0003`'s stance on not rewriting
      history.

## Common mistakes

- **Reusing or skipping a number.** The next ADR is highest-existing **+ 1**, never
  a gap-fill, never a reuse. List `docs/decisions/` to confirm.
- **Rewriting an accepted ADR's body** to reflect a new decision. Wrong — write a
  **new** ADR and flip the old `Status` to `Superseded by ADR-YYYY` (step 6).
- **Forgetting the `DECISIONS_MEMORY.md` row** (or pointing it at the wrong path).
  An unlinked ADR is invisible. Use a relative `../docs/decisions/...` link.
- **Orphaning the ADR** in `docs/decisions/` with no cross-link from the area rule/
  memory the decision affects.
- **Omitting a required section.** All four — Context, Decision, Consequences,
  Alternatives considered — are mandatory. "We didn't consider alternatives" is not
  acceptable; state the options and why each was rejected.
- **Vague prose instead of facts.** Pin exact paths, scripts, config keys, versions,
  and measured results (see `ADR-0005`'s Result table).
- **Invalid `Status` / `Date`.** Status must be one of the allowed values; Date must
  be `YYYY-MM-DD`.
- **Wrong filename casing.** `ADR-XXXX-<kebab-slug>.md` — lowercase, hyphenated slug.
- **Writing an ADR for a non-decision** (a rename, a bug fix, a routine bump). That
  belongs in code + a rule/skill, not `docs/decisions/`.
- **Skipping `pnpm format`** so CI's `format:check` fails on the new markdown.
- **Claiming gates green without running them** (`AGENTS.md` §5).

## Final checklist

- [ ] Branched off `main` (`docs/adr-<slug>`).
- [ ] Read `AGENTS.md`, `rules/docs/adr-rules.md`, and at least `ADR-0001` +
      `ADR-0005` before writing.
- [ ] Picked the next free `ADR-XXXX` (highest existing + 1; no reuse).
- [ ] File at `docs/decisions/ADR-XXXX-<kebab-slug>.md` with valid `Status` +
      `Date` and all four required sections, citing real repo facts.
- [ ] Added the linking row in `memory/DECISIONS_MEMORY.md`.
- [ ] Cross-linked the area rule/memory/doc the decision affects (not orphaned).
- [ ] Updated `COMMANDS_MEMORY.md` / validation-gate doc **if** a command/gate
      changed.
- [ ] If superseding: new ADR written; old ADR's `Status` flipped only; old body
      untouched; memory table updated.
- [ ] No secrets, no leaked internal URLs; touched invariants stated as upheld.
- [ ] Ran `pnpm format` and `pnpm format:check` and read the output (green for real).
- [ ] Verified every new relative link resolves.
- [ ] Finished with the `AGENTS.md` §13 response block (Branch / Commits / Files /
      Commands run / Green checks / Blockers / …) — no "all green" unless the
      required gates actually passed.

```

```
