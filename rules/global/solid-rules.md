# SOLID rules — the five principles, mapped to AuraSpear's real layers

> **Read `AGENTS.md` first** (repo root) for the AI loading order and the one
> rule: _no AI agent may edit first and understand later._ Then read the app's
> `CLAUDE.md`. This file maps the five SOLID principles onto **this repo's
> concrete layers** — it is not generic OOP theory. Where a principle maps to an
> enforced rule, the CLAUDE.md rule number is authoritative. GOD MODE §10 is the
> source; `docs/audit/architecture-clean-code-audit.md` §4 holds the
> evidence-based SOLID posture this file formalizes.

AuraSpear's two stacks have fixed shapes:

```
Frontend (apps/web):  page (.tsx) → page hook (src/hooks/) → component (.tsx) → service (src/services/)
Backend  (apps/api):  controller → service → repository → Prisma
                                      ↓
                                  utilities  (all business logic)
```

> **Note — the backend has NO use-case/interactor tier by design.** Business
> logic lives in `<module>.utilities.ts` (pure functions) orchestrated by a thin
> service; there is no Clean-Architecture "use case" class. Do not introduce one
> — follow `../backend/layering-rules.md`.

These are **hard constraints**. A SOLID violation is usually also a clean-code
violation (`clean-code-rules.md`); fix it via `refactor-workflow.md`.

---

## 1. Single Responsibility (SRP) — one reason to change per unit

This is the **weakest axis in the repo and where the real debt lives**
(`docs/audit/architecture-clean-code-audit.md` §4: FE-02/FE-03 god hooks, BE-03
god services). One unit = one responsibility.

- **Backend:** a controller routes; a service orchestrates; a repository does
  data access; a utility transforms. Mixing them is an SRP break that ESLint
  catches (`no-restricted-syntax`, `max-lines-per-function` 30, `complexity` 10
  on services — `apps/api/CLAUDE.md` rules 14–14c). A service method that grew
  past 30 lines has usually taken on a second responsibility — extract to
  utilities.
- **Frontend:** a `.tsx` renders; a `src/hooks/` hook owns state/effects/derived
  values; a `src/services/` object owns API access; `src/lib/` owns pure helpers
  (`apps/web/CLAUDE.md` rules 13–16, 60). A page hook over ~150 lines that mixes
  unrelated concerns is a god hook — split it (FE-02/FE-03; copy the Knowledge
  hooks split). _Size alone is not the finding_ — cohesive length is fine; mixed
  responsibility is not.
- A class/function/file you cannot describe without "and" is doing two jobs.

## 2. Open/Closed (OCP) — extend without editing the core

The repo's two extensible designs are healthy; keep them that way (no material
OCP findings in the audit).

- **Connector adapters:** add a new SIEM/SOAR/intel integration by adding a new
  service under `apps/api/src/modules/connectors/services/` and a per-type Zod
  config schema (`apps/api/CLAUDE.md` rule 39) — you do **not** edit a giant
  switch. See `../backend/integration-rules.md` and
  `../../skills/backend/add-connector.md`.
- **AI provider cascade:** new providers slot into the
  `bedrock → llm_apis → openclaw_gateway → rule-based` order, not into ad-hoc
  branches (`apps/api/CLAUDE.md` rules 88, 89; `../ai/ai-safety-rules.md`).
- **Job handlers:** every `JobType` gets a registered handler in
  `JobsModule.onModuleInit()` (`apps/api/CLAUDE.md` rule 31) — add a handler, not
  a special case in the processor.
- **Permissions / enums:** behavior keys off DB-backed permissions and enums, so
  new capabilities are added by data + decorator, not by editing call sites
  (`apps/api/CLAUDE.md` rule 85).

## 3. Liskov Substitution (LSP) — substitutes honor the contract

No material LSP findings in the audit; preserve the contracts when you refactor.

- **Connector adapters share `connectors.types.ts` contracts** (`TestResult`,
  `ConnectorTestResult`, etc.); a new adapter must satisfy the same shape and
  error semantics — a `test()` that throws where peers return a result breaks
  substitutability.
- **AI providers are interchangeable behind the cascade**: every provider must
  honor the same `AiResponse`/token-usage contract so `tryConnectorsInOrder()`
  can fall through cleanly (`apps/api/CLAUDE.md` rule 88).
- **Repository methods keep their contract**: tenant-owned reads return
  `null`/`[]` (never throw), every method takes `tenantId`
  (`../backend/layering-rules.md` §3).

## 4. Interface Segregation (ISP) — narrow, focused types

Mostly healthy; the related findings (BE-05) are _organization_ issues
(inline interfaces) not fat-interface ones.

- **Declarations live in dedicated, focused homes** — `<module>.types.ts`,
  `src/common/interfaces/` (backend); `src/types/<domain>.types.ts` (frontend).
  No inline interfaces in logic files (`apps/api/CLAUDE.md` rule 13,
  `apps/web/CLAUDE.md` rule 13; `file-organization-rules.md`).
- **Components receive ready-to-render values only**, not a god object they must
  destructure (`apps/web/CLAUDE.md` rule 60). `<AiConnectorSelect />` takes
  **zero props** — it reads the store internally rather than forcing callers to
  thread connector props (rule 61).
- Prefer small, purpose-named DTOs/types over one mega-type reused everywhere.

## 5. Dependency Inversion (DIP) — depend on abstractions

This is where the audit's BE-01/BE-02/PKG-01 violations sit — guard against them.

- **Services depend on the repository, never on `PrismaService`.** A service
  importing `PrismaService` is a DIP violation (BE-01) and an architecture break
  (`apps/api/CLAUDE.md` rule 14a; `../backend/layering-rules.md` §2). The
  repository is the only Prisma boundary.
- **Controllers depend on the service**, not on data access directly (BE-02).
- **Domain logic depends on adapter abstractions, not vendor SDKs**: provider
  details stay inside the connector/AI adapters and never leak into services
  (`../backend/integration-rules.md`, `library-wrapper-rules.md`).
- **Apps should depend on a shared contract, not on local copies.** PKG-01 (the
  divergent `AiActionCategory` between `apps/api` and `packages/ai`) is the
  boundary-level DIP/DRY cousin — the consolidation target is to make
  `packages/ai` the single source and have `apps/api` import it
  (`monorepo-boundaries.md`, `docs/audit/architecture-clean-code-audit.md`
  PKG-01).
- NestJS DI (constructor injection) is the mechanism — inject the abstraction,
  don't `new` a concrete dependency.

---

## Self-check before you commit

- [ ] **SRP:** each unit has one responsibility; no god hook/service mixing
      concerns; service methods < 30 lines.
- [ ] **OCP:** new connector/provider/job/permission added by extension (new
      adapter/handler/enum + data), not by editing a core switch.
- [ ] **LSP:** new adapters/providers honor the shared contract and error
      semantics; repos return `null`/`[]`, never throw.
- [ ] **ISP:** declarations in focused home files; components get ready-to-render
      props; no fat god types.
- [ ] **DIP:** services use the repository (never `PrismaService`); domain logic
      uses adapters not SDKs; reuse the shared contract, don't copy it.
- [ ] Refactor preserved behavior + contracts (`refactor-workflow.md`); gates
      green (`validation-gates.md`); branched first (`branch-safety.md`).
