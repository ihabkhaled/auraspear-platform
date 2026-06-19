# Background Jobs — AuraSpear Platform

> **Entry point first.** The single entry point for all contributors and AI agents is
> [`AGENTS.md`](../../AGENTS.md) (loading order, monorepo map, security invariants). Read it before
> editing. The authoritative, enforced rulebook for backend code is
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md); the frontend rulebook is
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md). **No AI agent may edit first and understand
> later.**

This document is the deep reference for **how AuraSpear runs background jobs**: the `JobType` enum
and the handlers registered in `JobsModule`, the job lifecycle/state machine, **stale-job
recovery**, and the **Redis state** the processor tracks (distributed locks + connection liveness).

Where this overlaps the runtime overview, this file goes deeper and the runtime doc stays the
"60-second" view:

| You want…                                             | Go to                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime overview (in-process worker, §6)              | [`RUNTIME.md`](RUNTIME.md) §6                                                        |
| Backend layering (controller/service/repo/handler)    | [`BACKEND.md`](BACKEND.md) · [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)        |
| Redis singleton / connection tuning                   | [`RUNTIME.md`](RUNTIME.md) §5.2 · [`apps/api/src/redis/`](../../apps/api/src/redis/) |
| Platform-wide architecture + request flow             | [`../ARCHITECTURE.md`](../ARCHITECTURE.md)                                           |
| HTTP contract (headers, paging, errors)               | [`API.md`](API.md)                                                                   |
| Tenancy invariants (every query scoped by `tenantId`) | [`TENANCY.md`](TENANCY.md)                                                           |
| RBAC / permission model                               | [`RBAC.md`](RBAC.md)                                                                 |
| The hard backend rules (don't violate)                | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 31, 32, 90, 91                |

> Every claim below is grounded in real repo files (paths cited). Where this file and a `CLAUDE.md`
> guide diverge, the **code wins**.

All job code lives under [`apps/api/src/modules/jobs/`](../../apps/api/src/modules/jobs/), except
the `AI_AGENT_TASK` handler, which lives with its domain in
[`apps/api/src/modules/ai-agents/ai-agent-task.handler.ts`](../../apps/api/src/modules/ai-agents/ai-agent-task.handler.ts).

---

## 1. The big picture

There is **no separate worker process** — jobs run **in-process inside the api**, driven by
`@nestjs/schedule` `@Interval` timers (see [`RUNTIME.md`](RUNTIME.md) §2 and §6). The pieces:

```
enqueue ──► Job row (Postgres, status=PENDING)
                 │
   @Interval(POLL_INTERVAL_MS) JobProcessorService.pollAndProcess()
                 │  findPendingJobs() → Redis SET NX lock per job → dispatch
                 ▼
        JobHandler(job)  (registered by JobType in JobsModule.onModuleInit)
                 │
        markRunning → handler runs → markCompleted / markFailed
                 │
   @Interval(STALE_RECOVERY_INTERVAL_MS) recoverStaleJobs()  (RUNNING > 30m → PENDING)
```

The Prisma source of truth is the `Job` model
([`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), `model Job`): `type`,
`status`, `payload` (Json), `result` (Json?), `error`, `attempts`/`maxAttempts`, `idempotencyKey`,
and the timestamps `scheduledAt` / `startedAt` / `completedAt`. It is tenant-owned
(`@@unique([tenantId, idempotencyKey])`) and indexed for the two hot query paths:
`@@index([tenantId, type, status])` and `@@index([status, scheduledAt])`.

### Key files

| File                                                                                   | Role                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`jobs.module.ts`](../../apps/api/src/modules/jobs/jobs.module.ts)                     | Wires providers; **registers every handler** in `onModuleInit()`     |
| [`job-processor.service.ts`](../../apps/api/src/modules/jobs/job-processor.service.ts) | Poll loop, Redis locks, dispatch, stale recovery, Redis state        |
| [`job-scheduler.service.ts`](../../apps/api/src/modules/jobs/job-scheduler.service.ts) | Opt-in periodic enqueuer for detection/correlation rules             |
| [`jobs.service.ts`](../../apps/api/src/modules/jobs/jobs.service.ts)                   | `enqueue` (idempotency), status transitions, stats, cancel/retry     |
| [`jobs.repository.ts`](../../apps/api/src/modules/jobs/jobs.repository.ts)             | Pure Prisma data access (tenant-scoped); priority fetch              |
| [`jobs.controller.ts`](../../apps/api/src/modules/jobs/jobs.controller.ts)             | `GET /jobs`, `/jobs/stats`, `/jobs/:id`; cancel / cancel-all / retry |
| [`enums/job.enums.ts`](../../apps/api/src/modules/jobs/enums/job.enums.ts)             | `JobType` and `JobStatus` enums                                      |
| [`jobs.constants.ts`](../../apps/api/src/modules/jobs/jobs.constants.ts)               | Lock prefix/TTL, intervals, retry/stale windows                      |
| [`jobs.utilities.ts`](../../apps/api/src/modules/jobs/jobs.utilities.ts)               | Retry backoff, stats builder, schedule-window key, terminal check    |
| [`jobs.types.ts`](../../apps/api/src/modules/jobs/jobs.types.ts)                       | `JobHandler` type, `EnqueueParameters`, `JobRuntimeStats`, etc.      |
| [`handlers/`](../../apps/api/src/modules/jobs/handlers/)                               | One handler class per job type (8 here + AI agent handler elsewhere) |

---

## 2. `JobType` and the registered handlers

The two enums are in [`enums/job.enums.ts`](../../apps/api/src/modules/jobs/enums/job.enums.ts).
There are **9 `JobType` values**. `JobsModule` implements `OnModuleInit` and registers **all 9**
into the processor's handler map in
[`onModuleInit()`](../../apps/api/src/modules/jobs/jobs.module.ts) — this is mandatory:
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 31 and
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 90 state that an unregistered handler leaves
its jobs **PENDING forever**; rule 32 says executor engines must actually be wired (no dead code).

| `JobType` (enum value)                                      | Handler (registered in `JobsModule`)                                                                   | Required payload key(s)                        | What it does                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `CONNECTOR_SYNC` (`connector_sync`)                         | [`ConnectorSyncHandler`](../../apps/api/src/modules/jobs/handlers/connector-sync.handler.ts)           | `connectorId`                                  | Loads tenant connector, updates `lastSyncAt`                                      |
| `DETECTION_RULE_EXECUTION` (`detection_rule_execution`)     | [`DetectionExecutionHandler`](../../apps/api/src/modules/jobs/handlers/detection-execution.handler.ts) | `ruleId`                                       | Runs `DetectionRulesExecutor`; bumps `hitCount`, **creates alerts** on match      |
| `CORRELATION_RULE_EXECUTION` (`correlation_rule_execution`) | [`CorrelationHandler`](../../apps/api/src/modules/jobs/handlers/correlation.handler.ts)                | `ruleId`                                       | Runs `CorrelationExecutor`; increments correlation hit metrics                    |
| `NORMALIZATION_PIPELINE` (`normalization_pipeline`)         | [`NormalizationHandler`](../../apps/api/src/modules/jobs/handlers/normalization.handler.ts)            | `pipelineId`                                   | Runs `NormalizationExecutor`; updates pipeline metrics                            |
| `SOAR_PLAYBOOK` (`soar_playbook`)                           | [`SoarPlaybookHandler`](../../apps/api/src/modules/jobs/handlers/soar-playbook.handler.ts)             | `executionId`, `playbookId`                    | Executes a SOAR playbook run                                                      |
| `HUNT_EXECUTION` (`hunt_execution`)                         | [`HuntExecutionHandler`](../../apps/api/src/modules/jobs/handlers/hunt-execution.handler.ts)           | `query` (`timeRange`, `startedBy` optional)    | Runs a threat-hunt query via `HuntsService`                                       |
| `AI_AGENT_TASK` (`ai_agent_task`)                           | [`AiAgentTaskHandler`](../../apps/api/src/modules/ai-agents/ai-agent-task.handler.ts)                  | `agentId` (+ session/prompt or trigger fields) | Routes the agent task through the AI connector cascade; user- vs system-triggered |
| `REPORT_GENERATION` (`report_generation`)                   | [`ReportGenerationHandler`](../../apps/api/src/modules/jobs/handlers/report-generation.handler.ts)     | `reportId`                                     | Generates report content from tenant data                                         |
| `MEMORY_EXTRACTION` (`memory_extraction`)                   | [`MemoryExtractionHandler`](../../apps/api/src/modules/jobs/handlers/memory-extraction.handler.ts)     | `tenantId`, `userId`, `threadId`               | Extracts cross-chat memory facts from a chat thread (see AI memory system)        |

Each handler conforms to the `JobHandler` contract in
[`jobs.types.ts`](../../apps/api/src/modules/jobs/jobs.types.ts):

```ts
export type JobHandler = (job: Job) => Promise<Record<string, unknown>>
```

The returned object is persisted to `Job.result` on success (see §3). Handlers read their inputs
from `job.payload` (a `Record<string, unknown>`) and **throw** on bad input — e.g. the detection
handler throws `'ruleId is required in job payload'`. Throwing routes the job into the failure/retry
path; it does not crash the processor.

> The AI agent handler is the only one declared outside `apps/api/src/modules/jobs/` — it lives in
> the `ai-agents` module and is imported into `JobsModule` via `forwardRef(() => AiAgentsModule)`.
> The `JobsModule` constructor injects all 8 in-module handlers **plus** `AiAgentTaskHandler`, then
> wires each via `processor.registerHandler(JobType.X, job => handler.handle(job))`.

### Registration mechanics & the placeholder default

Two registration steps happen, in order:

1. **Default placeholders (constructor).** `JobProcessorService`'s constructor calls
   `registerDefaultHandlers()`, which seeds the map with
   [`placeholderJobHandler`](../../apps/api/src/modules/jobs/jobs.utilities.ts) for **every**
   `JobType`. The placeholder just returns `{ handled: true, handlerType: DEFAULT, jobId }`. This
   guarantees the map is never missing a key during the boot window.
2. **Real handlers (`JobsModule.onModuleInit`).** After DI is ready, `JobsModule` overwrites each
   entry with the real handler. `registerHandler(type, handler)` logs the registration via
   `AppLoggerService`.

If a job's `type` somehow has **no** handler at dispatch time, `processJob()` calls
`handleMissingHandler()` → `jobService.markUnrecoverableFailure(...)` (status `FAILED`, no retry).

---

## 3. Job lifecycle & state machine

`JobStatus` ([`enums/job.enums.ts`](../../apps/api/src/modules/jobs/enums/job.enums.ts)) has 6
values: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `RETRYING`, `CANCELLED`. The transitions are
driven by `JobService` ([`jobs.service.ts`](../../apps/api/src/modules/jobs/jobs.service.ts)) and
the repository.

```
                 enqueue
                    │
                    ▼
   ┌──────────► PENDING ◄──────────── recoverStaleJobs (from RUNNING)
   │                │   ▲
   │  retry/        │   │ retry (FAILED|CANCELLED → PENDING, attempts=0)
   │  recovery      │   │
   │            markRunning
   │                │
   │                ▼
   │            RUNNING ──► markCompleted ──► COMPLETED  (terminal)
   │                │
   │           markFailed
   │            ┌───┴────────────────────┐
   │            ▼                         ▼
   └──── RETRYING (scheduledAt set)     FAILED (terminal)
         (attempts < maxAttempts)       (attempts >= maxAttempts)

   PENDING | RETRYING ──cancelJob/cancelAll──► CANCELLED (terminal)
```

Terminal statuses are defined by `isJobTerminal()` in
[`jobs.utilities.ts`](../../apps/api/src/modules/jobs/jobs.utilities.ts): `COMPLETED`, `FAILED`,
`CANCELLED`.

### Enqueue (with idempotency)

`JobService.enqueue(params)` ([`EnqueueParameters`](../../apps/api/src/modules/jobs/jobs.types.ts)):
if an `idempotencyKey` is supplied, `checkIdempotency()` looks it up via the compound unique
`tenantId_idempotencyKey`; a hit is **returned as-is** (deduplicated, logged as `skipped`) instead
of inserting a duplicate. Otherwise a row is created with `status=PENDING`, `payload` defaulting to
`{}`, and `maxAttempts` defaulting to **3**.

### Pickup → running → done

The processor (§4) sets `RUNNING` via `markRunning` (stamps `startedAt`, clears `error`/
`scheduledAt`), invokes the handler, then:

- **Success** → `markCompleted` writes the handler's returned object to `result`, sets
  `completedAt`, status `COMPLETED`.
- **Failure** → `markFailed(jobId, tenantId, error, currentAttempts, maxAttempts)` decides retry vs
  permanent failure (next section).

### Retry & backoff

`markFailed` computes `nextAttempt = currentAttempts + 1` and calls `shouldRetryJob(nextAttempt,
maxAttempts)` (`nextAttempt < maxAttempts`):

- **Retry** → status `RETRYING`, `scheduledAt = computeRetryScheduledAt(nextAttempt)`. Backoff is
  **exponential with a cap**: `min(BASE_RETRY_DELAY_MS * 2^(nextAttempt-1), MAX_RETRY_DELAY_MS)` =
  `min(30s * 2^n, 15min)` (see [`jobs.constants.ts`](../../apps/api/src/modules/jobs/jobs.constants.ts)
  and `computeRetryScheduledAt` in
  [`jobs.utilities.ts`](../../apps/api/src/modules/jobs/jobs.utilities.ts)). A `RETRYING` row with a
  future `scheduledAt` is eligible for re-pickup once that time passes (see `findPendingJobs`, §4).
- **No retry** → status `FAILED`, `completedAt` stamped. If this was a **permanent** failure (and an
  `AgentEventListenerService` is wired), the processor fires `onJobFailed(...)` **fire-and-forget**
  to notify the AI subsystem — a job failure never blocks on that notification.

### Cancel / retry (operator actions, via the controller)

- `cancelJob(id)` / `cancelAllJobs()` only flip **PENDING/RETRYING** rows to `CANCELLED`
  (repository `where: { status: { in: [PENDING, RETRYING] } }`). A `RUNNING` job cannot be
  cancelled mid-flight — `cancelJob` throws `409 errors.jobs.cannotCancel` if nothing matched.
- `retryJob(id)` only accepts **FAILED/CANCELLED** rows (else `409 errors.jobs.cannotRetry`); it
  resets to `PENDING`, `attempts=0`, clears `error`/`result`/`startedAt`/`completedAt`, and sets a
  fresh `scheduledAt`.

All exceptions use `BusinessException` with a `messageKey` per
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 17/18.

---

## 4. The processor: poll loop, dispatch, and concurrency

[`JobProcessorService`](../../apps/api/src/modules/jobs/job-processor.service.ts) implements
`OnModuleInit` + `OnModuleDestroy` and runs two `@Interval` loops.

### `pollAndProcess()` — every `POLL_INTERVAL_MS` (10 s)

1. **Guard (`canPoll()`)** — skip (logged) if `activeJobs >= concurrency`, or if Redis is not
   connected (see §5).
2. **Fetch** — `jobRepository.findPendingJobs(availableSlots)` where
   `availableSlots = concurrency - activeJobs`. `findPendingJobs` selects `PENDING`/`RETRYING` rows
   whose `scheduledAt` is null or already due (`scheduledAt <= now`), **priority-first**:
   interactive types (`AI_AGENT_TASK`, `REPORT_GENERATION`, `SOAR_PLAYBOOK`) are pulled first, then
   remaining slots fill with background jobs — so bulk rule-execution never starves user-initiated
   work (ordering: `createdAt ASC`).
3. **Lock** — for each candidate, `acquireLock(job.id)` does a Redis `SET key '1' EX <ttl> NX`
   (§5). Locks are attempted in parallel (`Promise.all`).
4. **Dispatch** — `processLockResults()` iterates the locked candidates; for each acquired lock it
   increments `activeJobs` and runs `processJob(job)` (not awaited), with a `.finally()` that
   decrements `activeJobs` and **releases the lock**. It stops early if concurrency is hit or the
   process is shutting down.

Concurrency is `JOB_PROCESSOR_CONCURRENCY` (config, default **5**, read in the constructor).

### `recoverStaleJobs()` — every `STALE_RECOVERY_INTERVAL_MS` (5 min)

Covered in §6.

### Shutdown

`onModuleDestroy()` sets `shuttingDown = true`; both intervals early-return while shutting down, and
the dispatch loop stops claiming new work. In-flight handlers are not force-killed.

### Logging

Every step is logged through `AppLoggerService` with structured context
(`feature: AppLogFeature.JOBS`, `sourceType: JOB` for processing, `CRON` for stale recovery), so
poll skips, lock contention, dispatch summaries, completions, and failures are all queryable. See
the app-logs module for where these land.

---

## 5. Processor Redis state (locks + connection liveness)

Redis is a **hard dependency for jobs to make progress** — it provides per-job mutual exclusion
across api replicas and gates whether the processor polls at all. The shared `ioredis` client is
the global `REDIS_CLIENT` singleton from
[`apps/api/src/redis/redis.module.ts`](../../apps/api/src/redis/redis.module.ts) (tuned with
`retryStrategy: () => null` — it does **not** aggressively auto-reconnect; consumers track state).
See [`RUNTIME.md`](RUNTIME.md) §5.2.

### Distributed per-job lock

- **Key**: `` `${JOB_LOCK_PREFIX}${jobId}` `` = `job:lock:<jobId>` (`JOB_LOCK_PREFIX` in
  [`jobs.constants.ts`](../../apps/api/src/modules/jobs/jobs.constants.ts)).
- **Acquire**: `redis.set(key, '1', 'EX', JOB_LOCK_TTL_SECONDS, 'NX')` — atomic set-if-absent with
  a **300 s TTL** (`JOB_LOCK_TTL_SECONDS`). `acquireLock` returns `true` only when the reply is
  `RedisResponse.OK`. The `NX` ensures only one replica wins a given job; the `EX` TTL means a
  crashed holder's lock self-expires (the job becomes claimable again).
- **Release**: `releaseLock(jobId)` does `redis.del(key)` in the dispatch `.finally()`.
- **Both wrapped in try/catch**: a Redis error during acquire logs a `warn` and returns `false`
  (the job is simply skipped this cycle, **never silently swallowed**) — required by
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 90.

### Connection-state tracking (`redisConnected`)

The processor maintains a boolean `redisConnected`, seeded in `onModuleInit()` from
`redis.status === 'ready'` and updated by event listeners:

| ioredis event | Effect on `redisConnected`                               |
| ------------- | -------------------------------------------------------- |
| `connect`     | `true`                                                   |
| `error`       | `false`                                                  |
| `close`       | `false` (unless `shuttingDown`, to avoid shutdown noise) |

`canPoll()` checks `redisConnected`; when Redis is down it **skips the poll with a logged warning**
("Redis not connected, jobs cannot acquire locks") rather than failing silently. This is exactly
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) **rule 90**: silent lock-acquisition failures would
leave jobs sitting PENDING indefinitely with no diagnostic trail.

> Redis only holds the **ephemeral lock + liveness signal**. The durable job record (status,
> payload, result, attempts) lives in Postgres, so a Redis flush loses no jobs — it only pauses
> dispatch until Redis returns.

---

## 6. Stale-job recovery

A job that goes `RUNNING` but whose handler hangs, or whose api instance crashes after
`markRunning` but before `markCompleted`/`markFailed`, would otherwise stay `RUNNING` forever and
consume a concurrency slot. `recoverStaleJobs()` prevents that
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) **rule 91**).

- **Interval**: `@Interval(STALE_RECOVERY_INTERVAL_MS)` = **every 5 minutes**.
- **Threshold**: jobs `RUNNING` with `startedAt < now - STALE_RUNNING_WINDOW_MS` (**30 minutes**),
  via `subtractDuration(nowDate(), STALE_RUNNING_WINDOW_MS, 'millisecond')`.
- **Action**: `jobRepository.updateMany(...)` resets matched rows to `PENDING`, clears `startedAt`
  and `scheduledAt`, and stamps `error` = `"Recovered from stale RUNNING state — job exceeded
maximum execution window"`. The row is then re-pickable on the next poll.
- **Observability**: when `count > 0`, `logStaleRecovery()` logs a `warn` with the recovered count
  and the stale threshold (`sourceType: CRON`). Recovery never relies on manual intervention.

The same 30-minute window also surfaces in the stats endpoint as `staleRunning`
(`countStaleRunning` via `getStaleRunningThreshold()`), so operators can see stuck jobs **before**
the next recovery sweep.

---

## 7. Scheduling (opt-in periodic enqueue)

[`JobSchedulerService`](../../apps/api/src/modules/jobs/job-scheduler.service.ts) is the only
component that **auto-creates** jobs on a timer. It runs `scheduleRuleExecution()` every
`SCHEDULE_INTERVAL_MS` (**5 min**) and enqueues one `DETECTION_RULE_EXECUTION` and one
`CORRELATION_RULE_EXECUTION` job per active rule across all tenants (`maxAttempts: 1`).

- **Gated off by default**: it only runs when `ENABLE_JOB_SCHEDULER === 'true'` (otherwise it logs
  `skipped` — "Without real event ingestion, auto-scheduling creates noise").
- **No duplicate storms**: each enqueue uses an idempotency key built from
  `getCurrentScheduleWindow()` (the current time floored to the 5-minute window), so re-runs within
  the same window dedupe via §3's idempotency check.
- It uses `Promise.allSettled` and logs each rejected enqueue per rule.

> Two `TODO`s in this file note that the scheduler reads `detectionRule` / `correlationRule` via
> `PrismaService` directly, which violates the repository pattern in
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (services must not import Prisma). Treat that as
> known debt, not a pattern to copy.

Most jobs, though, are enqueued **on demand** by feature services calling `JobService.enqueue(...)`
(e.g. a connector sync, a hunt run, a report request, a chat thread triggering
`MEMORY_EXTRACTION`).

---

## 8. HTTP surface & RBAC

[`JobsController`](../../apps/api/src/modules/jobs/jobs.controller.ts) (`@Controller('jobs')`,
guarded by `AuthGuard` + `TenantGuard`) exposes:

| Method & path           | Permission        | Purpose                                              |
| ----------------------- | ----------------- | ---------------------------------------------------- |
| `GET /jobs`             | `JOBS_VIEW`       | Paginated, filterable, sortable list (tenant-scoped) |
| `GET /jobs/stats`       | `JOBS_VIEW`       | `JobRuntimeStats` counts by status + type breakdown  |
| `GET /jobs/:id`         | `JOBS_VIEW`       | Single job (404 → `errors.jobs.notFound`)            |
| `POST /jobs/cancel-all` | `JOBS_CANCEL_ALL` | Cancel all PENDING/RETRYING jobs (throttled 3/min)   |
| `POST /jobs/:id/cancel` | `JOBS_MANAGE`     | Cancel one PENDING/RETRYING job (throttled 10/min)   |
| `POST /jobs/:id/retry`  | `JOBS_MANAGE`     | Re-queue one FAILED/CANCELLED job (throttled 10/min) |

- Permissions are the `JOBS_*` values in
  [`common/enums/permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts) and are
  enforced per [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 25 / [`RBAC.md`](RBAC.md). Every
  mutation is throttled (rule 74).
- Query params are parsed with `ListJobsQuerySchema.parse(rawQuery)`
  ([`dto/list-jobs-query.dto.ts`](../../apps/api/src/modules/jobs/dto/list-jobs-query.dto.ts)) — the
  manual-parse pattern required by [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 19; the
  `sortBy` enum is the registered sortable-column allowlist (rule 87).
- The frontend reaches these via Next.js proxy routes under `apps/web/src/app/api/jobs/`
  ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 33) — a backend endpoint without its proxy
  route returns 404 HTML.

---

## 9. Adding a new job type (checklist)

When you add a `JobType`, do all of this in one change (mirrors
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rules 31/32):

1. Add the value to the `JobType` enum in
   [`enums/job.enums.ts`](../../apps/api/src/modules/jobs/enums/job.enums.ts).
2. Create a handler class implementing the `JobHandler` shape (read inputs from `job.payload`,
   throw on bad input, return a `Record<string, unknown>` result). Keep it thin and delegate to the
   domain executor/service — do **not** leave the executor disconnected (rule 32).
3. Add it to `providers` in [`jobs.module.ts`](../../apps/api/src/modules/jobs/jobs.module.ts),
   inject it in the constructor, and **register it** in `onModuleInit()` via
   `processor.registerHandler(JobType.YOUR_TYPE, job => handler.handle(job))`. An unregistered type
   sits PENDING forever (rule 31 / [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 90).
4. Wire its module into `JobsModule.imports` (use `forwardRef` if there's a cycle, as the existing
   `AlertsModule` / `HuntsModule` / `AiAgentsModule` imports do).
5. Add a Prisma migration if the `JobType` Postgres enum changes
   ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 30) and keep tenant scoping intact
   ([`TENANCY.md`](TENANCY.md)).

For the broader recipe, see [`skills/backend/`](../../skills/backend/) and the AI subsystem docs
([`../AI.md`](../AI.md)) if the job touches AI agents/memory.
