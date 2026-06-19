# Operations Guide

Operational reference for running and maintaining the AuraSpear platform: the
background job system, stale-job recovery, health checks, structured logging,
Redis usage, scaling, and backups.

> Scope: this document is grounded in the `@auraspear/api` (NestJS 11) service
> under `apps/api` and the Docker Compose stacks under `infra/docker`. File
> paths are cited so you can verify every claim against the source.

---

## 1. Running the Stack

### 1.1 Docker Compose (recommended)

The base stack lives in `infra/docker/docker-compose.yml` and runs four
services on the internal `auraspear` Docker network:

| Service    | Image                  | Host port (base)         | Notes                             |
| ---------- | ---------------------- | ------------------------ | --------------------------------- |
| `postgres` | `postgres:16-alpine`   | not published            | volume `pgdata`                   |
| `redis`    | `redis:7-alpine`       | not published            | volume `redisdata`; `--save 60 1` |
| `api`      | `auraspear/api:latest` | `${API_PORT:-4000}:4000` | NestJS BFF                        |
| `web`      | `auraspear/web:latest` | `${WEB_PORT:-3000}:3000` | Next.js frontend                  |

Secure-by-default: in the base file Postgres and Redis are **not** published to
the host — they are reachable only over the Docker network
(`infra/docker/docker-compose.yml`).

Overlays compose on top of the base file:

- **Dev** — `infra/docker/docker-compose.dev.yml` (opens internal ports for debugging).
- **Prod** — `infra/docker/docker-compose.prod.yml` (hardening overlay).

Production launch (from the repo root, per the header comment in
`docker-compose.prod.yml`):

```bash
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.prod.yml up -d --build
# or the wrapper script: pnpm docker:prod
```

The prod overlay (`infra/docker/docker-compose.prod.yml`):

- Sets `redis-server --requirepass ${REDIS_PASSWORD:?...}` — `REDIS_PASSWORD` is
  **required** (the `:?` fails the launch if missing) — plus `--save 60 1` and
  `--loglevel warning`.
- Sets `restart: always` on `api` and `web`, and forces `NODE_ENV=production`
  and `LOG_LEVEL=info` on the api.
- Keeps Postgres/Redis internal (no host ports — inherited from the base file).

Dependency ordering: `api` waits for `postgres` and `redis` to be
`service_healthy`; `web` waits for `api` to be `service_healthy`
(`docker-compose.yml`, `depends_on`).

### 1.2 Running the API directly

From `apps/api` (commands per `apps/api/CLAUDE.md`):

```bash
npm run start:dev      # watch mode
npm run start:debug    # debug + watch
npm run start:prod     # production
npm run build          # nest build
```

Database lifecycle:

```bash
npm run prisma:generate       # generate client
npm run prisma:migrate        # dev migrations
npm run prisma:migrate:prod   # production migrations
npm run prisma:seed           # seed
```

### 1.3 Key operational environment variables

Validated by `apps/api/src/config/env.validation.ts` (Zod):

| Variable                    | Default      | Notes                                                       |
| --------------------------- | ------------ | ----------------------------------------------------------- |
| `NODE_ENV`                  | `production` | defaults to production for safe-by-default behavior         |
| `LOG_LEVEL`                 | `info`       | pino log level                                              |
| `REDIS_HOST`                | `localhost`  | overridden to `redis` in compose                            |
| `REDIS_PORT`                | `6379`       |                                                             |
| `REDIS_PASSWORD`            | (empty)      | must be ≥ 16 chars when `NODE_ENV=production` (`.refine()`) |
| `JOB_PROCESSOR_CONCURRENCY` | `5`          | read in `JobProcessorService` constructor                   |
| `ENABLE_JOB_SCHEDULER`      | unset (off)  | read directly in `JobSchedulerService`                      |

---

## 2. Background Job System

The job system is a **database-backed queue** (Postgres `Job` table via Prisma)
with **Redis distributed locks** for safe multi-instance processing. It lives in
`apps/api/src/modules/jobs/`.

### 2.1 Components

