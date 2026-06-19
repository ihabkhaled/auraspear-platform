# Skill: Update docs after a behavior change (no stale/contradictory docs)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1: _read
> before you edit_), **§0 "the one rule"** (_no AI agent may edit first and
> understand later_), the command map (**§4**), **§5 Validation gates** (_"Never
> claim 'all green' unless the required gates actually passed — run them"_), the
> security/AI **invariants (§6–7)**, **§8 Branch & safety**, and the docs map
> (**§12**, central index → [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md)). Then
> read the authoritative hard rule this recipe operationalizes:
> [`rules/docs/documentation-rules.md`](../../rules/docs/documentation-rules.md)
> (docs as a contract: docs must match behavior, **link don't duplicate**, keep
> the index current, update INSTALL/ENVIRONMENT when setup changes, **code wins**
> over a guide — but an **invariant wins over a doc**). ADR conventions:
> [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md) and the peer source of
> truth [`.cursor/rules/07-docs.mdc`](../../.cursor/rules/07-docs.mdc) — keep the
> two aligned. Sibling onboarding to link, never re-explain:
> [`rules/`](../../rules/), [`skills/`](../), [`memory/`](../../memory/)
> (commands → [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md); decisions →
> [`DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/).
>
> **A code/config change that leaves its docs describing the old behavior is an
> incomplete change, not a follow-up.** Update the doc in the **same** branch/PR.
> This skill is the recipe for doing that completely, with no stale prose, no
> broken links, no duplicated facts, and `docs/DOCS_INDEX.md` still accurate.

This recipe takes a **behavior change you just made** (an endpoint, a layering
move, an env var, an AI/security policy, a new pnpm script, a renamed/removed
file) and walks the docs that describe it to truth, then proves it with the real
gates. Toolchain: **pnpm only** (`pnpm@10`), **Node 22** (`engines.node:
">=22 <25"`). Markdown is Prettier-formatted; the gate is `pnpm format:check`.

---

## When to use

Use this skill **as the closing step of any change that alters observable
behavior, setup, or contracts** — or on its own when you find a stale doc. Any of
these is a trigger:

- You added/changed/removed an **API endpoint** or a Next.js `app/api/**` proxy
  route → [`docs/API.md`](../../docs/API.md).
- You changed **layering / module structure / runtime** →
  [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (+
  [`docs/architecture/`](../../docs/architecture/)).
- You changed **AI** governance, provider cascade, memory, agents, or approval
  policy → [`docs/AI.md`](../../docs/AI.md) (+ [`docs/ai/`](../../docs/ai/)) and
  [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md).
- You changed **auth / RBAC / tenancy / secrets / connector encryption** →
  [`docs/SECURITY.md`](../../docs/SECURITY.md) (+
  [`docs/security/`](../../docs/security/)) and
  [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md).
- You added/renamed/removed an **env var** → use the canonical
  [`skills/devsecops/add-env-variable.md`](../devsecops/add-env-variable.md), whose
  **Path C** owns [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md). Come back
  here for index + cross-doc sweep.
- You changed **install / run / deploy / ops** → [`INSTALL.md`](../../INSTALL.md),
  [`apps/api/INSTALL.md`](../../apps/api/INSTALL.md),
  [`apps/web/INSTALL.md`](../../apps/web/INSTALL.md),
  [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md),
  [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md),
  [`docs/TROUBLESHOOTING.md`](../../docs/TROUBLESHOOTING.md).
- You added a **pnpm script / command** →
  [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) **and** the
  [`AGENTS.md`](../../AGENTS.md) §4 command map.
- You changed **product / feature scope** →
  [`docs/PRODUCT.md`](../../docs/PRODUCT.md),
  [`docs/ROADMAP.md`](../../docs/ROADMAP.md).
- You added/changed an **ESLint-enforced numbered rule** → the numbered list in
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (#1–100) or
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (#1–63) — **not** `docs/`.
- You added a **new top-level doc, a `docs/<area>/` dir, or a new ADR** → it must
  appear in [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).

Do **not** use this skill to invent new prose where code is the source of truth, or
to duplicate a fact that already has a home — link to it instead (§2 below).

---

## Files to inspect first (read before editing)

1. [`rules/docs/documentation-rules.md`](../../rules/docs/documentation-rules.md)
   — the law. The **"You changed… → Update"** matrix (§1) is your routing table;
   §2 link-don't-duplicate; §3 index; §4 INSTALL/ENVIRONMENT; §5 code-wins/
   invariant-wins; §6 style; §7 branch+validate.
2. [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) — the central map
   ([`AGENTS.md`](../../AGENTS.md) §12 points here). Confirm every doc you touch
   (and every new one) is listed in the right section.
3. **The actual doc(s) the matrix routed you to** — read the current text before
   you rewrite it; you are fixing it forward to match behavior, not appending.
4. **The code/config you just changed** — the doc must mirror _this_, not your
   memory. The repo is the source of truth (§5: code wins).
5. The relevant **enforced law** so the doc points at where a rule lives rather
   than restating it: [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md),
   [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md), the area
   [`rules/`](../../rules/), and the matching
   [`.cursor/rules/`](../../.cursor/rules/) `*.mdc`.
6. [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) and
   [`AGENTS.md`](../../AGENTS.md) §4 — only if you added/renamed a command; they
   must agree with the real root [`package.json`](../../package.json) `scripts`.
7. The peer source of truth for ADR format,
   [`.cursor/rules/07-docs.mdc`](../../.cursor/rules/07-docs.mdc), if you are
   adding an ADR (also read [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md)
   and the existing [`docs/decisions/`](../../docs/decisions/) ADR-0001..0005).

> **Verify before you write (§5).** Every concrete claim — file path, command,
> script, env var, endpoint, permission key, rule number — must be true against the
> current repo. Find what the doc currently says about your change so you fix the
> exact stale lines:
>
> ```bash
> # what mentions the thing you changed, across docs + onboarding?
> grep -rni "MyEndpoint\|MY_NEW_VAR\|myFeature" \
>   docs/ README.md INSTALL.md apps/api/CLAUDE.md apps/web/CLAUDE.md \
>   rules/ skills/ memory/ context/ .cursor/rules/
> ```

---

## Exact step-by-step implementation

> Branch first — **never work on `main`**
> ([`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)):
>
> ```bash
> git switch -c docs/update-<topic>     # or your feat/fix branch if docs ride along
> ```
>
> Docs ideally ride in the **same branch/PR** as the behavior change (§1). A
> standalone `docs/...` branch is for fixing a stale doc you found.

### Step 1 — Route the change to its doc(s)

Open [`rules/docs/documentation-rules.md`](../../rules/docs/documentation-rules.md)
§1 and find every row that matches what you changed. A single change often hits
several rows (e.g. a new permission touches `docs/SECURITY.md`, the app
`CLAUDE.md` numbered rule, **and** i18n in all 6 locales — see
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #85 /
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #34). Write down the full list
before editing one file.

### Step 2 — Fix each doc forward to match real behavior

For every routed doc:

- **Read the current text, then edit the exact stale lines** to describe what the
  code does **now**. Don't append a new "Update:" paragraph next to a wrong one —
  that leaves two truths. Don't change code to match a wrong doc (§5).
- **Cite paths, not vibes** (§6). State a fact, then point at where it is enforced
  (a `CLAUDE.md` rule number, an ESLint rule, an ADR, a file path) instead of
  re-explaining it.
- **House style** (§6): ATX `#` headings, short scannable bullets, fenced code
  blocks with a language tag, **relative** links. No fluff, no marketing copy in
  technical docs. Don't hand-format tables Prettier will rewrite — let `pnpm
format` do it (Prettier: `lf`, print width 100, `es5` trailing commas).

### Step 3 — Link, do not duplicate (§2)

One fact, one home. If the fact you're documenting already lives somewhere
canonical, **link** to it by relative path instead of copying:

| Fact type               | Canonical home (link here, don't restate)                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Security/AI invariant   | [`AGENTS.md`](../../AGENTS.md) §6–7 + [`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/) |
| Commands                | [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) + [`AGENTS.md`](../../AGENTS.md) §4               |
| Validation gates        | [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)                                     |
| Env vars                | [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md)                                                               |
| Enforced numbered rules | the app [`CLAUDE.md`](../../apps/api/CLAUDE.md) files                                                            |

If you catch a paragraph duplicated in two docs, **collapse it to a link** in the
one that isn't the canonical home.

### Step 4 — Keep `docs/DOCS_INDEX.md` current (§3)

- **New** top-level `docs/*.md`, new `docs/<area>/` dir, new ADR, or a notable new
  `rules/`/`skills/`/`memory/`/`context/` file → **add it to
  [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md)** in the right section, same
  change.
- **Renamed/removed** doc → update or drop its index entry **and every inbound
  link**, so the index never points at a dead path.
- The index lists `rules/` areas (`global, frontend, backend, security, ai,
testing, docs`) and `skills/` areas — if you added an area or notable file,
  reflect it there.

### Step 5 — INSTALL / ENVIRONMENT when setup changed (§4)

- **Env var** added/renamed/removed → this is a multi-file change, **not** a doc
  edit. Run the canonical recipe
  [`skills/devsecops/add-env-variable.md`](../devsecops/add-env-variable.md) (schema
  `apps/api/src/config/env.validation.ts`, the `*.env.example` templates,
  `docs/ENVIRONMENT.md`, Docker/CI). `docs/ENVIRONMENT.md` is **authoritative** over
  the `pnpm audit:env` grep.
- **Install / run / build** steps, prerequisites (pnpm 10, Node 22), scripts, or
  order changed → update [`INSTALL.md`](../../INSTALL.md) (root) and the per-app
  [`apps/api/INSTALL.md`](../../apps/api/INSTALL.md) /
  [`apps/web/INSTALL.md`](../../apps/web/INSTALL.md), plus
  [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) /
  [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md) /
  [`docs/TROUBLESHOOTING.md`](../../docs/TROUBLESHOOTING.md) for deploy/ops impact.
- **New/changed command** → [`AGENTS.md`](../../AGENTS.md) §4 map **and**
  [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) must agree with the
  real root [`package.json`](../../package.json) `scripts`.

### Step 6 — Prove before you delete a documented thing (§5; AGENTS.md §8)

Before removing a documented file/dep/env/route/command/permission line, **confirm
it is actually gone** from code, `app/api/**` proxy routes, Docker, CI, Prisma +
seed, tests, and `*.env.example`. A backend endpoint usually has a matching
`app/api/.../route.ts` proxy; a permission spans 8–10 files end-to-end
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #85 /
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #34) — don't delete one leg and
orphan the doc for the others. If you can't prove it's gone, **don't delete the
line.**

### Step 7 — Format the markdown

```bash
pnpm format        # Prettier rewrites your tables/wrapping to house style
```

---

## Validation commands (run these — do not assume)

Run from the repo root. **pnpm only**, Node 22 ([`AGENTS.md`](../../AGENTS.md) §4).
For a docs-only change the **hard gate is `pnpm format:check`**; if you edited code
samples or any code, also run `pnpm typecheck`.

```bash
# 1. HARD GATE for docs — Prettier must be clean (this is what CI/pre-commit run).
pnpm format:check

# 2. Prove no broken / forward-dangling internal links you introduced. Every
#    relative link you wrote must resolve to a real file (§2). Quick manual check:
grep -rnoE "\]\(\.\.?/[^)]+\)" docs/DOCS_INDEX.md skills/docs/update-docs.md \
  <the docs you edited>          # then eyeball each target exists

# 3. Prove your concrete claims are still true against the repo (§5). For each
#    path/command/var/endpoint/rule-number you cited, confirm it exists:
grep -rn "pnpm typecheck\|MY_NEW_VAR\|POST /jobs/cancel-all" .   # adjust to your claims
ls <every file path you cited in the doc>

# 4. If you touched code samples or any code (not docs-only): HARD GATE typecheck.
pnpm typecheck

# 5. If a command/script claim changed, prove the script actually exists:
pnpm run            # lists real scripts; compare to AGENTS.md §4 + COMMANDS_MEMORY.md

# 6. Advisory full pass (typecheck + lint:strict + format:check):
pnpm validate
```

> **Do not claim a gate is green unless you ran it and saw it pass**
> ([`AGENTS.md`](../../AGENTS.md) §5;
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)). The
> `qa-gatekeeper` subagent rejects claims without command output. There is **no
> `pnpm docs:lint`** in this repo — link/claim checking is manual (steps 2–3) plus
> `pnpm format:check`.

---

## Docs to update

Driven entirely by the §1 routing table — only the ones your change actually hit:

- The **routed reference doc(s)**: `docs/API.md`, `docs/ARCHITECTURE.md` (+
  `docs/architecture/`), `docs/AI.md` (+ `docs/ai/`), `docs/SECURITY.md` (+
  `docs/security/`), `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/ENVIRONMENT.md`,
  `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/TROUBLESHOOTING.md`.
- **Setup docs** if setup changed: `INSTALL.md` (root), `apps/api/INSTALL.md`,
  `apps/web/INSTALL.md`, `README.md`.
- **Onboarding/brain** that mirrors the fact: the app `CLAUDE.md` numbered list
  (for an enforced rule), the area `rules/`, the matching `.cursor/rules/*.mdc`,
  and the relevant `memory/*.md` (`COMMANDS`, `SECURITY`, `AI`, `DECISIONS`).
- **`docs/DOCS_INDEX.md`** — always re-check; add/rename/remove entries to match
  reality (Step 4). This is mandatory whenever a doc is added/renamed/removed.
- An **ADR** in `docs/decisions/` if the change is an architectural decision (then
  index it and note it in `memory/DECISIONS_MEMORY.md`) — format per
  [`rules/docs/adr-rules.md`](../../rules/docs/adr-rules.md).

---

## Security checks (non-negotiable)

- [ ] **No doc weakens an invariant.** No doc now implies you can skip auth, tenant
      scoping (`tenantId` on every tenant-owned query/`update`/`delete`),
      `@RequirePermission`, AES-256-GCM connector-secret encryption, or AI
      **approval-required** gating for destructive actions. Those bypasses do not
      exist ([`AGENTS.md`](../../AGENTS.md) §6–7;
      [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #23, #25, #26, #56). If a doc
      contradicts an invariant, the **invariant wins and the doc is the bug** — fix
      the doc (§1, §5).
- [ ] **No "never render raw AI HTML" walked back.** Any AI doc still says AI output
      is rendered as markdown/plain text, never raw HTML
      ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) #43;
      [`AGENTS.md`](../../AGENTS.md) §7).
- [ ] **No secret in any doc or example.** You did not paste a real key, token, or
      `.env` value into a doc or a `*.example`. If your change touched env, secrets
      stay **empty + comment** ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
      #53); run `pnpm scan:secrets` to confirm clean.
- [ ] **i18n not "documented away."** A new `messageKey` or user-facing string still
      needs all 6 locale files (`en, ar, es, fr, de, it`) — docs only _describe_ it
      ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #49; web translations rule).
- [ ] **No internal URL/host/port newly exposed** in an example or doc snippet that
      shouldn't be.

---

## Common mistakes

- **Editing code, skipping the doc.** A change whose doc still describes the old
  behavior is **incomplete** (§1) — not a TODO for later.
- **Appending instead of fixing.** Adding a new paragraph beside a stale one leaves
  two contradictory truths. Rewrite the wrong lines.
- **Documenting around a stale doc** or **changing code to match a wrong doc.** Fix
  the doc forward to match real behavior; code wins (§5).
- **Duplicating a fact** (invariant/command/env row/rule) into a second doc instead
  of linking its canonical home (§2) — the copy goes stale and lies.
- **Forgetting `docs/DOCS_INDEX.md`** after adding/renaming/removing a doc → the
  index points at a dead or missing path (§3).
- **Broken / forward-dangling relative links** — citing a doc that doesn't exist
  yet, or leaving an inbound link after a rename (§2). Resolve every link.
- **Putting an enforced numbered rule in `docs/`** instead of the app `CLAUDE.md`
  list (and its `rules/` + `.cursor/rules/*.mdc` mirror) (§1).
- **Editing `docs/ENVIRONMENT.md` by hand for an env change** without the full
  multi-file wiring — use
  [`skills/devsecops/add-env-variable.md`](../devsecops/add-env-variable.md).
- **Command map drift** — `AGENTS.md` §4 / `memory/COMMANDS_MEMORY.md` not matching
  the real root `package.json` scripts (e.g. inventing `pnpm docs:lint`, which does
  not exist).
- **Deleting a documented line without proving the thing is gone** from code, proxy
  routes, Docker, CI, Prisma/seed, tests, and `*.example` (§5; AGENTS.md §8).
- **Hand-formatting tables** Prettier will rewrite — run `pnpm format`, then
  `pnpm format:check`.
- **Claiming "docs updated, all green"** without running `pnpm format:check`
  ([`AGENTS.md`](../../AGENTS.md) §5).

---

## Final checklist

- [ ] Branched off `main` (`docs/...` or the riding `feat/`/`fix/` branch).
- [ ] Used the §1 routing table to list **every** doc the change touches — fixed
      each one's stale lines to match real behavior (not appended).
- [ ] Linked canonical homes instead of duplicating any invariant/command/env/rule
      (§2); collapsed any duplicate you found to a link.
- [ ] `docs/DOCS_INDEX.md` is accurate — added/renamed/removed entries + inbound
      links for any new/renamed/removed doc (§3).
- [ ] INSTALL/ENVIRONMENT/per-app INSTALL/README/ops docs updated **iff** setup,
      commands, or steps changed (§4); env changes went through
      `skills/devsecops/add-env-variable.md`.
- [ ] Enforced-rule changes landed in the app `CLAUDE.md` numbered list (+ `rules/` + `.cursor/rules/*.mdc` mirror), not in `docs/`.
- [ ] Every concrete claim verified against the repo (`grep`/`ls`); every relative
      link resolves; no `messageKey`/string left without all 6 locales.
- [ ] No doc weakens tenant isolation, RBAC/`@RequirePermission`, auth, secret
      handling, connector encryption, or AI approval-required gating; no raw-AI-HTML
      rendering implied; no secret in any doc/example.
- [ ] Proved any deleted documented line is actually gone everywhere (§5; AGENTS.md
      §8).
- [ ] `pnpm format` then `pnpm format:check` passes; `pnpm typecheck` run if any
      code/code-sample changed.
- [ ] Final response uses the [`AGENTS.md`](../../AGENTS.md) §13 report format; no
      "all green" unless the hard gate (`pnpm format:check`, plus `pnpm typecheck`
      if code changed) actually passed — list the exact docs in `Files updated:`.
