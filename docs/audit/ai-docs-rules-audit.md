# AI Docs & Rules Audit — GOD MODE §16.1

> **Deliverable 5 of 5** for the GOD MODE §16 audit set. Audits the AI-agent
> governance system: the entry points (`AGENTS.md` / `CLAUDE.md` / `CODEX.md`,
> `apps/*/CLAUDE.md`), and the `rules/`, `skills/`, `memory/`, `context/`,
> `.claude/agents/`, `.cursor/rules/` trees against the GOD MODE §15 required
> lists. Companion docs: `architecture-clean-code-audit.md`,
> `eslint-hardening-audit.md`, `testing-coverage-audit.md`,
> `security-performance-audit.md`. Map: [`README.md`](README.md).

**Scope:** governance / onboarding system only. Application code, ESLint,
testing, security, and performance are audited in the four companion docs.
**Verdict:** **STRONG** — an unusually mature, internally-consistent governance
system. Gaps are about _completeness vs the §15 required topic/skill lists_, not
about correctness; most have been **closed in this same hardening effort** (see
"Now added").

---

## 1. Headline: this is a mature governance system

AuraSpear's AI-agent brain is well above the norm for a project of this size.
The strengths below are real and verified against the files in the repo.

### 1.1 Single clean entry point with an enforced loading order

`AGENTS.md` is the one universal entry point. `CLAUDE.md` and `CODEX.md` both
declare inheritance from it and add only tool-specific discipline — **no
contradictions** between the three.

- **The one rule** — "No AI agent may edit first and understand later" — appears
  in all three entry files (`AGENTS.md` §0, `CLAUDE.md` "The one rule",
  `CODEX.md` "The one rule").
- **7-step loading order** (`AGENTS.md:12–20`): `AGENTS.md` →
  `memory/PROJECT_MEMORY.md` (+ other `memory/*.md`) → `context/*.md` →
  `rules/**` → `skills/**` → `docs/**` + code → **then edit**. `CODEX.md:9–11`
  restates the same chain; `CLAUDE.md` defers to it.

### 1.2 Maps and gates that match reality

- **Monorepo map** (`AGENTS.md:36–55`) and **command map** (`AGENTS.md:57–76`)
  are accurate to the actual tree and `package.json` scripts.
- **Hard-vs-advisory gates** (`AGENTS.md:78–85`): hard = `pnpm typecheck` ·
  `pnpm build` · Docker image builds · gitleaks · CodeQL; advisory (tracked
  debt) = `lint` / `format:check` / `test` / `audit` / Trivy fs. `CODEX.md:44–57`
  and `CLAUDE.md` "Validation behavior" restate the same split, and `tsc` (not
  `tsgo`) is consistently named the trusted typecheck.

### 1.3 Security and AI safety invariants are explicit and repeated

- **Security invariants** (`AGENTS.md:87–97`): tenant isolation by `tenantId`,
  `@RequirePermission(...)` on every endpoint, no auth bypass, no committed /
  fallback secrets, AES-256-GCM connector secrets, audited mutations.
- **AI safety invariants** (`AGENTS.md:99–109`): AI analyzes/suggests but must
  not silently execute destructive actions (approval-required + permissioned);
  output carries provenance + citations; never render raw AI output as HTML; AI
  memory is tenant-scoped and secret-free; redact before model calls.
- Both summaries are mirrored — without drift — in `CODEX.md:59–64` and the
  `CLAUDE.md` final-answer checklist.

### 1.4 A real "final response" contract

`AGENTS.md:163–181` defines the §13 final-response block (Branch / Commits /
Files created / Files updated / Commands run / Green checks / Failed checks /
Blockers / Risks / Next steps) with an explicit "do not say all green / should
work / do not hide failures" clause. `CODEX.md:66–70` enforces it verbatim;
`CLAUDE.md` reproduces the block in its "Final answer checklist".

### 1.5 Per-app rules are concrete and machine-enforced

- `apps/api/CLAUDE.md` — **100 ESLint-enforced backend rules** including service
  methods < 30 lines, cyclomatic complexity ≤ 10, and strict
  Controller → Service → Repository → Prisma layering.
- `apps/web/CLAUDE.md` — **63 frontend rules** (component/hook/service/i18n/AI-UI).
- (Counts per `rules/global/absolute-rules.md:8–9`, which is the governance
  system's own assertion; the raw numbered-line counts are higher because each
  rule set uses sub-numbered lists.)

### 1.6 The `rules/` tree is cross-linked, exemplified, and back-referenced

- `rules/global/absolute-rules.md` **back-references exact CLAUDE rule numbers**
  (e.g. `apps/api/CLAUDE.md` rule 25 for `@RequirePermission`, rule 26 for
  tenant scoping, rule 8 for `tenantId`; `apps/web/CLAUDE.md` rule 41 for not
  forwarding client auth headers) — `absolute-rules.md:8–48`. This makes the
  global rules traceable to the enforced source.
- `rules/backend/layering-rules.md` and `rules/frontend/component-rules.md`
  contain **real code examples and self-check lists**, not just prose.