| File                       | Responsibility                                                             |
| -------------------------- | -------------------------------------------------------------------------- |
| `job-processor.service.ts` | Polls for pending jobs, acquires locks, runs handlers, recovers stale jobs |
| `job-scheduler.service.ts` | Optionally enqueues detection/correlation rule jobs on an interval         |
| `jobs.service.ts`          | Enqueue, status transitions, stats, cancel, retry                          |
| `jobs.repository.ts`       | Pure Prisma data access (priority fetch, counts, status updates)           |
| `jobs.controller.ts`       | HTTP endpoints for listing/managing jobs                                   |
| `handlers/*.handler.ts`    | Per-job-type business logic                                                |
| `jobs.constants.ts`        | Timing/lock constants                                                      |
| `enums/job.enums.ts`       | `JobStatus`, `JobType`                                                     |

### 2.2 Job statuses and types

`JobStatus` (`enums/job.enums.ts`): `pending`, `running`, `completed`,
`failed`, `retrying`, `cancelled`.

`JobType` (`enums/job.enums.ts`):

- `connector_sync`
- `detection_rule_execution`
- `correlation_rule_execution`
- `normalization_pipeline`
- `soar_playbook`
- `hunt_execution`
- `ai_agent_task`
- `report_generation`
- `memory_extraction`

### 2.3 Handler registration

`JobProcessorService` seeds every `JobType` with a `placeholderJobHandler`
default in its constructor (`registerDefaultHandlers()`), then the
`JobsModule.onModuleInit()` overrides each type with the real handler
(`jobs.module.ts`):

| Job type                     | Handler                     |
| ---------------------------- | --------------------------- |
| `connector_sync`             | `ConnectorSyncHandler`      |
| `correlation_rule_execution` | `CorrelationHandler`        |
| `detection_rule_execution`   | `DetectionExecutionHandler` |
| `hunt_execution`             | `HuntExecutionHandler`      |
| `memory_extraction`          | `MemoryExtractionHandler`   |
| `normalization_pipeline`     | `NormalizationHandler`      |
| `report_generation`          | `ReportGenerationHandler`   |
| `soar_playbook`              | `SoarPlaybookHandler`       |
| `ai_agent_task`              | `AiAgentTaskHandler`        |

A handler is a function `(job: Job) => Promise<Record<string, unknown>>`. The
returned object is stored as the job `result`. Throwing an `Error` triggers the
failure/retry path. Example: `connector-sync.handler.ts` validates
`payload.connectorId`, updates `lastSyncAt`, and fire-and-forget notifies the AI
agent event listener.

### 2.4 Polling and dispatch (`pollAndProcess`)

`@Interval(POLL_INTERVAL_MS)` runs every **10 seconds**
(`POLL_INTERVAL_MS = 10_000` in `jobs.constants.ts`). On each tick
(`job-processor.service.ts`):

1. Skip if shutting down, or if `canPoll()` returns false (see §2.6).
2. Compute `availableSlots = concurrency - activeJobs`.
3. Fetch pending jobs via `jobRepository.findPendingJobs(availableSlots)`.
4. Try to acquire a Redis lock per job (`acquireLock`).
5. Dispatch locked jobs; jobs whose lock is already held by another instance
   are skipped (logged at debug).

**Priority fetch** (`jobs.repository.ts`, `findPendingJobs`): interactive job
types (`ai_agent_task`, `report_generation`, `soar_playbook`) are fetched first,
then remaining slots are filled with background jobs — so bulk rule executions
do not starve user-initiated tasks. Only `pending` and `retrying` jobs whose
`scheduledAt` is null or `<= now` are eligible.

**Concurrency**: configured from `JOB_PROCESSOR_CONCURRENCY` (default `5`). The
processor tracks `activeJobs` and refuses to exceed `concurrency`
(`processLockResults` breaks the loop when the limit is hit).

### 2.5 Distributed locking

To prevent two instances from running the same job, the processor uses a Redis
`SET key '1' EX <ttl> NX` lock (`acquireLock`):

