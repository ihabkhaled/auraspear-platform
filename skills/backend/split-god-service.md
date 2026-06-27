# Skill: Split a god service (`apps/api` — behavior-preserving refactor)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_). This skill is a **refactor**,
> so its governing rule is [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md)
> — read it end to end before you touch a line. Then the clean-code/SOLID targets:
> [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md),
> [`rules/global/solid-rules.md`](../../rules/global/solid-rules.md). The structure
> you must preserve: [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md)
> (Controller → Service → Repository → Utilities). The invariants you must NOT weaken:
> [`rules/security/tenant-isolation.md`](../../rules/security/tenant-isolation.md),
> [`rules/security/rbac-rules.md`](../../rules/security/rbac-rules.md),
> [`rules/ai/ai-safety-rules.md`](../../rules/ai/ai-safety-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the ~100 ESLint-enforced ABSOLUTE
> RULES. The evidence for the offenders is in
> [`docs/audit/architecture-clean-code-audit.md`](../../docs/audit/architecture-clean-code-audit.md)
> (BE-03 god services) and the related [`docs/audit/eslint-hardening-audit.md`](../../docs/audit/eslint-hardening-audit.md)
> (ES-04, no size budgets). Sibling recipes:
> [`skills/backend/add-module.md`](add-module.md), [`skills/backend/add-endpoint.md`](add-endpoint.md),
> [`skills/qa/add-unit-test.md`](../qa/add-unit-test.md).
>
> **A refactor that changes behavior, a contract, or a security invariant is a
> regression, not a cleanup.** You move the **shape**, not the **behavior**.

This recipe breaks an oversized NestJS service into focused, cohesive pieces — a
**sibling service** (e.g. `cases.service.ts` → `cases-comments.service.ts`) and/or
extracted pure logic in `<module>.utilities.ts` — **without changing any HTTP
response shape, method signature, enum value, `messageKey`, or tenant/RBAC scoping.**

---

## When to use

Use this skill when a service has grown past its single responsibility and the
size/complexity budget. The real offenders (`wc -l`, this branch):

| Service                                           | Lines | Distinct responsibilities to peel off                    |
| ------------------------------------------------- | ----- | -------------------------------------------------------- |
| `apps/api/src/modules/ai/ai.service.ts`           | 1612  | provider routing vs. feature methods vs. payload mapping |
| `apps/api/src/modules/cases/cases.service.ts`     | 1546  | core CRUD vs. comments vs. tasks vs. timeline            |
| `apps/api/src/modules/tenants/tenants.service.ts` | 1084  | tenant CRUD vs. membership vs. settings                  |
| `apps/api/src/modules/auth/auth.service.ts`       | 1011  | login/token vs. tenant-switch vs. session/activity       |

**34 of 101 services exceed 300 lines** (architecture audit BE-03). A service is a
candidate when: a method is **> 30 lines** or **cyclomatic complexity > 10**
(`max-lines-per-function` warn 50, `complexity` warn 10 on `*.service.ts` —
`apps/api/eslint.config.mjs`), or the file mixes two clearly separable feature
areas. The canonical proof the split works: the `cases` module already extracted
`ai-case-copilot.service.ts` as a sibling — **read it as the reference.**

**Do not** use this skill for:

- A **new** feature area → that is a new module, [`add-module.md`](add-module.md).
- A god **page-hook** in `apps/web` → [`../frontend/split-large-react-component.md`](../frontend/split-large-react-component.md).
- An **N+1 / unbounded-query** rewrite → that changes behavior; see
  [`../qa/perform-performance-review.md`](../qa/perform-performance-review.md) and
  fix the data shape deliberately, not as a "cleanup".
- Adding/removing an endpoint, permission, or Prisma model — those are their own
  end-to-end skills and are not behavior-preserving.

---

## Files to inspect first

| Concern                                                           | Reference file                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **The sibling-service pattern already in the repo**               | `apps/api/src/modules/cases/ai-case-copilot.service.ts` (+ `.controller.ts`) |
| Module wiring that registers two services                         | `apps/api/src/modules/cases/cases.module.ts`                                 |
| Where extracted pure logic goes (mappers, where/orderBy builders) | `apps/api/src/modules/cases/cases.utilities.ts`                              |
| Types home (no inline interfaces in service)                      | `apps/api/src/modules/cases/cases.types.ts`                                  |
| The service you are splitting                                     | the target `*.service.ts` from the table above                               |
| Its repository (data access stays here, tenant-scoped)            | the matching `*.repository.ts`                                               |
| Characterization-test template (mocked repo + logger)             | `apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts` |
| The contract you must freeze (response shapes)                    | the module's `*.controller.ts` + `*.types.ts`                                |

**Hard facts you must preserve (ESLint-enforced — `apps/api/CLAUDE.md` rules 13, 14a, 14b, 17, 26):**

- Services are thin orchestrators: **validate → utility → repo → return**. They
  **never import `PrismaService`** (rule 14a, BE-01) — the repository is the only
  Prisma layer. A split that "simplifies" by reaching into Prisma is wrong.
- Controllers stay thin: route + delegate to one service method, no `try/catch`,
  no `throw` (rule 14, BE-02). If you add a sibling service, the controller calls it
  directly — do not put a facade method in the original service just to forward.
- Repositories take `tenantId` on every method; `update`/`delete` scoped
  `where: { id, tenantId }` (rule 26). The split never relaxes this.
- Services throw **only** `BusinessException` with a `messageKey` (rules 17, 18).
  The extracted code keeps the exact same `errors.<module>.<key>` keys.
- No inline `interface`/`type`/`enum`/`const`/standalone `function` in a service
  (rule 13) — they move to `<module>.types.ts` / `.enums.ts` / `.constants.ts` /
  `.utilities.ts`. Pure utilities export named functions only.

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Match Prettier (no semicolons, single
quotes, width 100).

### 0. Branch first (never refactor on `main`)

```bash
git checkout -b refactor/api-split-<module>-service
```

Large splits that touch shared files benefit from worktree isolation
(`refactor-workflow.md` §2).

### 1. Map responsibilities and freeze the contract (read before you cut)

Open the service and list its public methods. Group them by responsibility — the
groups become your extraction targets (e.g. `cases.service`: core CRUD stays;
`*Comment*` → `cases-comments.service.ts`; `*Task*` → `cases-tasks.service.ts`).
**Write down the contract** each public method must keep unchanged: the return
shape (cross-check `*.controller.ts` and `*.types.ts`), the `messageKey`s it
throws, and the tenant/permission scoping. That contract is frozen
(`refactor-workflow.md` §1).

### 2. Characterization tests FIRST (the safety net)

Before moving any code, pin today's behavior with unit tests using the mocked-repo
pattern (`refactor-workflow.md` §3; `apps/api/CLAUDE.md` "Testing"). Mirror
`notifications.service.spec.ts`: provide the service, a mocked repository, and a
mocked `AppLoggerService`; assert the existing return shapes **and that the
repository is called with `tenantId`**. Run them green against the un-split code:

```bash
pnpm --filter @auraspear/api exec jest src/modules/<module>
```

If the method has zero coverage, add it now — you cannot prove behavior is
unchanged without a baseline.

### 3. Extract pure logic to `<module>.utilities.ts` first (cheapest move)

The lowest-risk reduction: pull cohesive 3–5 line blocks (mappers, payload
builders, `where`/`orderBy` builders, validators) out of fat methods into pure
named functions in `<module>.utilities.ts` (mirror `cases.utilities.ts`). This
alone often drops methods under the 30-line / complexity-10 budget. Re-run the
characterization tests after **each** extraction (`refactor-workflow.md` §4).

### 4. Extract a focused sibling service (the bigger move)

When a whole feature area is separable, create a sibling service next to the
original — mirror `ai-case-copilot.service.ts`:

```ts
// apps/api/src/modules/cases/cases-comments.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { CasesRepository } from './cases.repository'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { CaseComment } from './cases.types'

@Injectable()
export class CasesCommentsService {
  private readonly logger = new Logger(CasesCommentsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: CasesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CASES, 'CasesCommentsService')
  }

  // moved verbatim from cases.service.ts — same signature, same messageKeys, same tenantId scoping
  async addComment(caseId: string, dto: AddCommentDto, user: JwtPayload): Promise<CaseComment> {
    // ...
  }
}
```

Rules for the move:

- **Move methods verbatim** — same signature, same `BusinessException` messageKeys,
  same repository calls. Do not "improve" them in the same step (that is a second,
  separate refactor with its own test pass).
- Inject the **same repository** (or a focused sibling repository if the data
  access is also large — same pattern). **Never inject `PrismaService`** (rule 14a).
- If the sibling needs a method from the original service, prefer extracting the
  shared logic to `<module>.utilities.ts` over service-to-service calls; use
  `forwardRef()` only for genuine circular deps (the `incidents`/`orchestrator`
  pattern in `add-module.md`).
- Keep methods ≤ 30 lines / complexity ≤ 10 in the new service too.

### 5. Re-point the controller and wire the module

The controller calls the sibling service **directly** (it is thin — no forwarding
facade in the old service). Add the new provider in `<module>.module.ts`:

```ts
@Module({
  controllers: [CasesController],
  providers: [CasesRepository, CasesService, CasesCommentsService], // add the sibling
  exports: [CasesService, CasesCommentsService], // export only if another module injects it
})
export class CasesModule {}
```

Inject the sibling into the controller constructor and update the affected
handlers to call it. `@RequirePermission(...)` and `@Throttle(...)` on those routes
**stay exactly as they were** (rule 25; SEC-04 — a missing decorator fails open).

### 6. Prove the deletion / re-point every consumer

Before deleting the old methods from the original service, grep for every caller
(other services, tests, the controller) and confirm each is re-pointed
(`refactor-workflow.md` §7; `AGENTS.md` §8):

```bash
grep -rn "casesService\.\(addComment\|listComments\)" apps/api/src
```

A dangling import or a 404'd route means the refactor is incomplete.

---

## Validation commands (real pnpm commands, from repo root)

Run them and read the output. **Never claim a gate is green without running it**
(`AGENTS.md` §5, §13; `refactor-workflow.md` §6).

```bash
pnpm --filter @auraspear/api prisma:generate   # client present before typecheck
pnpm typecheck                                  # HARD gate (tsc --noEmit). Must pass.
pnpm build                                       # HARD gate (nest build). Must pass.
pnpm --filter @auraspear/api test                # characterization tests STILL green = behavior preserved
pnpm --filter @auraspear/api lint:strict         # advisory; the size/complexity warnings should drop
pnpm --filter @auraspear/api format:check        # advisory
```

Iterate on just the module:

```bash
pnpm --filter @auraspear/api exec jest src/modules/<module>
```

Hard gates (`typecheck`, `build`) must be green. Advisory failures are **reported,
not hidden** (`AGENTS.md` §5). `tsc` is the trusted typecheck; `typecheck:fast`
(tsgo) is advisory only.

---

## Common mistakes

- **Editing behavior while splitting.** Renaming a return field, changing a
  `messageKey`, or "fixing" an N+1 in the same move — now you cannot tell a refactor
  bug from a feature change. Move first, change later (separate PR).
- **No characterization tests before cutting** — you have no proof behavior is
  unchanged (`refactor-workflow.md` §3).
- **Importing `PrismaService` into the new sibling service** — rule 14a (BE-01).
  Data access goes through the repository.
- **Adding a forwarding facade in the old service** so the controller "doesn't
  change" — the controller is thin; call the sibling directly. A facade just
  recreates the god service.
- **Dropping `tenantId` from a moved repository call** or relaxing
  `where: { id, tenantId }` (rule 26 / SEC-03) — the moved code keeps every scope.
- **Losing a `@RequirePermission`/`@Throttle`** when re-pointing a route — the
  guard fails open (SEC-04); the throttle is mandatory on mutations (rule 74).
- **Inline `interface`/`type`/`const`/`function` in the new service** (rule 13) —
  put them in `<module>.types.ts` / `.constants.ts` / `.utilities.ts`.
- **`any` / `eslint-disable` / `@ts-ignore`** to absorb a type break from the move
  — absolute bans (`apps/api/CLAUDE.md` rules 1–2; `clean-code-rules.md`). Fix the type.
- **Forgetting to register the sibling in `<module>.module.ts` providers** — DI
  throws at boot.
- **Deleting old methods without grepping consumers** (`refactor-workflow.md` §7).
- **Claiming green without running `pnpm typecheck` / `pnpm build`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `refactor-workflow.md`, `layering-rules.md`, `apps/api/CLAUDE.md`.
- [ ] Branched (`refactor/api-split-<module>-service`), not on `main`.
- [ ] Responsibilities mapped; contract (signatures, response shapes, enum values,
      `messageKey`s, tenant/RBAC scoping) written down and frozen.
- [ ] Characterization tests existed/were added and were green **before** the split.
- [ ] Pure logic extracted to `<module>.utilities.ts`; methods now ≤ 30 lines /
      complexity ≤ 10.
- [ ] Sibling service moved **verbatim** (same signatures/messageKeys); injects the
      repository, **not** `PrismaService`.
- [ ] Controller re-pointed (calls the sibling directly); `@RequirePermission` /
      `@Throttle` intact on every affected route.
- [ ] Sibling registered in `<module>.module.ts` `providers` (and `exports` if injected).
- [ ] Every consumer of moved/removed code re-pointed (grep evidence in report).
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them); characterization tests
      still green = behavior preserved; `lint:strict` / `format:check` reported.
- [ ] No `any` / `eslint-disable`; tenancy / RBAC / AI-safety invariants untouched.
- [ ] Final response uses the `AGENTS.md` §13 report block (Branch / Commits / Files /
      Commands run / Green checks / Failed checks / Blockers / Risks / Next steps).