### 1.7 The subagent / Cursor fleet matches the documented set

- **12 `.claude/agents/`** match `AGENTS.md` §9: `orchestrator`,
  `qa-gatekeeper`, `repo-archaeologist`, `product-business-analyst`,
  `frontend-architect`, `backend-architect`, `database-prisma-agent`,
  `ai-platform-agent`, `dependency-modernization-agent`,
  `devsecops-security-agent`, `dx-install-agent`, `rules-skills-memory-agent`.
- **9 `.cursor/rules/`** (`00-project-map` → `08-danger-zone`) match the
  documented Cursor set.

---

## 2. Findings (gaps vs GOD MODE §15 required lists)

Honest and balanced: the system is strong, but measured against the GOD MODE §15
_required_ topic, skill, memory, and context lists it had specific gaps. Each is
rated and, where applicable, marked **Now added** because it was closed in this
same hardening effort.

### GOV-01 — Missing §15.2 required rule topics — **MEDIUM** — _Now added_

~12 of the §15.2 required rule **topics** had no dedicated `rules/**` file. The
existing 29 rule files covered API/DTO/Prisma/layering/tenant-permission,
frontend component/hook/i18n/AI-UI, security/AI/testing/docs — but not the
cross-cutting clean-code / SOLID / performance / boundaries family.

Missing topics → **files now added in this effort**:

| §15.2 topic                 | File now added                                 |
| --------------------------- | ---------------------------------------------- |
| Monorepo boundaries         | `rules/global/monorepo-boundaries.md`          |
| Clean code                  | `rules/global/clean-code-rules.md`             |
| SOLID                       | `rules/global/solid-rules.md`                  |
| Performance                 | `rules/global/performance-rules.md`            |
| Library wrappers            | `rules/global/library-wrapper-rules.md`        |
| Refactor workflow           | `rules/global/refactor-workflow.md`            |
| File organization           | `rules/global/file-organization-rules.md`      |
| Frontend performance        | `rules/frontend/frontend-performance-rules.md` |
| Frontend accessibility      | `rules/frontend/accessibility-rules.md`        |
| Color & theme               | `rules/frontend/color-and-theme-rules.md`      |
| Tenant isolation (own file) | `rules/security/tenant-isolation.md`           |
| RBAC (own file)             | `rules/security/rbac-rules.md`                 |
| AI safety (own file)        | `rules/ai/ai-safety-rules.md`                  |
| Backend integrations        | `rules/backend/integration-rules.md`           |

> **N/A for this architecture:** the §15.2 "use-cases / managers" rule topic
> does not apply — AuraSpear's backend uses a strict
> Controller → Service → Repository → Prisma layering (`apps/api/CLAUDE.md`), not
> a use-case/manager pattern. Documenting a rule for an absent pattern would be
> noise; integration concerns are instead captured in
> `rules/backend/integration-rules.md`.

### GOV-02 — Missing §15.3 fix / refactor / review skills — **MEDIUM** — _Now added_

All 28 pre-existing skills were **additive** (`add-*`: add-page, add-endpoint,
add-permission, add-prisma-model, add-ai-feature, etc.). The §15.3 required
**fix / refactor / review** skills were absent. Skills now added:

| §15.3 skill                 | File now added                                   |
| --------------------------- | ------------------------------------------------ |
| Split large React component | `skills/frontend/split-large-react-component.md` |
| Fix frontend performance    | `skills/frontend/fix-frontend-performance.md`    |
| Fix frontend accessibility  | `skills/frontend/fix-frontend-accessibility.md`  |
| Split god service           | `skills/backend/split-god-service.md`            |
| Harden ESLint               | `skills/devsecops/harden-eslint.md`              |
| Perform security review     | `skills/qa/perform-security-review.md`           |
| Perform performance review  | `skills/qa/perform-performance-review.md`        |
| Investigate production bug  | `skills/qa/investigate-production-bug.md`        |

### GOV-03 — Broken cross-references in 3 rule files — **MEDIUM** — _Resolved_

Three rule files linked to rule files that **did not exist** at audit time. The
links were forward-looking; the targets are exactly the files added under
GOV-01, so adding those files **resolves every broken link**:

| Source file (lines)                                | Broken target → now exists           |
| -------------------------------------------------- | ------------------------------------ |
| `rules/backend/layering-rules.md` (L17, L72, L161) | `../security/tenant-isolation.md` ✅ |
| `rules/backend/layering-rules.md` (L17, L69)       | `../security/rbac-rules.md` ✅       |
| `rules/backend/layering-rules.md` (L117)           | `../ai/ai-safety-rules.md` ✅        |
| `rules/frontend/component-rules.md` (L16, L89)     | `color-and-theme-rules.md` ✅        |
| `rules/frontend/component-rules.md` (L17, L143)    | `accessibility-rules.md` ✅          |
| `rules/frontend/i18n-rules.md` (L12)               | `accessibility-rules.md` ✅          |

> Verification: the link targets were grepped in the source files (matches at
> the exact lines above) and confirmed absent from the `rules/` tree before this
> effort, and the new filenames match the link text exactly.