- Key: `job:lock:{jobId}` (`JOB_LOCK_PREFIX` in `jobs.constants.ts`).
- TTL: `JOB_LOCK_TTL_SECONDS = 300` (5 minutes).
- Lock acquired only when `SET` returns `OK` (`RedisResponse.OK`).
- The lock is released (`releaseLock` → `redis.del`) in the `.finally()` after
  the job finishes (`processLockResults`).
- Lock failures (Redis errors) are caught and logged as a warning and return
  `false` rather than throwing.

### 2.6 Redis connection-state gating

`JobProcessorService` tracks `redisConnected` from ioredis events registered in
`onModuleInit()` (`connect` → true, `error` → false, `close` → false unless
shutting down). `canPoll()` **skips polling with a logged warning when Redis is
down** ("Poll skipped — Redis not connected, jobs cannot acquire locks"). This
makes a Redis outage diagnosable instead of letting jobs sit `pending` silently.

### 2.7 Enqueue and idempotency

`JobService.enqueue()` (`jobs.service.ts`):

- If `idempotencyKey` is supplied, it first calls `findByIdempotencyKey`; an
  existing job short-circuits and is returned (deduplicated, logged as skipped).
- Otherwise creates a job with `maxAttempts` defaulting to `3`, optional
  `scheduledAt`, `payload`, `createdBy`.
- Uniqueness is enforced by the compound key `(tenantId, idempotencyKey)`
  (`findByIdempotencyKey` uses `tenantId_idempotencyKey`).

The AI orchestrator enqueues `ai_agent_task` jobs with `maxAttempts: 2` and an
idempotency key of `orchestrator:{agentId}:{actionType}:{uuid}`
(`orchestrator.service.ts`, `enqueueAgentJob`).

### 2.8 Status transitions, retries, and backoff

Driven by `JobService`:

- `markRunning` → sets `running`, `startedAt = now`, clears `error`/`scheduledAt`.
- `markCompleted` → sets `completed`, stores `result`, sets `completedAt`.
- `markFailed` → increments attempts; if `nextAttempt < maxAttempts`
  (`shouldRetryJob`), status becomes `retrying` and `scheduledAt` is set by
  exponential backoff; otherwise status becomes `failed`.
- `markUnrecoverableFailure` → used when **no handler is registered** for the
  job type; marks `failed` immediately (`JobProcessorService.handleMissingHandler`).

**Exponential backoff** (`jobs.utilities.ts`, `computeRetryScheduledAt`):
`min(BASE_RETRY_DELAY_MS * 2^(nextAttempt-1), MAX_RETRY_DELAY_MS)` where
`BASE_RETRY_DELAY_MS = 30_000` (30 s) and `MAX_RETRY_DELAY_MS = 15 * 60_000`
(15 min), capped.

On **permanent** failure (`willRetry === false`), the processor fire-and-forget
notifies the AI agent event listener via `onJobFailed`
(`handleJobError` in `job-processor.service.ts`).

### 2.9 Job scheduler (optional)

`JobSchedulerService` runs `@Interval(SCHEDULE_INTERVAL_MS)` every **5 minutes**
(`SCHEDULE_INTERVAL_MS = 5 * 60_000`). It is **disabled unless
`ENABLE_JOB_SCHEDULER=true`** (read directly from `process.env`); when disabled
it logs a skipped entry and returns. When enabled it enqueues
`detection_rule_execution` and `correlation_rule_execution` jobs for every
active rule across all tenants, using `Promise.allSettled` and a per-window
idempotency key (`detection:{ruleId}:{window}` / `correlation:{ruleId}:{window}`,
where the window is floored to the 5-minute interval via
`getCurrentScheduleWindow`).

> Note: this service contains documented `TODO`s — it reads `detectionRule` /
> `correlationRule` via Prisma directly, which deviates from the repository
> pattern.

### 2.10 Agent schedule heartbeat

Separately, `apps/api/src/modules/ai/orchestrator/agent-scheduler.service.ts` is
the **only** `@Cron` job — a single `*/30 * * * * *` (every 30 s) tick. It pulls
due schedules from `ai_agent_schedules`, dispatches each through the orchestrator
(`dispatchAgentTask`), and marks run start/completion. A schedule that throws on
dispatch is marked `failed` and given a disabled reason
(`setDisabledReason`).

