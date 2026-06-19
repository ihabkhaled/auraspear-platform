# rules/docs/adr-rules.md — Architecture Decision Records (ADRs)

> Read [`AGENTS.md`](../../AGENTS.md) first (loading order + the one rule: _no AI
> agent may edit first and understand later_). This file governs **when** a
> decision becomes an ADR, **how** the ADR is written, and **how** it is linked
> from memory. It is the authoritative expansion of the `docs/decisions/` (ADRs)
> entry in `AGENTS.md` §12. Related: [`../global/branch-safety.md`](../global/branch-safety.md)
> (never work on `main`; prove before deleting), [`../global/validation-gates.md`](../global/validation-gates.md),
> and [`../../memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md).

Where things live:

- ADRs: `docs/decisions/ADR-XXXX-<kebab-slug>.md` (one file per decision).
- Index/summary: [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)
  (a table linking every ADR — keep it in sync).
- Existing ADRs to read before you add one: `ADR-0001` (pnpm + Turborepo
  monorepo), `ADR-0002` (Node 22 LTS), `ADR-0003` (flattened git history),
  `ADR-0004` (Zod peer for `@hookform/resolvers`), `ADR-0005` (TypeScript 5.9 +
  tsgo). These set the house style — match them.

---

## 1. When to write an ADR

Write an ADR for a **significant, hard-to-reverse decision** — one a future
contributor (or AI agent) would otherwise have to reverse-engineer from the code.
Triggers (non-exhaustive):

- **Toolchain / build**: package manager, Node version, monorepo orchestration,
  typecheck strategy (cf. `ADR-0001`, `ADR-0002`, `ADR-0005`).
- **Dependency-graph fixes** that aren't obvious from app code (cf. `ADR-0004`
  re-declaring the Zod peer via pnpm `packageExtensions`).
- **Security/tenancy/RBAC architecture**: how tenant isolation is enforced, the
  auth guard chain, the connector-secret encryption scheme (AES-256-GCM), the
  approval model for AI destructive actions. A decision that touches a security
  invariant in `AGENTS.md` §6–§7 almost always warrants an ADR.
- **AI safety**: provider cascade/routing, what "approval-required" means, why AI
  output is never rendered as raw HTML.
- **Data model / migration strategy**, cross-cutting API or contract shapes,
  CI gate policy (what's blocking vs. advisory).

**Do not** write an ADR for: a single endpoint, a bug fix, a rename, a routine
dependency bump, or anything fully captured by an existing `rules/**` file. Those
belong in code + the relevant rule/skill, not in `docs/decisions/`.

When unsure whether a decision is "significant", err toward writing a short ADR —
a one-page record is cheaper than lost context.

## 2. Numbering & file naming

- Filename: `docs/decisions/ADR-XXXX-<kebab-slug>.md`.
- `XXXX` is a **zero-padded, monotonically increasing** 4-digit number. The next
  number is **one more than the highest existing ADR** — check `docs/decisions/`
  first (highest today is `ADR-0005`, so the next is `ADR-0006`).
- Numbers are **never reused or renumbered**, even if an ADR is superseded or
  rejected. The number is a permanent ID.
- Slug is short, lowercase, hyphenated, and describes the decision
  (`monorepo-pnpm-turborepo`, `node-22-lts`, `zod-resolver-peer`).

## 3. Required structure

Every ADR uses this shape (see `ADR-0001`/`ADR-0005` for live examples). Keep it
short and concrete — paths, commands, and measured results over prose.

```markdown
# ADR-XXXX — <imperative title of the decision>

- Status: <Proposed | Accepted | Superseded by ADR-YYYY | Deprecated | Rejected>
- Date: <YYYY-MM-DD>
- Deciders: <optional — who/what milestone decided>

## Context

What forced the decision: the problem, constraints, and the relevant repo facts
(cite real paths/scripts). What was true before.

## Decision

What we chose, stated plainly. Include the concrete change (config keys, scripts,
file paths). Past examples pin exact values — do the same.

## Consequences

The results — good and bad. Trade-offs accepted, follow-ups created, what this
now constrains.

## Alternatives considered

Each viable option and the one-line reason it was rejected. ("Considered but not
chosen" is part of the record — don't omit it.)
```

Notes:

- **Status** is required and must be one of the values above. New ADRs are
  `Accepted` once merged (or `Proposed` while under review).
- **Context / Decision / Consequences / Alternatives** are all required sections.
  `ADR-0005` also adds a measured **Result** table — extra evidence sections are
  welcome; the four core sections are not optional.
- Cite **real** repo facts: file paths, `pnpm` scripts, config keys, ESLint rule
  names. No invented APIs. (The one rule: understand before you write.)

## 4. Linking from DECISIONS_MEMORY.md

An ADR isn't "done" until it's linked. In the same change that adds
`ADR-XXXX-*.md`:

- Add a row to the table in
  [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md): a markdown
  link to the ADR file (relative `../docs/decisions/...`), the decision in one
  line, and the "why" in one line. Match the existing column format.
- Cross-link from the **area** rule/memory where the decision actually bites
  (e.g. a build decision → `branch-safety.md` already references `ADR-0001`/
  `ADR-0002`; a TS decision → `memory/TECHNICAL_MEMORY.md` /
  `docs/tools/`). Don't leave an ADR orphaned in `docs/decisions/` only.
- If the decision changes a command or gate, update
  [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) and
  [`../global/validation-gates.md`](../global/validation-gates.md) as needed.

## 5. Never rewrite an accepted ADR — supersede instead

An **Accepted** ADR is an immutable historical record. When a later decision
changes or reverses it:

1. **Create a new ADR** (`ADR-YYYY`) that states the new decision, with its own
   Context/Decision/Consequences/Alternatives. In its Context, reference the ADR
   it replaces (e.g. "supersedes `ADR-0002`").
2. **Edit only the old ADR's Status line** to `Superseded by ADR-YYYY` (add a
   one-line pointer if helpful). **Do not** edit its Context/Decision/
   Consequences — the original reasoning must stay readable as it was.
3. **Update `DECISIONS_MEMORY.md`** so the table reflects the new active decision
   and points at the superseding ADR.

Allowed edits to an accepted ADR: fixing a broken link, a typo, or flipping the
**Status** line per the supersede flow above. Anything that alters the recorded
reasoning is a **new ADR**, not an edit. (This mirrors `ADR-0003`'s stance on not
rewriting history — `git blame`/the original record stays intact.)

`Proposed` ADRs (not yet merged/accepted) may still be edited freely.

## 6. Workflow checklist

- [ ] Branch first (`docs/...` or the feature branch) — **never on `main`**
      (`branch-safety.md`).
- [ ] Pick the next free `ADR-XXXX` (highest existing + 1; do not reuse numbers).
- [ ] Write all four required sections; cite real paths/scripts/values.
- [ ] Set a valid **Status** and **Date** (`YYYY-MM-DD`).
- [ ] If it replaces another ADR: add a new ADR, flip the old one's Status to
      `Superseded by ADR-XXXX` — never rewrite the old body.
- [ ] Add/refresh the row in `memory/DECISIONS_MEMORY.md` and cross-link the
      area rule/memory/docs the decision affects.
- [ ] `pnpm format` so the markdown matches Prettier; ADRs go through the normal
      gates and review like any other doc.

---

## When in doubt

A decision that changes a security/tenancy/RBAC/AI-safety invariant, the
toolchain, the data model, or a CI gate is almost certainly ADR-worthy — write
the short record now while the context is fresh. If you're reversing something,
**supersede, don't overwrite**. Surface anything you can't resolve as a blocker
per the `AGENTS.md` §13 final-response block rather than guessing.