### GOV-04 — Missing memory / context files — **LOW** — _Partly now added_

- **Memory:** 7 `memory/*.md` existed (PROJECT, BUSINESS, TECHNICAL, SECURITY,
  AI, DECISIONS, COMMANDS). The §15 frontend / backend / testing / architecture
  / dependency memory topics were **folded into `TECHNICAL_MEMORY.md` and
  `DECISIONS_MEMORY.md`** rather than split out — acceptable, but two genuinely
  missing files are now added: `memory/KNOWN_PITFALLS_MEMORY.md` and
  `memory/PERFORMANCE_MEMORY.md`.
- **Context:** 10 `context/*_CONTEXT.md` existed (AI, BACKEND, BUSINESS,
  DATABASE, DEVOPS, FRONTEND, PRODUCT, SECURITY, TECH, TESTING). The
  integrations/connectors area had no onboarding context;
  `context/INTEGRATIONS_CONTEXT.md` is now added.

### GOV-05 — No §16.1 named audit docs existed — **LOW** — _Resolved_

At audit time, **0 of the 5** GOD MODE §16.1 named audit documents existed under
`docs/audit/`. This effort creates all five —
`architecture-clean-code-audit.md`, `eslint-hardening-audit.md`,
`testing-coverage-audit.md`, `security-performance-audit.md`, and this
`ai-docs-rules-audit.md` — plus the [`README.md`](README.md) map that ties each
to its supporting evidence files. **Resolved.**

### GOV-06 — Stale `docs/INSTALL.md` link in AGENTS.md — **LOW** — _Scheduled fix (other owner)_

`AGENTS.md:160` lists `docs/INSTALL.md`, but the file lives at the **repo root**
(`/INSTALL.md`); there is no `docs/INSTALL.md`. `docs/DOCS_INDEX.md:60` already
links it correctly as `../INSTALL.md`. The `AGENTS.md` fix is owned by another
agent in this effort (this audit must not edit `AGENTS.md`); recorded here as
**scheduled-fixed**.

### GOV-07 — Condensed CLAUDE.md final-answer checklist — **LOW** — _Accepted_

`CLAUDE.md`'s "Final answer checklist" is **7 condensed bullets** rather than the
§15.1 13-point list. It substantively covers the same invariants (read order,
branch-not-main, no `any`/eslint-disable/secrets/auth-bypass, tenant scoping +
audited mutations, AI approval + no raw AI HTML, docs-on-behavior-change, run the
gates). Treated as **acceptable** — the §13 block is the binding contract and is
reproduced in full; the checklist is a reminder, not a second source of truth.

---

## 3. Findings summary

| ID     | Severity | Area                            | Status                          |
| ------ | -------- | ------------------------------- | ------------------------------- |
| GOV-01 | Medium   | Missing §15.2 rule topics       | Now added (14 files)            |
| GOV-02 | Medium   | Missing §15.3 fix/review skills | Now added (8 files)             |
| GOV-03 | Medium   | Broken rule cross-references    | Resolved by GOV-01 files        |
| GOV-04 | Low      | Missing memory / context        | Partly now added (3 files)      |
| GOV-05 | Low      | No §16.1 audit docs             | Resolved (5 docs + README)      |
| GOV-06 | Low      | Stale `docs/INSTALL.md` link    | Scheduled fix (AGENTS.md owner) |
| GOV-07 | Low      | Condensed CLAUDE checklist      | Accepted                        |

No High/Critical findings. No security, tenancy, RBAC, AI-safety, or
branch-safety **invariant** is weak or missing — every one is stated in
`AGENTS.md` and mirrored consistently in `CLAUDE.md` / `CODEX.md`.

---

## 4. Verification method

- Listed `rules/` (29), `skills/` (28), `memory/` (7), `context/` (10),
  `.claude/agents/` (12), `.cursor/rules/` (9), and `docs/audit/` to establish
  the baseline before this effort.
- Read `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `docs/DOCS_INDEX.md`, and
  `docs/audit/FINAL_AGENT_ONBOARDING_REPORT.md` for accuracy and style.
- Grepped the three rule files in GOV-03 for their link targets — confirmed the
  links exist at the cited line numbers and the targets were absent from the
  `rules/` tree.
- Confirmed `INSTALL.md` exists only at the repo root (GOV-06) and that
  `absolute-rules.md` asserts the 100 / 63 rule counts (GOV / §1.5).

## 5. Recommended follow-ups (outside this audit's edit scope)

1. Land the AGENTS.md `docs/INSTALL.md` → `INSTALL.md` fix (GOV-06; AGENTS.md
   owner).
2. Optionally split the folded frontend/backend/testing/architecture/dependency
   memory out of `TECHNICAL_MEMORY.md` / `DECISIONS_MEMORY.md` if those files
   grow unwieldy (GOV-04).
3. Have `rules-skills-memory-agent` re-run a consistency pass after all new
   `rules/`, `skills/`, `memory/`, `context/` files land, to confirm every new
   cross-reference resolves.