### 2.11 Job management endpoints

`JobsController` (`jobs.controller.ts`), guarded by `AuthGuard` + `TenantGuard`,
each endpoint `@RequirePermission(...)`, all tenant-scoped:

| Method & path           | Permission        | Throttle  |
| ----------------------- | ----------------- | --------- |
| `GET /jobs`             | `JOBS_VIEW`       | —         |
| `GET /jobs/stats`       | `JOBS_VIEW`       | —         |
| `GET /jobs/:id`         | `JOBS_VIEW`       | —         |
| `POST /jobs/cancel-all` | `JOBS_CANCEL_ALL` | 3 / 60 s  |
| `POST /jobs/:id/cancel` | `JOBS_MANAGE`     | 10 / 60 s |
| `POST /jobs/:id/retry`  | `JOBS_MANAGE`     | 10 / 60 s |

- **Cancel** transitions `pending`/`retrying` → `cancelled`; if no row matches
  (job already running/terminal) the service throws `409`
  (`errors.jobs.cannotCancel`).
- **Cancel-all** cancels all `pending`/`retrying` jobs for the tenant.
- **Retry** only works from `failed`/`cancelled`; it resets `attempts = 0`,
  clears `error`/`result`/timestamps, and re-queues as `pending`
  (`jobs.repository.ts`, `retryJob`). Invalid states throw `409`
  (`errors.jobs.cannotRetry`).

`GET /jobs/stats` returns counts by status (`pending`, `running`, `retrying`,
`failed`, `completed`, `cancelled`), plus `delayed` (scheduled in the future),
`staleRunning`, a `total`, and a per-type breakdown (`JobService.getStats` →
`buildJobStats`).

---

## 3. Stale-Job Recovery

Jobs that crash mid-flight (process killed, instance lost) can be left stuck in
`running`. A periodic recovery task auto-unsticks them.

`JobProcessorService.recoverStaleJobs()` runs `@Interval(STALE_RECOVERY_INTERVAL_MS)`
every **5 minutes** (`STALE_RECOVERY_INTERVAL_MS = 5 * 60_000`):

- Computes `staleThreshold = now - STALE_RUNNING_WINDOW_MS` where
  `STALE_RUNNING_WINDOW_MS = 30 * 60_000` (**30 minutes**).
- `updateMany` resets every job with `status = running` and
  `startedAt < staleThreshold` back to `pending`, sets the error message
  "Recovered from stale RUNNING state — job exceeded maximum execution window",
  and nulls `startedAt`/`scheduledAt`.
- Logs a warning with the recovered count when any rows were reset.

The recovered jobs become eligible for the next poll and run again. The same
30-minute window is surfaced in stats via `countStaleRunning` /
`getStaleRunningThreshold`.

---

## 4. Health Checks

Module: `apps/api/src/modules/health/`.

### 4.1 Endpoints (`health.controller.ts`)

| Method & path          | Auth                  | Permission           |
| ---------------------- | --------------------- | -------------------- |
| `GET /health`          | `@Public()` (no auth) | —                    |
| `GET /health/services` | bearer                | `SYSTEM_HEALTH_VIEW` |

> With the global API prefix the public probe is `/api/v1/health` — this is the
> path used by the Docker `api` healthcheck in
> `infra/docker/docker-compose.yml`.

### 4.2 Overall health (`GET /health`)

`HealthService.getOverallHealth()` runs `checkDatabase()` and `checkRedis()` in
parallel, each measuring latency:

- `checkDatabase` → `repository.pingDatabase()`.
- `checkRedis` → `redis.ping()` on the **shared** Redis client.

Status aggregation (`health.utilities.ts`, `determineOverallStatus`):

- both down → `down`
- exactly one down → `degraded`
- both healthy → `healthy`

`getOverallHealthOrThrow()` throws `503`
(`errors.health.serviceUnavailable`) when status is `down`. The response shape
is `{ status, timestamp, checks: { database, redis } }` where each check is
`{ status, latencyMs }`.

> Per `apps/api/CLAUDE.md` the public health endpoint deliberately omits the
> application version, and status responses return service names only — never
> internal URLs/hosts/ports.

