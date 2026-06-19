# Skill: Add a background job (`apps/api` Jobs subsystem)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + the security / AI /
> tenancy / branch invariants), then the backend rules in
> [`rules/backend/`](../../rules/backend/) — especially
> [`layering-rules.md`](../../rules/backend/layering-rules.md),
> [`prisma-rules.md`](../../rules/backend/prisma-rules.md), and
> [`tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md). Always-on:
> [`rules/global/absolute-rules.md`](../../rules/global/absolute-rules.md),
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md), and
> [`rules/security/security-rules.md`](../../rules/security/security-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the ~100 ABSOLUTE RULES are
> ESLint-enforced and **will block your commit**; rules **90 / 91** are specifically about
> this subsystem. Sibling onboarding: [`skills/`](../), [`memory/`](../../memory/),
> [`context/`](../../context/), [`docs/`](../../docs/). Stable truths:
> [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
>
> **No AI agent may edit first and understand later.** Open the reference files in the next
> section, copy the closest handler end-to-end, then adapt. Do not invent the pipeline.

This recipe adds a new asynchronous, tenant-scoped background job to the **Jobs subsystem**
under `apps/api/src/modules/jobs/`. The subsystem is a **Postgres-backed, Redis-locked poll
loop** — there is no BullMQ. A job is a row in the `jobs` table (`apps/api/prisma/schema.prisma`
`model Job`). `JobProcessorService` (`apps/api/src/modules/jobs/job-processor.service.ts`)
polls every `POLL_INTERVAL_MS`, acquires a per-job Redis lock, looks up a **handler** in its
`handlers` Map keyed by `JobType`, runs it, and marks the row completed/failed/retrying.

The single most important fact: **a `JobType` with no registered handler does not error loudly
— it runs `placeholderJobHandler` (a no-op that returns `{ handled: true }`) unless/until you
register a real handler in `JobsModule.onModuleInit`.** `registerDefaultHandlers()` seeds
_every_ `JobType` with the placeholder in the constructor; `onModuleInit` then overwrites the
ones that have real handlers. So if you add a `JobType` and forget to register its handler, the
job silently "completes" doing nothing — it never even surfaces the "No handler registered"
error path. Wiring the handler in `onModuleInit` is the load-bearing step.

---

## When to use

Use this skill when you need to **run work asynchronously, out of the request/response cycle**,
tenant-scoped, with retries and idempotency — e.g. a periodic sync, a rule execution, a
long-running pipeline, a generation task, or an AI agent task. The caller enqueues via
`JobService.enqueue(...)` and returns immediately; the poll loop executes it later.

Concrete existing examples (mirror the closest one):
`JobType.CONNECTOR_SYNC`, `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`,
`NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`, `HUNT_EXECUTION`, `AI_AGENT_TASK`,
`REPORT_GENERATION`, `MEMORY_EXTRACTION` (see `apps/api/src/modules/jobs/enums/job.enums.ts`).

**Do not** use this skill for:

- A **synchronous** endpoint that returns data inline → [`add-endpoint.md`](add-endpoint.md).
- A whole new **feature module** → [`add-module.md`](add-module.md). A job handler usually
  lives in (or beside) an existing module and reuses its repository.
- A **new Prisma model** the handler reads/writes → do
  [`add-prisma-model.md`](add-prisma-model.md) first; a handler that references a non-existent
  model cannot compile.
- A **scheduled / cron** trigger only (no new work type) → you only need to call
  `JobService.enqueue(...)` from `JobSchedulerService`
  (`apps/api/src/modules/jobs/job-scheduler.service.ts`); reuse an existing `JobType`.
- An **AI agent** task → `AI_AGENT_TASK` already exists and is handled by
  `apps/api/src/modules/ai-agents/ai-agent-task.handler.ts`; extend the payload, do not add a
  new type. AI destructive actions remain **approval-required** (AGENTS.md §7, CLAUDE.md
  rule 97).

---

## Files to inspect first (read before editing — copy the closest one)

| Concern                                                                               | Reference file                                                                      |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The `JobType` / `JobStatus` enums (local)                                             | `apps/api/src/modules/jobs/enums/job.enums.ts`                                      |
| The poll loop, lock, executor, stale-recovery, placeholder seeding                    | `apps/api/src/modules/jobs/job-processor.service.ts`                                |
| **Handler registration (the load-bearing wiring)**                                    | `apps/api/src/modules/jobs/jobs.module.ts` (`onModuleInit`)                         |
| A simple in-module handler (copy this shape)                                          | `apps/api/src/modules/jobs/handlers/connector-sync.handler.ts`                      |
| A cross-module handler (handler living in another module, injected into `JobsModule`) | `apps/api/src/modules/ai-agents/ai-agent-task.handler.ts`                           |
| `JobHandler` type + `EnqueueParameters`                                               | `apps/api/src/modules/jobs/jobs.types.ts`                                           |
| Enqueue / mark-running / mark-completed / mark-failed / retry                         | `apps/api/src/modules/jobs/jobs.service.ts`                                         |
| Pure data access (`findPendingJobs`, `updateMany`, scoped updates)                    | `apps/api/src/modules/jobs/jobs.repository.ts`                                      |
| Constants (lock TTL, intervals, stale window, retry backoff)                          | `apps/api/src/modules/jobs/jobs.constants.ts`                                       |
| Retry backoff / idempotency-window utilities                                          | `apps/api/src/modules/jobs/jobs.utilities.ts`                                       |
| Prisma `model Job` + `enum JobType` / `enum JobStatus`                                | `apps/api/prisma/schema.prisma` (search `model Job`)                                |
| Original table migration (enum creation)                                              | `apps/api/prisma/migrations/20260318_add_jobs_table/migration.sql`                  |
| **Exact `ALTER TYPE … ADD VALUE` pattern** for a new enum value                       | `apps/api/prisma/migrations/20260327_add_user_memory_system/migration.sql` (L27–28) |

**Hard architecture facts (ESLint-enforced — see `apps/api/CLAUDE.md` rules 12–14c, 67–73):**

- The **handler** is the worker. Its signature is the `JobHandler` type
  (`jobs.types.ts`): `(job: Job) => Promise<Record<string, unknown>>`. It receives the raw
  Prisma `Job` row (with `job.tenantId`, `job.payload`, `job.attempts`, `job.maxAttempts`) and
  returns a plain JSON result object that gets persisted to `job.result`.
- A handler is a `@Injectable()` class with a single `async handle(job: Job)` method — **not** a
  loose function. Keep `handle` thin; push real logic into the relevant module's **repository**
  and a `*.utilities.ts` file (rule 14a: services/handlers orchestrate, utilities hold logic;
  `handle` should stay ≤ 30 lines / complexity ≤ 10 — extract if it grows).
- **Never import `PrismaService` into a handler.** Reuse the owning module's repository (as
  `ConnectorSyncHandler` injects `ConnectorsRepository`). Repositories are the only Prisma layer
  and **every method takes `tenantId`** (rules 14b, 26).
- `JobType` is both a **local TS enum** (`enums/job.enums.ts`) **and** a **Prisma enum**
  (`schema.prisma`). They must stay in lockstep, and a Postgres `ALTER TYPE` migration is
  required to add a value (rule 30) — `prisma generate` alone is not enough.
- No `any`, no `!`, no `==`, no `console.log`, `node:` import prefix, explicit return types,
  kebab-case filenames, full word `utilities`/`utility` (never `utils`/`util`), no semicolons,
  single quotes, width 100 (Prettier).

---

## Exact step-by-step implementation

Run everything from repo root. **pnpm only, Node 22.** Replace `<job_type>` (the
snake_case enum value, e.g. `vulnerability_scan`), `<JOB_TYPE_KEY>` (the enum member, e.g.
`VULNERABILITY_SCAN`), and `<HandlerName>` (PascalCase, e.g. `VulnerabilityScanHandler`).

### 0. Branch (never work on `main`/`master`)

```bash
git checkout -b feat/api-<job_type>-job
```

### 1. Confirm prerequisites

- Any Prisma model the handler reads/writes already exists + has a migration (else do
  [`add-prisma-model.md`](add-prisma-model.md) first).
- Decide **where the handler lives**: in `apps/api/src/modules/jobs/handlers/` if it only
  touches generic plumbing, or in the **owning feature module** (like
  `ai-agents/ai-agent-task.handler.ts`) if it needs that module's repository/services. Prefer the
  owning module to avoid circular imports and to reuse its repository.

### 2. Add the `JobType` enum value (TWO places — they must match)

**(a) Local TS enum** — `apps/api/src/modules/jobs/enums/job.enums.ts`:

```ts
export enum JobType {
  CONNECTOR_SYNC = 'connector_sync',
  // … existing members …
  MEMORY_EXTRACTION = 'memory_extraction',
  <JOB_TYPE_KEY> = '<job_type>',
}
```

**(b) Prisma enum** — `apps/api/prisma/schema.prisma` (search `enum JobType`):

```prisma
enum JobType {
  connector_sync
  // … existing values …
  memory_extraction
  <job_type>
}
```

The string value in the TS enum **must equal** the Prisma enum identifier exactly
(`'<job_type>'`). The `jobs.type` column is the Postgres `JobType` enum, so a mismatch is a DB
write failure at enqueue time.

### 3. Write the Postgres migration (rule 30 — schema changes need a migration)

A new Postgres enum value cannot be added by `prisma generate`; it needs `ALTER TYPE`. Mirror
**`apps/api/prisma/migrations/20260327_add_user_memory_system/migration.sql`** exactly:

```bash
mkdir -p apps/api/prisma/migrations/$(date +%Y%m%d)_add_<job_type>_job_type
```

Create `migration.sql` in that folder with:

```sql
-- Add <job_type> to JobType enum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS '<job_type>';
```

> `ADD VALUE IF NOT EXISTS` is idempotent and safe to re-run (matches the existing migration).
> Note: Postgres cannot run `ALTER TYPE … ADD VALUE` inside the same transaction that then uses
> the new value — it lives fine in its own migration. Regenerate the client after
> (step 7). To verify the SQL matches the schema you can use:
> `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
> (run inside `apps/api`, per CLAUDE.md rule 30).

### 4. Write the handler (`@Injectable()`, `handle(job: Job)`)

Copy **`apps/api/src/modules/jobs/handlers/connector-sync.handler.ts`** and adapt. Place it in
`apps/api/src/modules/jobs/handlers/<job_type>.handler.ts` **or** in the owning feature module.
The return value is persisted to `job.result` (keep it small, JSON-serializable, no secrets).

```ts
import { Injectable, Logger } from '@nestjs/common'
import { toIso } from '../../../common/utils/date-time.utility'
import { VulnerabilitiesRepository } from '../../vulnerabilities/vulnerabilities.repository'
import type { Job } from '@prisma/client'

@Injectable()
export class VulnerabilityScanHandler {
  private readonly logger = new Logger(VulnerabilityScanHandler.name)

  constructor(private readonly vulnerabilitiesRepository: VulnerabilitiesRepository) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const targetId = payload?.['targetId'] as string | undefined

    if (!targetId) {
      throw new Error('targetId is required in job payload')
    }

    // ALWAYS scope by job.tenantId — the row carries the tenant; never trust anything else.
    const target = await this.vulnerabilitiesRepository.findByIdAndTenant(targetId, job.tenantId)
    if (!target) {
      throw new Error(`Target ${targetId} not found for tenant ${job.tenantId}`)
    }

    // … real work delegated to the repository / a *.utilities.ts function …

    return { targetId, scannedAt: toIso() }
  }
}
```

Handler contract notes (all observed in `job-processor.service.ts`):

- **Throw a plain `Error`** to fail the job. The processor catches it in `handleJobError`, calls
  `JobService.markFailed(...)`, and the row goes to `RETRYING` (if `attempts + 1 < maxAttempts`)
  or `FAILED`. Do **not** swallow errors and return success — that hides failures and skips
  retry/backoff.
- The handler runs under a Redis lock (`JOB_LOCK_TTL_SECONDS = 300`s) and a stale window
  (`STALE_RUNNING_WINDOW_MS = 30 min`). If your job can exceed 30 minutes, it will be recovered
  back to `PENDING` mid-flight (see step 8) — design for **idempotent re-execution** and chunk
  long work (rule 36: batch in 50s with `Promise.allSettled()`).
- Read inputs from `job.payload` defensively (it is `Json`, typed `unknown`); validate required
  fields and throw if missing, exactly like the reference handler.

### 5. Register the handler in `JobsModule.onModuleInit` (THE load-bearing step)

Edit `apps/api/src/modules/jobs/jobs.module.ts`. Three sub-edits:

1. Import the handler and (if external) its owning module / provider.
2. If the handler lives in another module, add that module to `imports:` (use
   `forwardRef(() => OwningModule)` if there is a cycle, as with `AiAgentsModule`); inject the
   handler in the constructor. If the handler lives under `jobs/handlers/`, add it to
   `providers:`.
3. **Add the `registerHandler` call in `onModuleInit`:**

```ts
onModuleInit(): void {
  // … existing registrations …
  this.processor.registerHandler(JobType.<JOB_TYPE_KEY>, job =>
    this.vulnerabilityScanHandler.handle(job)
  )
}
```

> **Without this line**, `registerDefaultHandlers()` leaves `JobType.<JOB_TYPE_KEY>` mapped to
> `placeholderJobHandler` — the job will be picked up, "complete" instantly with
> `{ handled: true, handlerType: 'default' }`, and do **nothing**. There is no error. This is
> the #1 trap of this skill. The bound arrow (`job => this.handler.handle(job)`) preserves
> `this`; do not pass the method reference bare.

### 6. Enqueue the job from a caller (`JobService.enqueue`)

Producers call `JobService.enqueue(...)` (`jobs.service.ts`) — never insert into the `jobs`
table directly. `EnqueueParameters` (`jobs.types.ts`):

```ts
await this.jobService.enqueue({
  tenantId,                       // REQUIRED — the job's tenant scope
  type: JobType.<JOB_TYPE_KEY>,
  payload: { targetId },          // plain JSON, NO secrets/credentials (rule 24, AGENTS.md §6)
  maxAttempts: 3,                 // default 3; use 1 for non-retryable work
  idempotencyKey: `vulnscan:${targetId}:${getCurrentScheduleWindow()}`, // optional, dedupes
  createdBy: user.email,          // optional provenance
  scheduledAt,                    // optional future-run time
})
```

- The caller is a **controller → service** path: the controller has `@RequirePermission(...)`
  (rule 25), `@Throttle(...)` on the mutation (rules 74, 80), and uses `@TenantId()` (never a
  client header — rule 76). The service calls `enqueue`.
- `idempotencyKey` is unique per `(tenantId, idempotencyKey)` (`@@unique` in schema); a duplicate
  key returns the existing job instead of creating a new one (see `JobService.checkIdempotency`).
  Use it to prevent duplicate scheduling (see `getCurrentScheduleWindow()` in `jobs.utilities.ts`
  and `JobSchedulerService`).
- For **scheduled/periodic** enqueue, add it to `JobSchedulerService.scheduleRuleExecution`
  (gated by `ENABLE_JOB_SCHEDULER=true`) following the detection/correlation pattern.

### 7. Regenerate the Prisma client + apply the migration

```bash
pnpm --filter @auraspear/api prisma:generate   # picks up the new JobType in the generated client
pnpm --filter @auraspear/api prisma:migrate     # applies the ALTER TYPE migration (dev)
```

If new rows need default/seed data, update the seed (rule 15: seeders idempotent — `upsert` /
`skipDuplicates`).

### 8. (Recovery already exists — verify, don't reinvent) stale-job recovery & poll resilience

You do **not** add new recovery code for a normal job. The processor already provides it
(`job-processor.service.ts`), and CLAUDE.md rules **90 / 91** require it stays intact:

- **Stale recovery** — `@Interval(STALE_RECOVERY_INTERVAL_MS)` `recoverStaleJobs()` resets any
  row stuck in `RUNNING` past `STALE_RUNNING_WINDOW_MS` (30 min) back to `PENDING` with an
  `error` note (rule 91). Your handler must therefore be **safe to re-run**.
- **Redis-down resilience** — `canPoll()` skips polling (with a logged warning) when
  `redisConnected` is false, tracked via `connect`/`error`/`close` events (rule 90). Never
  remove this; silent lock failures strand jobs in `PENDING`.
- **Per-job lock** — `acquireLock`/`releaseLock` (Redis `SET … NX EX`) guarantees one runner per
  job across instances. The executor path is `processJob → executeJobHandler →
markRunning → handler → markCompleted` (or `handleJobError`). Read it; do not duplicate it.

If your new job genuinely needs a _different_ timeout than 30 min, change it deliberately via the
constant in `jobs.constants.ts` and document why — do not special-case it inside the handler.

---

## Validation commands (real pnpm commands, from repo root)

Run in order. **Never claim a gate green without running it** (AGENTS.md §5,
[`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)).

```bash
pnpm install                                   # if deps changed
pnpm --filter @auraspear/api prisma:generate   # REQUIRED — new JobType must be in the client
pnpm typecheck                                 # HARD GATE (turbo → api tsc --noEmit). Must pass.
pnpm --filter @auraspear/api lint:strict       # ESLint --max-warnings 0. Enforces rules 1–100.
pnpm --filter @auraspear/api format:check      # Prettier (no semicolons, single quotes, width 100).
pnpm --filter @auraspear/api test              # jest — add a handler spec (see below).
pnpm build                                     # HARD GATE (turbo → nest build). Must pass.
```

Single-area test while iterating:

```bash
pnpm --filter @auraspear/api exec jest src/modules/jobs
```

Full pre-PR sweep:

```bash
pnpm validate                                  # turbo run typecheck lint:strict && format:check
```

Manual smoke (optional): apply the migration, `pnpm dev:api`, enqueue a job (via the producing
endpoint or a seed), and watch the structured logs for `Handler registered for job type:
<job_type>`, then `Job started`, `Job completed` from `JobProcessorService`. If you instead see
`{ handlerType: 'default' }` in the result, **you forgot step 5**.

> Hard gates that **must** be green: `pnpm typecheck`, `pnpm build`. `lint:strict` /
> `format:check` / `test` are advisory-but-expected (tracked debt is non-blocking, but you must
> run them and report results). See AGENTS.md §5.

---

## Docs to update

- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (+ [`docs/architecture/`](../../docs/architecture/))
  if the new job is an architecturally significant async flow.
- New enum value / pattern → record it in
  [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md) so future agents know the
  `JobType` + register-in-`onModuleInit` contract.
- If a **new endpoint** enqueues the job, add it to [`docs/API.md`](../../docs/API.md) and create
  the Next.js proxy route (rule 86) per [`../frontend/add-page.md`](../frontend/add-page.md).
- A notable decision (new long-running pipeline, changed timeout) → an ADR under
  [`docs/decisions/`](../../docs/decisions/).
- Cross-check [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).

---

## Security checks (must hold — AGENTS.md §6/§7, CLAUDE.md rules 24, 26, 90, 91, 97)

- **Tenant isolation**: the handler scopes **every** read/write by `job.tenantId`. Repository
  `update()`/`delete()` use `where: { id, tenantId }` (rule 26) — never `id` alone. A job must
  never touch another tenant's data; `job.tenantId` is the only source of tenancy (do not read
  tenant from payload-supplied free text and trust it).
- **No secrets in `payload` or `result`**: `job.payload` and the returned `result` are persisted
  in Postgres and logged in structured logs (`logJobStarted` logs `payload`). Never put
  credentials/API keys/tokens there (rule 24, AGENTS.md §6). Encrypt-at-rest stays in the
  connector store, not the job row. Pass an **id**, let the handler fetch + decrypt via the
  repository/encryption utility.
- **RBAC on the producer**: the endpoint that enqueues the job has
  `@RequirePermission(Permission.…)` (rule 25) and `@Throttle(...)` (rules 74, 80); tenant comes
  from `@TenantId()` / the validated JWT, never a client header (rule 76).
- **AI / destructive actions are approval-required**: if the job performs a destructive
  security/infra action (isolate host, block IP, disable connector, delete data), it must create
  a persisted `ApprovalRequest` and check permission **before executing** (rule 97, AGENTS.md
  §7). AI may suggest, not silently execute. **Never render raw AI output as HTML** and never
  emit HTML from a job result.
- **Recovery & resilience intact**: do not weaken `recoverStaleJobs()` (rule 91) or the
  Redis-connection guard / logging in `canPoll()` (rule 90). Stale jobs must auto-recover; poll
  must skip + log when Redis is down.
- **Errors don't leak internals**: handler `Error` messages are persisted to `job.error` and
  logged — keep them generic, no file paths / stack-derived internals (rules 44, 63, 77).
- Touching auth/RBAC/data exposure? Run
  [`../devsecops/run-security-scan.md`](../devsecops/run-security-scan.md).

---

## Common mistakes

- **Adding the `JobType` but not registering the handler in `JobsModule.onModuleInit`** → the
  job silently runs `placeholderJobHandler` and "completes" doing nothing (`{ handlerType:
'default' }`). No error is raised. This is the single biggest trap — verify the
  `registerHandler(JobType.<KEY>, …)` line exists.
- **Forgetting the Postgres migration** (`ALTER TYPE "JobType" ADD VALUE …`, rule 30) → enqueue
  fails at runtime with an invalid-enum DB error even though TypeScript compiles. `prisma
generate` does not alter the DB.
- **TS enum value ≠ Prisma enum identifier** → write to `jobs.type` fails. They must match
  byte-for-byte (`'<job_type>'`).
- **Importing `PrismaService` into the handler** → architecture violation (rule 14a/14b). Inject
  the owning module's repository (as `ConnectorSyncHandler` injects `ConnectorsRepository`).
- **Putting secrets/credentials in `payload` or the returned `result`** → persisted + logged
  credential exposure (rule 24, AGENTS.md §6). Pass an id; fetch/decrypt in the handler.
- **Swallowing errors and returning success** → breaks retry/backoff and hides failures. Throw a
  plain `Error`; the processor handles `markFailed` + retry scheduling.
- **Assuming a job runs once / exactly once** → with retries (`maxAttempts`) and stale recovery
  (30-min window) a handler can run again. Make it **idempotent** and chunk long work (rule 36).
- **Passing the bare method reference** `registerHandler(type, handler.handle)` → loses `this`.
  Use an arrow: `job => this.handler.handle(job)`.
- **Querying without `job.tenantId`** or `update`/`delete` by `id` alone → tenant-isolation
  breach (rule 26) and a security-review block.
- **Inserting into the `jobs` table directly** instead of `JobService.enqueue(...)\*\* → skips
  idempotency dedupe, logging, and defaults.
- File named `*.util.ts` / `*.utils.ts`, `any`, `!`, `==`, `console.log`, bare `crypto` import,
  semicolons → ESLint/Prettier failures (CLAUDE.md rules 1–11, 69).
- Claiming gates passed without running them (AGENTS.md §13).

---

## Final checklist

- [ ] Branch created (`feat/api-<job_type>-job`), not on `main`/`master`.
- [ ] Prisma model(s) the handler uses exist + migrated (or N/A).
- [ ] `JobType.<JOB_TYPE_KEY> = '<job_type>'` added to **both**
      `apps/api/src/modules/jobs/enums/job.enums.ts` **and** the Prisma `enum JobType` in
      `schema.prisma` (values match exactly).
- [ ] Migration `…_add_<job_type>_job_type/migration.sql` with
      `ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS '<job_type>';` created and applied.
- [ ] `<HandlerName>` is `@Injectable()` with `async handle(job: Job): Promise<Record<string,
    unknown>>`; scopes everything by `job.tenantId`; throws plain `Error` on failure; **no
      `PrismaService`** (reuses a repository); `handle` ≤ 30 lines / complexity ≤ 10.
- [ ] **`this.processor.registerHandler(JobType.<JOB_TYPE_KEY>, job => this.<handler>.handle(job))`
      added to `JobsModule.onModuleInit`** (and the handler/module wired into
      `imports:`/`providers:`/constructor).
- [ ] Producer enqueues via `JobService.enqueue(...)` with `tenantId`, `type`, JSON `payload`
      (**no secrets**), and `idempotencyKey` where dedupe is needed; producing endpoint has
      `@RequirePermission` + `@Throttle` and uses `@TenantId()`.
- [ ] Stale-recovery (`recoverStaleJobs`, rule 91) and Redis-down poll guard (`canPoll`, rule 90)
      left intact; handler is idempotent / re-run-safe.
- [ ] Handler unit test added under `apps/api/src/modules/.../__tests__/` (mock repository;
      assert tenant scoping + missing-payload throw).
- [ ] `pnpm --filter @auraspear/api prisma:generate` run; `pnpm typecheck` ✅ and `pnpm build` ✅
      (hard gates — actually run).
- [ ] `pnpm --filter @auraspear/api lint:strict`, `format:check`, and `test` run; results
      reported.
- [ ] Security: tenant-scoped, no secrets in payload/result, RBAC on producer, approval-required
      for destructive AI actions, no raw AI HTML.
- [ ] Docs updated where relevant (`docs/ARCHITECTURE.md` / `docs/API.md` / ADR /
      `memory/TECHNICAL_MEMORY.md`); frontend proxy route added if an endpoint enqueues it.
- [ ] Final response uses the AGENTS.md §13 template; no "all green" unless every required gate
      actually passed.
