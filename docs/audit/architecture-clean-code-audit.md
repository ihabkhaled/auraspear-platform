# Architecture & Clean-Code Audit

> GOD MODE §16.1 deliverable — a synthesized, evidence-based read of the
> AuraSpear platform's frontend, backend, and shared-package architecture, with
> a prioritized remediation roadmap. Every file path and line reference below was
> verified against the working tree. Where a finding is a count or a grep result,
> it is labeled as such.

**Date:** 2026-06-22
**Branch:** `chore/godmode-architecture-hardening`
**Companion docs:** [`README.md`](./README.md) ·
[`eslint-hardening-audit.md`](./eslint-hardening-audit.md) ·
[`testing-coverage-audit.md`](./testing-coverage-audit.md) ·
[`security-performance-audit.md`](./security-performance-audit.md) ·
[`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md)
**Prior art:** [`07-frontend.md`](./07-frontend.md) ·
[`08-backend.md`](./08-backend.md) ·
[`02-risk-register.md`](./02-risk-register.md) ·
[`FINAL_REPORT.md`](./FINAL_REPORT.md)

---

## Scope

This audit covers the architecture and clean-code posture of the three code
surfaces in the monorepo:

- **`apps/web`** (`@auraspear/web`) — Next.js 16 / React 19 App Router frontend.
- **`apps/api`** (`@auraspear/api`) — NestJS 11 / Prisma 7 backend-for-frontend.
- **`packages/{shared,ai,config}`** — shared contracts, AI safety primitives,
  and tooling presets — plus the monorepo dependency boundaries between them.

It is concerned with structure, layering, cohesion, SOLID adherence, code
duplication, file organization, and clean-code discipline. It deliberately does
**not** re-audit security or runtime behavior in depth (that is the job of
[`security-performance-audit.md`](./security-performance-audit.md)), nor testing
coverage ([`testing-coverage-audit.md`](./testing-coverage-audit.md)), nor the
ESLint rule surface ([`eslint-hardening-audit.md`](./eslint-hardening-audit.md)).
It cross-references those companions where their domains overlap.

This document supersedes nothing in [`07-frontend.md`](./07-frontend.md) or
[`08-backend.md`](./08-backend.md) — those remain the authoritative per-app
deep dives. This is the cross-cutting synthesis layered on top of them.

## How this was produced

This deliverable synthesizes a read-only audit run by eight specialized agents
across the three surfaces (frontend, backend, AI subsystem, packages,
monorepo-boundary, clean-code/SOLID, file-organization, and a verification
gate). No agent in the audit had edit permissions; the findings are grounded in
files actually read and in repository-wide greps whose counts are reproducible.
Every path, line reference, and metric cited here was spot-checked against the
working tree before publication. Where a number comes from a grep rather than a
full read, it is called out as a count, not a claim about each individual file.

---

## Executive summary

**AuraSpear is an unusually disciplined codebase for its size.** Both apps ship a
documented, mechanically-enforced architecture (`apps/web/CLAUDE.md` codifies
~66 hard rules, `apps/api/CLAUDE.md` ~100), and the code largely lives up to it.
The frontend has zero `dangerouslySetInnerHTML` and zero raw `fetch` in
components; the backend's Controller → Service → Repository → Utilities layering
holds across the large majority of its ~38 modules; the `packages/ai` safety
layer is a genuinely provider-agnostic, conservative-by-default SDK-free design.
The dependency direction across the monorepo is correct with no cycles.

The findings below are concentrated, not systemic. They cluster in three places:

1. **The newest AI subsystem** has out-paced the architecture's own rules — a
   handful of services inject `PrismaService` directly and a few controllers
   reach past the service layer (BE-01, BE-02). These are the strongest,
   most fixable findings.
2. **A small number of "god" units** — two frontend page hooks and roughly five
   backend services — have grown past their cohesion budgets (FE-02/03, BE-03).
   Each has a proven in-repo split pattern to copy.
3. **The shared packages are wired but not consumed** — both apps still own their
   own copies of the contracts the packages were meant to centralize, and one
   divergence (`AiActionCategory` string values, PKG-01) is a latent correctness
   landmine rather than mere duplication.

None of these undermine the platform's core invariants (tenant isolation, RBAC,
AI safety). They are debt of a healthy, fast-growing system, and every one of
them has a named owner-skill or owner-rule in §5.

---

## 1. Frontend architecture (`apps/web`)

### Strengths

The frontend's separation of concerns is real and mechanically guaranteed, not
aspirational — ESLint's `no-restricted-syntax` bans inline hooks, types, enums,
and constants in `.tsx` files (`apps/web/CLAUDE.md` rules 13–17), and the
render-only-component / page-hook split is pervasive (see
[`07-frontend.md`](./07-frontend.md) §3).

- **Centralized, hardened HTTP layer.** `apps/web/src/lib/api.ts` (the Axios
  instance built at L147–205) carries the request interceptor that attaches
  `Authorization`, `X-Tenant-Id`, and the CSRF double-submit header, plus a
  single-flight 401-refresh queue (`failedQueue`) that replays concurrent
  failures after one `/auth/refresh`. This is a robust, correct refresh design.
- **A real service layer with barrels.** 45 singleton service modules under
  `services/`, barrel-exported from `services/index.ts`, keep all Axios calls out
  of components.
- **A mature server proxy.** `apps/web/src/lib/backend-proxy.ts`
  (`proxyToBackend`, L29–153) forwards auth cookies and tenant headers, maps
  backend status to i18n error keys, enforces `Cache-Control: no-store`, and
  pointedly does **not** forward any client-supplied role/auth-decision header.
- **Pure re-export barrels.** `hooks/index.ts` and `types/index.ts` are
  re-export-only, keeping the import surface clean.
- **Thin pages.** Route files (e.g. `app/(portal)/dashboard/page.tsx`,
  `app/(portal)/ai-findings/page.tsx`) delegate entirely to page hooks and
  contain only JSX.
- **No unsafe sinks.** Zero `dangerouslySetInnerHTML` (rule 43) and zero raw
  `fetch` in components — all data access goes through the service/proxy layers.
- **Near-total i18n.** User-facing strings route through `t()` across the
  surface; hardcoded strings are the rare exception (FE-06).

**Scale metrics** (grep-derived counts): 1,393 `.ts`/`.tsx` files, 330
components, 383 hooks, 61 `page.tsx` route files, and 35 files over 250 lines.
This is a large, mature surface — small-file discipline is the norm, with a long
tail of larger units.

### Findings

#### FE-01 — `"use client"` is near-universal; RSC is effectively unused (High)

- **Evidence:** 507 files carry `"use client"`, and 59 of the 61 `page.tsx`
  routes are client components (grep counts). React Server Components are not
  meaningfully in play.
- **Rule violated:** Server-first default
  (`apps/web/CLAUDE.md` "Next.js Specific Patterns" — _"Server Components are the
  default — only add `'use client'` when the component uses hooks, events, or
  browser APIs"_). The page-hook pattern (every page pulls all state from a hook)
  structurally forces client rendering, so the rule and the architecture are in
  tension.
- **Impact:** Larger client bundles and no server-side data fetching/streaming.
  This is a cost/architecture tradeoff, not a correctness bug — but it is the
  single largest divergence from the documented frontend model.
- **Remediation:** Push `"use client"` down to interactive leaves rather than
  whole pages; introduce a client-component budget tracked in CI. See
  [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md)
  and the boundary guidance in
  [`rules/global/file-organization-rules.md`](../../rules/global/file-organization-rules.md).

#### FE-02 — God hook: `useAiConfigPage.ts` (High)

- **Evidence:** `apps/web/src/hooks/useAiConfigPage.ts` is **648 lines**
  (verified). It mixes five permission flags, URL-driven tab state, seven dialog
  state machines, six queries, eighteen mutations, and roughly fifteen
  near-identical `mutate + toast` handlers in a single hook.
- **Rule violated:** Single-responsibility / hook-splitting
  (`apps/web/CLAUDE.md` Audit Rule 29 — _"No page hook > 150 lines"_; SOLID SRP).
  Cohesion is low — the hook owns five unrelated config domains at once.
- **Remediation:** Split into `useAiConfigAgents` / `useAiConfigOsint` /
  `useAiConfigPrompts` / `useAiConfigApprovals` / `useAiConfigSchedules`,
  composed by a thin parent `useAiConfigPage`. **This pattern already exists in
  the repo** — Knowledge is decomposed into `useKnowledgePageCrud.ts`,
  `useKnowledgePageFilters.ts`, and `useKnowledgePageDialogs.ts` (all present,
  verified). Owner skill:
  [`skills/frontend/split-large-react-component.md`](../../skills/frontend/split-large-react-component.md);
  workflow:
  [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md).

#### FE-03 — God hook: `useTenantConfigPage.ts` (High)

- **Evidence:** `apps/web/src/hooks/useTenantConfigPage.ts` is **565 lines**
  (verified). It composes 14 admin hooks alongside role flags and dialog state in
  one unit.
- **Rule violated:** Same as FE-02 (Audit Rule 29 / SRP).
- **Remediation:** Apply the same decomposition-by-responsibility pattern; the
  parent hook should compose smaller domain hooks and re-expose the same
  interface. Owner skill:
  [`skills/frontend/split-large-react-component.md`](../../skills/frontend/split-large-react-component.md).

#### FE-04 — No centralized query-key factory (Medium)

- **Evidence:** 68 hooks define their TanStack Query `queryKey` arrays inline
  (grep count). With no single source of truth, the key used to **read** a query
  can drift from the key used to **invalidate** it.
- **Rule violated:** DRY / single source of truth
  ([`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md)).
  Note the existing tenant-scoping rule (`apps/web/CLAUDE.md` RBAC — _"All
  mutation `invalidateQueries` calls MUST include `tenantId`"_) is exactly the
  kind of invariant a factory would enforce mechanically.
- **Remediation:** Introduce a typed `lib/query-keys.ts` factory so read and
  invalidate paths share one definition (and `tenantId` inclusion is enforced by
  construction).

#### FE-05 — Duplicate utility-file naming (Medium)

- **Evidence (verified):** `apps/web/src/lib/` contains both `admin-utils.ts` and
  `admin.utils.ts`, and both `connector-utils.ts` and `connectors.utils.ts`. All
  four are imported and hold distinct functions — so this is naming drift, not
  dead code, but the kebab-vs-dot split invites importing from the wrong one.
- **Rule violated:** Consistent file organization
  ([`rules/global/file-organization-rules.md`](../../rules/global/file-organization-rules.md)).
- **Remediation:** Standardize on the `.utils.ts` convention and merge each pair
  into one per-domain module.

#### FE-06 — Isolated hardcoded strings in `AiChatPanel.tsx` (Low)

- **Evidence (verified):** `apps/web/src/components/ai-config/AiChatPanel.tsx`
  has the literal `'Untitled Chat'` at L31 (and again later in the file), plus a
  hardcoded `aria-label` "Open threads".
- **Rule violated:** i18n mandate (`apps/web/CLAUDE.md` rule 9 — _"NEVER hardcode
  user-facing text"_).
- **Remediation:** Move both to `t()` keys across all six locale files. This is
  an isolated lapse against an otherwise near-total i18n posture.

---

## 2. Backend architecture (`apps/api`)

### Strengths

The backend's documented Controller → Service → Repository → Utilities layering
(`apps/api/CLAUDE.md`) holds across the large majority of its surface — see
[`08-backend.md`](./08-backend.md) for the per-layer deep dive.

- **Consistent layering at scale.** ~38 modules, 47 repository files, with core
  services injecting repositories rather than `PrismaService`. The core domain
  services (`cases`, `tenants`, `auth`) keep `@prisma/client` imports type-only,
  so the layering boundary holds where it matters most.
- **Utilities are focused, not dumping grounds.** `ai.utilities.ts` is large
  (1,238 lines) but is 33 genuinely pure functions with zero type leakage;
  `detection-rules.utilities.ts` (953 lines) is 8 pure functions. Size here
  reflects domain breadth, not low cohesion.
- **Thin controllers.** Only 8 of 74 controllers exceed 150 lines (grep count) —
  controllers overwhelmingly route-and-delegate as the contract requires.
- **No use-case/manager tier — by design.** The absence of a use-case or manager
  layer is **not** a defect: the documented architecture is explicitly
  Controller → Service → Repository + Utilities (`apps/api/CLAUDE.md`
  "Layering"). Flagging it would be a false positive.

### Findings

#### BE-01 — Services injecting `PrismaService` directly (High)

- **Evidence (verified):** Nine services inject `PrismaService` and call
  `this.prisma.*` instead of going through a repository, concentrated in the
  newer AI subsystem and the job scheduler:
  `ai/chat/ai-transcript.service.ts` (25 `this.prisma.*` calls — verified),
  `ai/ai-ops-workspace.service.ts`, `ai/eval/ai-eval.service.ts`,
  `ai/memory/user-memory.service.ts`, `ai/orchestrator/agent-graph.service.ts`,
  `ai/semantic-search/semantic-search.service.ts`,
  `ai/simulation/ai-simulation.service.ts`, `ai/writeback/ai-handoff.service.ts`,
  and `jobs/job-scheduler.service.ts`.
- **Rule violated:** `apps/api/CLAUDE.md` rule 14a / "Architecture Enforcement"
  (_"NEVER import `PrismaService` in services — all data access through
  repository"_). Cross-referenced in [`08-backend.md`](./08-backend.md) Gap 1.
- **Impact:** Data access escapes the repository layer, so tenant-scoping
  patterns and query reuse are no longer guaranteed by construction for these
  modules. (Whether any individual query is under-scoped is a security question —
  see [`security-performance-audit.md`](./security-performance-audit.md).)
- **Remediation:** Add a `*.repository.ts` per submodule and move all Prisma
  calls behind it. Owner skill:
  [`skills/backend/split-god-service.md`](../../skills/backend/split-god-service.md);
  integration guidance:
  [`rules/backend/integration-rules.md`](../../rules/backend/integration-rules.md).

#### BE-02 — Controllers reaching past the service layer (High)

- **Evidence:** Three controllers bypass the service layer.
  `ai/writeback/ai-schedule-templates.controller.ts` runs inline Prisma
  `findMany` / `count` / `aggregate` plus a `where` mutation directly in the
  handler (verified: this controller references `prisma`);
  `connectors/connector-sync.controller.ts` runs
  `prisma.connectorConfig.findMany` + a `map`; and
  `ai/writeback/ai-writeback.controller.ts` injects a repository directly,
  bypassing its service.
- **Rule violated:** `apps/api/CLAUDE.md` rule 14 (_"Controllers MUST only route
  and delegate … no data transformation"_) and §6.3 layering.
- **Remediation:** Move all data access and shaping into the owning service
  (which in turn calls a repository). See
  [`rules/global/solid-rules.md`](../../rules/global/solid-rules.md) (dependency
  inversion) and [`rules/backend/integration-rules.md`](../../rules/backend/integration-rules.md).

#### BE-03 — God services over the size budget (High)

- **Evidence (verified):** Five services exceed the ~300-line target by a wide
  margin: `ai/ai.service.ts` (1,612), `cases/cases.service.ts` (1,546),
  `tenants/tenants.service.ts` (1,084), `auth/auth.service.ts` (1,011), and
  `osint-executor.service.ts` (862). Across the backend, 34 of 101 services
  exceed 300 lines (grep count).
- **Rule violated:** SRP and the service-size discipline behind
  `apps/api/CLAUDE.md` rule 14a (thin orchestrators).
- **Remediation:** Split by responsibility — e.g. `cases` into
  `crud` / `comments` / `tasks` / `notifications` sub-services that the facade
  composes. Owner skill:
  [`skills/backend/split-god-service.md`](../../skills/backend/split-god-service.md);
  workflow: [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md).

#### BE-04 — Service methods over 30 lines in the largest services (Medium)

- **Evidence:** In the biggest services, several methods exceed the 30-line
  budget — e.g. `cases` `listCases` (~47 lines) and `createCase` (~36), `ai`
  `executeAiTask` (~44), and `tenants` `addUser` (~40).
- **Rule violated:** `apps/api/CLAUDE.md` rule 14a — _"No service method may
  exceed 30 lines."_ ESLint's `max-lines-per-function` (warn, max 30) fires here
  but is treated as advisory today (see [`02-risk-register.md`](./02-risk-register.md)
  R1 on advisory lint).
- **Remediation:** Extract cohesive 3–5 line blocks (validation, mapping, query
  building) into `*.utilities.ts`, as the recipe pattern intends. Tracked
  alongside the broader lint cleanup in
  [`eslint-hardening-audit.md`](./eslint-hardening-audit.md).

#### BE-05 — Inline interface declarations in service files (Medium)

- **Evidence (verified):** `ai/chat/ai-transcript.service.ts` declares
  `TranscriptStats` and `TranscriptPolicyRecord` interfaces inline at L5–25.
  The same anti-pattern appears in `ai-ops-workspace`, `rag-observability`,
  `agent-graph`, `semantic-search`, and `ai-handoff` services (six files total).
- **Rule violated:** `apps/api/CLAUDE.md` rule 13 (_"NEVER define interfaces,
  types, enums … inline — every declaration has a dedicated home file"_).
- **Remediation:** Move each to the module's `*.types.ts`.

#### BE-06 — Raw status string literals in a controller (Low)

- **Evidence:** `ai/writeback/ai-schedule-templates.controller.ts` uses raw
  literals `'completed'` / `'failed'` for status (around L98/L101).
- **Rule violated:** `apps/api/CLAUDE.md` rule 12 (_"NEVER use plain text string
  literals — use enums"_).
- **Remediation:** Replace with the appropriate status enum. (This finding is
  downstream of BE-02 — fixing the layering violation removes the literals too.)

---

## 3. Packages & monorepo boundaries

### Strengths

- **Dependency direction is correct.** Zero `apps/*` imports inside `packages/*`,
  zero `apps → apps` imports, and no cycles (grep-verified). The monorepo's
  layering is sound at the boundary level.
- **`packages/ai` is a genuine, SDK-free safety layer.** It is provider-agnostic
  by construction: redaction primitives, a conservative-by-default
  `evaluateApproval`, a `routeProviders` cascade, and provenance/attribution
  contracts — no vendor SDK imported. `packages/ai/src/safety.ts` cleanly models
  the four AI action categories.
- **Honest documentation of deferred scaffolding.** `packages/shared/src/index.ts`
  (L4–14, verified) openly states the package is scaffolding and that both apps
  still own their own contract copies pending a deliberate follow-up milestone;
  `docs/architecture/MONOREPO.md` (L102–107) records the same. The deferral is
  tracked, not hidden — consistent with [`02-risk-register.md`](./02-risk-register.md)
  R4.

### Findings

#### PKG-01 — Divergent `AiActionCategory` string values across the boundary (High)

- **Evidence (verified):** `apps/api` defines its own `AiActionCategory` enum in
  `apps/api/src/common/enums/ai-feature.enum.ts` (L39–44) using **underscore**
  values (`'analysis_only'`, `'suggested'`, `'approval_required'`,
  `'auto_allowed'`), while `packages/ai/src/safety.ts` (L9–18) uses **hyphen**
  values (`'analysis-only'`, `'suggested'`, `'approval-required'`,
  `'auto-allowed'`). The approval policy and provider-cascade logic are likewise
  duplicated, and `apps/` has **zero** `@auraspear/ai` imports.
- **Rule violated:** DRY / single source of truth
  ([`rules/global/monorepo-boundaries.md`](../../rules/global/monorepo-boundaries.md),
  [`rules/global/library-wrapper-rules.md`](../../rules/global/library-wrapper-rules.md)).
- **Impact:** This is more than duplication — it is a **correctness landmine.**
  Two enums that _look_ like the same contract serialize to different strings, so
  any data crossing from the package's vocabulary to the app's (or persisted
  under one and compared under the other) will silently mismatch. The frontend's
  governance UI (`apps/web/CLAUDE.md` rule 44) expects the hyphen form; the
  backend persists the underscore form.
- **Remediation:** Make `packages/ai` the single source for the category enum
  and approval/cascade contracts, then have `apps/api` import it (and reconcile
  the string values in a migration-aware way). This is the highest-value
  consolidation because it removes a real divergence, not just a copy. Tracked
  under [`02-risk-register.md`](./02-risk-register.md) R4 (contract
  consolidation).

#### PKG-02 — `packages/config` declares files that do not exist (Medium)

- **Evidence (verified):** `packages/config/package.json` (L11–16) declares
  `files: ["tsconfig", "prettier", "eslint", "tailwind"]`, but only `tsconfig/`
  and `prettier/` exist on disk — there is no `eslint/` or `tailwind/` directory.
- **Rule violated:** Honest package manifests / file-organization
  ([`rules/global/file-organization-rules.md`](../../rules/global/file-organization-rules.md)).
- **Remediation:** Either add the missing preset directories (if shared ESLint /
  Tailwind config is intended) or drop them from `files` so the manifest matches
  reality. Low effort, removes a misleading signal.

#### PKG-03 — `packages/ai` ships safety logic with zero tests (Medium)

- **Evidence (verified):** No `*.test.ts` / `*.spec.ts` files exist under
  `packages/ai`, despite it shipping redaction, the approval policy, and the
  eval/golden-case harness. Its `lint` / `lint:strict` scripts in the config
  package are `echo` stubs (verified in `packages/config/package.json` L18–20,
  and the same stub style applies to the AI package's quality scripts).
- **Rule violated:** Testing discipline for shipped logic
  ([`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md));
  see [`testing-coverage-audit.md`](./testing-coverage-audit.md) for the full
  coverage picture.
- **Impact:** The most safety-critical, dependency-free code in the repo (the
  thing whose whole job is "AI must not silently execute destructive actions") is
  unverified by tests. Because it is pure and SDK-free, it is also the _easiest_
  code in the repo to unit-test.
- **Remediation:** Add unit tests for `evaluateApproval`, redaction, and the
  golden-case harness; wire the eval gate into CI (already noted as deferred in
  [`FINAL_REPORT.md`](./FINAL_REPORT.md) §8).

#### PKG-04 — None of the three packages is consumed by either app (Low)

- **Evidence:** `packages/{shared,ai,config}` are each imported by neither
  `apps/web` nor `apps/api` for their runtime contracts; the Turborepo `^build`
  edge is therefore a no-op today.
- **Rule violated:** None — this is **documented, deliberate deferral**
  (`packages/shared/src/index.ts` L4–14; [`02-risk-register.md`](./02-risk-register.md)
  R4). Listed here only for completeness; it is honest scaffolding, not a defect.
- **Remediation:** Wire the apps to the packages as part of the contract
  consolidation milestone (R4), starting with the PKG-01 enum since it carries
  real risk.

---

## 4. Clean-code & SOLID posture

The platform's clean-code story is, on balance, strong — and it is _enforced_,
not just written down. The two `CLAUDE.md` rule sets plus `no-restricted-syntax`
make "declarations live in their home file," "no `any`," "no inline hooks," and
"enums over string literals" mechanical guarantees rather than review-time hopes
(see [`eslint-hardening-audit.md`](./eslint-hardening-audit.md)).

Mapping the findings onto SOLID:

- **Single Responsibility (SRP)** — the weakest axis, and where the real debt
  lives: FE-02, FE-03 (god hooks) and BE-03 (god services). Each is a unit that
  has accreted multiple responsibilities; each has an in-repo split pattern to
  copy (Knowledge hooks; `cases` decomposition).
- **Open/Closed & Liskov** — no material findings. The provider-cascade and
  guard-chain designs extend cleanly.
- **Interface Segregation** — mostly healthy; the inline-interface findings
  (BE-05) are an organization issue, not a fat-interface one.
- **Dependency Inversion** — BE-01 and BE-02 are DIP violations: services and
  controllers depending on the concrete `PrismaService` / on data access
  directly, instead of on the repository abstraction. PKG-01 is the boundary-level
  cousin — apps depending on local copies instead of the shared contract.

**DRY** is the other recurring theme: FE-04 (inline query keys), FE-05
(duplicate util files), and PKG-01 (duplicated enum) are all single-source-of-truth
gaps. PKG-01 is the one where duplication has crossed from "smell" into "risk."

Cohesion is generally good — note that _size alone is not the finding_.
`ai.utilities.ts` (1,238 lines) and `detection-rules.utilities.ts` (953) are
large but cohesive collections of pure functions and are **not** flagged; the god
units are flagged because they mix unrelated responsibilities, not because they
are long. The owner-rules formalizing all of this are
[`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md),
[`rules/global/solid-rules.md`](../../rules/global/solid-rules.md), and
[`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md).

---

## 5. Prioritized remediation roadmap

Severity reflects impact if left unaddressed; effort is a rough order of
magnitude. "Owner skill / rule" points at the parallel deliverable that carries
the how-to.

| ID     | Area                    | Finding (short)                                          | Severity | Effort | Owner skill / rule                                                                                                                                |
| ------ | ----------------------- | -------------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PKG-01 | Packages / boundary     | Divergent `AiActionCategory` string values (correctness) | High     | M      | [monorepo-boundaries](../../rules/global/monorepo-boundaries.md), [library-wrapper-rules](../../rules/global/library-wrapper-rules.md)            |
| BE-01  | Backend / layering      | 9 services inject `PrismaService` directly               | High     | M–L    | [split-god-service](../../skills/backend/split-god-service.md), [integration-rules](../../rules/backend/integration-rules.md)                     |
| BE-02  | Backend / layering      | 3 controllers reach past the service layer               | High     | S–M    | [integration-rules](../../rules/backend/integration-rules.md), [solid-rules](../../rules/global/solid-rules.md)                                   |
| BE-03  | Backend / SRP           | 5 god services (34/101 over 300 lines)                   | High     | L      | [split-god-service](../../skills/backend/split-god-service.md), [refactor-workflow](../../rules/global/refactor-workflow.md)                      |
| FE-02  | Frontend / SRP          | God hook `useAiConfigPage.ts` (648 lines)                | High     | M      | [split-large-react-component](../../skills/frontend/split-large-react-component.md), [refactor-workflow](../../rules/global/refactor-workflow.md) |
| FE-03  | Frontend / SRP          | God hook `useTenantConfigPage.ts` (565 lines)            | High     | M      | [split-large-react-component](../../skills/frontend/split-large-react-component.md)                                                               |
| FE-01  | Frontend / RSC          | `"use client"` near-universal; RSC unused                | High     | L      | [performance-rules](../../rules/global/performance-rules.md), [file-organization-rules](../../rules/global/file-organization-rules.md)            |
| FE-04  | Frontend / DRY          | No centralized query-key factory (68 inline keys)        | Medium   | M      | [clean-code-rules](../../rules/global/clean-code-rules.md)                                                                                        |
| BE-04  | Backend / clean-code    | Service methods over 30 lines in largest services        | Medium   | M      | [eslint-hardening-audit](./eslint-hardening-audit.md), [clean-code-rules](../../rules/global/clean-code-rules.md)                                 |
| BE-05  | Backend / organization  | Inline interfaces in 6 service files                     | Medium   | S      | [file-organization-rules](../../rules/global/file-organization-rules.md)                                                                          |
| PKG-03 | Packages / testing      | `packages/ai` safety logic has zero tests                | Medium   | S–M    | [testing-coverage-audit](./testing-coverage-audit.md)                                                                                             |
| PKG-02 | Packages / manifest     | `packages/config` declares non-existent dirs             | Medium   | S      | [file-organization-rules](../../rules/global/file-organization-rules.md)                                                                          |
| FE-05  | Frontend / organization | Duplicate `*-utils.ts` vs `*.utils.ts` files             | Medium   | S      | [file-organization-rules](../../rules/global/file-organization-rules.md)                                                                          |
| FE-06  | Frontend / i18n         | Hardcoded strings in `AiChatPanel.tsx`                   | Low      | S      | [ai-docs-rules-audit](./ai-docs-rules-audit.md)                                                                                                   |
| BE-06  | Backend / enums         | Raw status literals in a controller                      | Low      | S      | [clean-code-rules](../../rules/global/clean-code-rules.md)                                                                                        |
| PKG-04 | Packages / wiring       | Packages consumed by neither app (documented deferral)   | Low      | L      | [monorepo-boundaries](../../rules/global/monorepo-boundaries.md)                                                                                  |

**Suggested sequencing.** Do PKG-01 first — it is the only finding that is a live
correctness risk, and fixing it also opens the door to consuming `packages/ai`
(PKG-04). Then BE-02 (small, high-value layering fix) and BE-01 (repository
extraction), which naturally precede BE-03 (the larger god-service splits) since
the new repositories give the split services a clean data-access layer. The
frontend god-hook splits (FE-02/03) and the query-key factory (FE-04) are
independent and can run in parallel. FE-01 (RSC adoption) is the largest,
longest-horizon item and should be planned as its own milestone, not bundled.

---

## Verdict

**AuraSpear's architecture is sound and its clean-code discipline is, for a
codebase this size, exceptional.** The layering, separation of concerns, and
no-`any` / enum / home-file rules are enforced mechanically, and the most
safety-critical design — the AI provider cascade and conservative approval
policy — is built correctly. The findings here are concentrated, well-bounded
debt of a fast-growing system, not foundational flaws.

If only three things are fixed, fix these: **PKG-01** (the one divergence that is
a real correctness landmine), **BE-01/BE-02** (the AI subsystem's drift past its
own layering rules), and **the god-unit splits** (FE-02/03, BE-03) — each of
which has a proven in-repo pattern and a dedicated skill ready to apply.

Everything above is cross-linked to its companion audit and its owner rule/skill:

- [`README.md`](./README.md) — index of the GOD MODE audit set.
- [`eslint-hardening-audit.md`](./eslint-hardening-audit.md) — lint rule surface
  and the advisory-lint debt behind BE-04.
- [`testing-coverage-audit.md`](./testing-coverage-audit.md) — coverage gaps,
  including PKG-03.
- [`security-performance-audit.md`](./security-performance-audit.md) — the
  security read on the layering bypasses (BE-01) and runtime cost of FE-01.
- [`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md) — AI surface docs/rules,
  including the i18n lapse (FE-06).
- Owner rules: [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md),
  [`rules/global/solid-rules.md`](../../rules/global/solid-rules.md),
  [`rules/global/monorepo-boundaries.md`](../../rules/global/monorepo-boundaries.md),
  [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md),
  [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md),
  [`rules/global/library-wrapper-rules.md`](../../rules/global/library-wrapper-rules.md),
  [`rules/global/file-organization-rules.md`](../../rules/global/file-organization-rules.md),
  [`rules/backend/integration-rules.md`](../../rules/backend/integration-rules.md).
- Owner skills: [`skills/backend/split-god-service.md`](../../skills/backend/split-god-service.md),
  [`skills/frontend/split-large-react-component.md`](../../skills/frontend/split-large-react-component.md).