### 4.3 Connector health (`GET /health/services`)

`getAllServiceHealth(tenantId)` enumerates the tenant's enabled connectors and
runs `connectorsService.testConnection` per connector in parallel. A connector
is `degraded` when latency `> 3000ms` and `down` on failure
(`determineConnectorHealthStatus`); a thrown error yields a failed result with
`latencyMs: -1` (`buildFailedServiceHealthResult`).

### 4.4 Container healthchecks

- **api**: `wget --spider http://localhost:4000/api/v1/health`, interval `30s`,
  `start_period 25s`, retries `3`.
- **postgres**: `pg_isready`, interval `10s`, retries `5`.
- **redis** (base): `redis-cli ping`; (prod) `redis-cli -a "$REDIS_PASSWORD" ping`.

---

## 5. Structured Logging (pino) + Redaction

### 5.1 pino HTTP logger

Configured in `apps/api/src/app.module.ts` via `nestjs-pino`
`LoggerModule.forRoot({ pinoHttp: ... })`:

- `level: process.env.LOG_LEVEL ?? 'info'` (prod compose pins `LOG_LEVEL=info`).
- `transport`: `pino-pretty` outside production; in production the transport is
  `undefined`, so logs are emitted as raw JSON suitable for aggregation.
- **`redact`** removes sensitive fields from request logs:
  - `req.headers.authorization`
  - `req.headers.cookie`
  - `req.body.password`
  - `req.body.currentPassword`
  - `req.body.newPassword`
  - `req.body.confirmPassword`

This redaction is mandated by the project rules (`apps/api/CLAUDE.md` rule 57) —
logging plaintext passwords or auth headers to log aggregation is treated as a
credential-exposure vector.

### 5.2 Application logging (`AppLoggerService`)

Beyond HTTP request logs, services emit structured application logs through
`AppLoggerService` (`src/common/services/app-logger.service.ts`) — often via a
`ServiceLogger` wrapper (`service-logger.ts`). Each entry carries a typed
context: `feature` (`AppLogFeature`), `action`, `outcome` (`AppLogOutcome`:
`SUCCESS`, `FAILURE`, `WARNING`, `SKIPPED`, `DENIED`, ...), `sourceType`
(`AppLogSourceType`: `JOB`, `CRON`, `SERVICE`, ...), `className`,
`functionName`, `tenantId`, `targetResource`/`targetResourceId`, optional
`stackTrace`, and a free-form `metadata` object.

The job processor uses this extensively — every lifecycle event (init, handler
registration, poll found/dispatched/skipped, job started/completed/failed,
lock failures, stale recovery, shutdown) is logged with structured context (see
the `log*` helpers in `job-processor.service.ts`). Stale recovery and the
scheduler tag their logs with `AppLogSourceType.CRON`.

---

## 6. Redis Usage

Redis is a **shared singleton** ioredis client, provided globally
(`apps/api/src/redis/redis.module.ts`, `@Global()`), injected via the
`REDIS_CLIENT` token.

Client configuration (`redis.module.ts`):

- `host`/`port`/`password` from config (`REDIS_HOST`, `REDIS_PORT`,
  `REDIS_PASSWORD`); empty password coerced to `undefined`.
- `connectTimeout: 5000` (`REDIS_DEFAULT_CONNECT_TIMEOUT`).
- `maxRetriesPerRequest: 1` (`REDIS_DEFAULT_MAX_RETRIES`).
- `retryStrategy: () => null` — does not auto-reconnect-loop; surfaces failures
  fast rather than queuing commands indefinitely.
- `connect`/`error` events are logged; `onModuleDestroy` calls `redis.quit()`.

Redis is used for:

1. **Job distributed locks** — `job:lock:{jobId}` (`SET ... EX 300 NX`),
   §2.5.
2. **Health checks** — `redis.ping()` on the shared client (§4.2). Per
   `apps/api/CLAUDE.md` rule 47, the health check must reuse the shared
   connection, never create per-request clients.
3. **Token revocation blacklist** — `TokenBlacklistService`
   (`src/modules/auth/token-blacklist.service.ts`) stores
   `token:blacklist:{jti}` keys with TTL matching the token expiry on logout /
   refresh rotation (per `apps/api/CLAUDE.md`).

> The `JobProcessorService` and `HealthService` both inject the same
> `REDIS_CLIENT` singleton — connection reuse is by design.

---

## 7. Scaling

- **Horizontal scaling is safe by design.** The job queue is Postgres-backed and
  guarded by Redis `SET NX` locks per job (§2.5), so multiple `api` instances
  can poll concurrently; only one instance wins the lock and runs a given job
  (others log a debug "lock not acquired" and skip).
- **Per-instance concurrency** is bounded by `JOB_PROCESSOR_CONCURRENCY`
  (default `5`); the processor never exceeds it. Tune per instance vs. database
  pool capacity.
- **Database pool**: per `apps/api/CLAUDE.md` rule 46, `PrismaService` appends
  `connection_limit=20&pool_timeout=10` to `DATABASE_URL`. Account for this when
  scaling instances against a single Postgres.
- **Singleton schedulers**: the rule/agent schedulers
  (`JobSchedulerService` @Interval, `AgentSchedulerService` @Cron) run on every
  instance. They rely on **idempotency keys** (per-window for rule scheduling)
  and DB run-state for agent schedules to avoid duplicate work across instances,
  not on leader election.
- **Resilience on Redis loss**: polling pauses with a logged warning when Redis
  is disconnected (`canPoll`), and stale jobs are auto-recovered when processing
  resumes (§3).
- The web tier scales independently behind the api; only `web` and `api` are
  host-reachable in production.

---

## 8. Backups

> The repository defines persistence and durability settings but does not ship a
> dedicated automated backup job. The following are the relevant durability
> facts from the infra files; an external backup process should be operated
> against them.

- **Postgres data** persists in the named volume `pgdata`
  (`infra/docker/docker-compose.yml`). This is the source of truth for jobs,
  cases, connectors, audit logs, etc. Back up via `pg_dump` against the
  `postgres` service (database `${POSTGRES_DB:-auraspear_soc}`, user
  `${POSTGRES_USER:-auraspear}`).
- **Redis data** persists in the named volume `redisdata` with RDB snapshotting
  enabled (`--save 60 1` — snapshot after 60 s if ≥ 1 key changed) in both base
  and prod compose. Redis holds only ephemeral/operational state (job locks,
  token blacklist), so Postgres is the authoritative backup target.
- Both volumes are declared at the bottom of `docker-compose.yml`
  (`volumes: pgdata, redisdata`).

---

## 9. Operational Quick Reference

| Concern                       | Value                                     | Source                                        |
| ----------------------------- | ----------------------------------------- | --------------------------------------------- |
| Job poll interval             | 10 s                                      | `POLL_INTERVAL_MS`                            |
| Job lock key / TTL            | `job:lock:{id}` / 300 s                   | `jobs.constants.ts`                           |
| Default max attempts          | 3 (orchestrator tasks: 2)                 | `jobs.service.ts` / `orchestrator.service.ts` |
| Retry backoff                 | 30 s → ×2 → cap 15 min                    | `computeRetryScheduledAt`                     |
| Stale-running window          | 30 min                                    | `STALE_RUNNING_WINDOW_MS`                     |
| Stale recovery interval       | 5 min                                     | `STALE_RECOVERY_INTERVAL_MS`                  |
| Rule scheduler interval       | 5 min (needs `ENABLE_JOB_SCHEDULER=true`) | `SCHEDULE_INTERVAL_MS`                        |
| Agent schedule heartbeat      | every 30 s                                | `agent-scheduler.service.ts`                  |
| Default processor concurrency | 5                                         | `JOB_PROCESSOR_CONCURRENCY`                   |
| Public health probe           | `GET /api/v1/health`                      | `health.controller.ts` + compose              |
| Connector degraded latency    | > 3000 ms                                 | `determineConnectorHealthStatus`              |
| Redis connect timeout         | 5000 ms                                   | `redis.constants.ts`                          |
| Prisma pool                   | `connection_limit=20&pool_timeout=10`     | `apps/api/CLAUDE.md` rule 46                  |
