import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../redis'
import { JobStatus, JobType } from './enums/job.enums'
import {
  JOB_LOCK_PREFIX,
  JOB_LOCK_TTL_SECONDS,
  STALE_RUNNING_WINDOW_MS,
  POLL_INTERVAL_MS,
  STALE_RECOVERY_INTERVAL_MS,
} from './jobs.constants'
import { JobRepository } from './jobs.repository'
import { JobService } from './jobs.service'
import { placeholderJobHandler } from './jobs.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType, RedisResponse } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import {
  nowMs,
  elapsedMs,
  subtractDuration,
  nowDate,
  toIso,
} from '../../common/utils/date-time.utility'
import { AgentEventListenerService } from '../ai/orchestrator/agent-event-listener.service'
import type { JobHandler } from './jobs.types'
import type { AppLogContext } from '../../common/services/app-logger.types'
import type { Job } from '@prisma/client'

@Injectable()
export class JobProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobProcessorService.name)
  private readonly handlers = new Map<JobType, JobHandler>()
  private readonly concurrency: number
  private activeJobs = 0
  private shuttingDown = false
  private redisConnected = false

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    private readonly appLogger: AppLoggerService,
    @Optional()
    @Inject(forwardRef(() => AgentEventListenerService))
    private readonly agentEventListener: AgentEventListenerService | null
  ) {
    this.concurrency = this.configService.get<number>('JOB_PROCESSOR_CONCURRENCY', 5)
    this.registerDefaultHandlers()
  }

  onModuleInit(): void {
    this.redisConnected = this.redis.status === 'ready'

    this.redis.on('connect', () => {
      this.redisConnected = true
    })

    this.redis.on('error', () => {
      this.redisConnected = false
    })

    this.redis.on('close', () => {
      if (!this.shuttingDown) {
        this.redisConnected = false
      }
    })

    this.appLogger.info('Job processor service initialized', {
      feature: AppLogFeature.JOBS,
      action: 'init',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'onModuleInit',
      metadata: {
        concurrency: this.concurrency,
        pollIntervalMs: POLL_INTERVAL_MS,
        staleRecoveryIntervalMs: STALE_RECOVERY_INTERVAL_MS,
        registeredHandlers: [...this.handlers.keys()],
        redisConnected: this.redisConnected,
      },
    })
  }

  /**
   * Register a job handler for a specific job type.
   */
  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler)
    this.appLogger.info(`Handler registered for job type: ${type}`, {
      feature: AppLogFeature.JOBS,
      action: 'registerHandler',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'registerHandler',
      metadata: { jobType: type },
    })
  }

  /**
   * Poll for pending jobs every 10 seconds and process them.
   */
  @Interval(POLL_INTERVAL_MS)
  async pollAndProcess(): Promise<void> {
    if (this.shuttingDown) return
    if (!this.canPoll()) return

    try {
      const availableSlots = this.concurrency - this.activeJobs
      const pendingJobs = await this.jobRepository.findPendingJobs(availableSlots)

      this.logPendingJobsFound(pendingJobs, availableSlots)

      const lockResults = await Promise.all(
        pendingJobs.map(async job => ({
          job,
          acquired: await this.acquireLock(job.id),
        }))
      )

      this.dispatchLockedJobs(lockResults)
    } catch (error) {
      this.logPollError(error)
    }
  }

  /**
   * Recover stale jobs that have been RUNNING for longer than the stale window.
   * Runs every 5 minutes.
   */
  @Interval(STALE_RECOVERY_INTERVAL_MS)
  async recoverStaleJobs(): Promise<void> {
    if (this.shuttingDown) return

    try {
      const staleThreshold = subtractDuration(nowDate(), STALE_RUNNING_WINDOW_MS, 'millisecond')
      const result = await this.jobRepository.updateMany({
        where: {
          status: JobStatus.RUNNING,
          startedAt: { lt: staleThreshold },
        },
        data: {
          status: JobStatus.PENDING,
          error: 'Recovered from stale RUNNING state — job exceeded maximum execution window',
          startedAt: null,
          scheduledAt: null,
        },
      })

      if (result.count > 0) {
        this.logStaleRecovery(result.count, staleThreshold)
      }
    } catch (error) {
      this.logStaleRecoveryError(error)
    }
  }

  onModuleDestroy(): void {
    this.shuttingDown = true
    this.appLogger.info('Job processor service shutting down', {
      feature: AppLogFeature.JOBS,
      action: 'shutdown',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'onModuleDestroy',
      metadata: { activeJobs: this.activeJobs },
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Job processing                                           */
  /* ---------------------------------------------------------------- */

  private async processJob(job: Job): Promise<void> {
    const startTime = nowMs()
    const handler = this.handlers.get(job.type as JobType)

    if (!handler) {
      await this.handleMissingHandler(job)
      return
    }

    try {
      await this.executeJobHandler(job, handler, startTime)
    } catch (error) {
      await this.handleJobError(job, error, startTime)
    }
  }

  private async handleMissingHandler(job: Job): Promise<void> {
    const errorMessage = `No handler registered for job type: ${job.type}`
    this.appLogger.error(errorMessage, {
      feature: AppLogFeature.JOBS,
      action: 'execute',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'processJob',
      tenantId: job.tenantId,
      targetResource: 'Job',
      targetResourceId: job.id,
      metadata: { jobType: job.type, reason: 'no_handler' },
    })
    await this.jobService.markUnrecoverableFailure(
      job.id,
      job.tenantId,
      errorMessage,
      job.attempts + 1
    )
  }

  private async executeJobHandler(job: Job, handler: JobHandler, startTime: number): Promise<void> {
    await this.jobService.markRunning(job.id, job.tenantId)
    this.logJobStarted(job)

    const result = await handler(job)
    const durationMs = elapsedMs(startTime)

    await this.jobService.markCompleted(job.id, job.tenantId, result)
    this.logJobCompleted(job, durationMs, result)
  }

  private async handleJobError(job: Job, error: unknown, startTime: number): Promise<void> {
    const durationMs = elapsedMs(startTime)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await this.jobService.markFailed(
      job.id,
      job.tenantId,
      errorMessage,
      job.attempts,
      job.maxAttempts
    )

    const willRetry = job.attempts + 1 < job.maxAttempts
    this.logJobFailure(job, errorMessage, durationMs, willRetry, error)

    // Fire-and-forget — notify AI when a job fails permanently
    if (!willRetry && this.agentEventListener) {
      void this.agentEventListener.onJobFailed(job.tenantId, job.id, job.type)
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Lock management                                          */
  /* ---------------------------------------------------------------- */

  private async acquireLock(jobId: string): Promise<boolean> {
    try {
      const key = `${JOB_LOCK_PREFIX}${jobId}`
      const result = await this.redis.set(key, '1', 'EX', JOB_LOCK_TTL_SECONDS, 'NX')
      return result === RedisResponse.OK
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.appLogger.warn(`Failed to acquire Redis lock for job ${jobId}: ${errorMessage}`, {
        feature: AppLogFeature.JOBS,
        action: 'acquireLock',
        outcome: AppLogOutcome.FAILURE,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'acquireLock',
        targetResource: 'Job',
        targetResourceId: jobId,
        metadata: { error: errorMessage, reason: 'redis_error' },
      })
      return false
    }
  }

  private async releaseLock(jobId: string): Promise<void> {
    try {
      const key = `${JOB_LOCK_PREFIX}${jobId}`
      await this.redis.del(key)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.appLogger.warn(`Failed to release Redis lock for job ${jobId}: ${errorMessage}`, {
        feature: AppLogFeature.JOBS,
        action: 'releaseLock',
        outcome: AppLogOutcome.WARNING,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'releaseLock',
        targetResource: 'Job',
        targetResourceId: jobId,
        metadata: { error: errorMessage },
      })
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Poll helpers                                             */
  /* ---------------------------------------------------------------- */

  private canPoll(): boolean {
    if (this.activeJobs >= this.concurrency) {
      this.appLogger.debug('Poll skipped — concurrency limit reached', {
        feature: AppLogFeature.JOBS,
        action: 'poll',
        outcome: AppLogOutcome.SKIPPED,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'pollAndProcess',
        metadata: { activeJobs: this.activeJobs, concurrency: this.concurrency },
      })
      return false
    }

    if (!this.redisConnected) {
      this.appLogger.warn('Poll skipped — Redis not connected, jobs cannot acquire locks', {
        feature: AppLogFeature.JOBS,
        action: 'poll',
        outcome: AppLogOutcome.SKIPPED,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'pollAndProcess',
        metadata: { reason: 'redis_disconnected' },
      })
      return false
    }

    return true
  }

  private dispatchLockedJobs(lockResults: Array<{ job: Job; acquired: boolean }>): void {
    const { lockedCount, skippedCount } = this.processLockResults(lockResults)

    if (lockedCount > 0 || skippedCount > 0) {
      this.logDispatchSummary(lockedCount, skippedCount)
    }
  }

  private processLockResults(lockResults: Array<{ job: Job; acquired: boolean }>): {
    lockedCount: number
    skippedCount: number
  } {
    let lockedCount = 0
    let skippedCount = 0

    for (const { job, acquired } of lockResults) {
      if (this.activeJobs >= this.concurrency) break
      if (this.shuttingDown) break

      if (!acquired) {
        skippedCount += 1
        this.logLockSkipped(job)
        continue
      }

      lockedCount += 1
      this.activeJobs += 1
      void this.processJob(job).finally(() => {
        this.activeJobs -= 1
        void this.releaseLock(job.id)
      })
    }

    return { lockedCount, skippedCount }
  }

  private logDispatchSummary(lockedCount: number, skippedCount: number): void {
    this.appLogger.info(
      `Poll dispatched ${String(lockedCount)} job(s), skipped ${String(skippedCount)} (locked)`,
      {
        feature: AppLogFeature.JOBS,
        action: 'poll',
        outcome: AppLogOutcome.SUCCESS,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'pollAndProcess',
        metadata: { lockedCount, skippedCount, activeJobs: this.activeJobs },
      }
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Setup                                                    */
  /* ---------------------------------------------------------------- */

  private registerDefaultHandlers(): void {
    const jobTypes = Object.values(JobType)
    for (const type of jobTypes) {
      this.handlers.set(type, placeholderJobHandler)
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logPendingJobsFound(pendingJobs: Job[], availableSlots: number): void {
    if (pendingJobs.length > 0) {
      this.appLogger.info(`Poll found ${String(pendingJobs.length)} pending job(s)`, {
        feature: AppLogFeature.JOBS,
        action: 'poll',
        outcome: AppLogOutcome.SUCCESS,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'pollAndProcess',
        metadata: {
          pendingCount: pendingJobs.length,
          availableSlots,
          activeJobs: this.activeJobs,
          jobIds: pendingJobs.map(pending => pending.id),
          jobTypes: pendingJobs.map(pending => pending.type),
        },
      })
    }
  }

  private logLockSkipped(job: Job): void {
    this.appLogger.debug(
      `Lock not acquired for job ${job.id} — already locked by another instance`,
      {
        feature: AppLogFeature.JOBS,
        action: 'acquireLock',
        outcome: AppLogOutcome.SKIPPED,
        sourceType: AppLogSourceType.JOB,
        className: 'JobProcessorService',
        functionName: 'pollAndProcess',
        tenantId: job.tenantId,
        targetResource: 'Job',
        targetResourceId: job.id,
        metadata: { jobType: job.type },
      }
    )
  }

  private logPollError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    this.appLogger.error(`Job poll failed: ${errorMessage}`, {
      feature: AppLogFeature.JOBS,
      action: 'poll',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'pollAndProcess',
      stackTrace: error instanceof Error ? error.stack : undefined,
      metadata: { error: errorMessage },
    })
  }

  private logJobStarted(job: Job): void {
    this.appLogger.info(`Job started: ${job.type}`, {
      feature: AppLogFeature.JOBS,
      action: 'execute',
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'processJob',
      tenantId: job.tenantId,
      targetResource: 'Job',
      targetResourceId: job.id,
      metadata: {
        jobType: job.type,
        attempt: job.attempts + 1,
        maxAttempts: job.maxAttempts,
        payload: job.payload ?? null,
        createdBy: job.createdBy ?? null,
      },
    })
  }

  private logJobCompleted(job: Job, durationMs: number, result: Record<string, unknown>): void {
    this.appLogger.info(`Job completed: ${job.type}`, {
      feature: AppLogFeature.JOBS,
      action: 'execute',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.JOB,
      className: 'JobProcessorService',
      functionName: 'processJob',
      tenantId: job.tenantId,
      targetResource: 'Job',
      targetResourceId: job.id,
      metadata: {
        jobType: job.type,
        durationMs,
        attempt: job.attempts + 1,
        result,
      },
    })
  }

  private logJobFailure(
    job: Job,
    errorMessage: string,
    durationMs: number,
    willRetry: boolean,
    error: unknown
  ): void {
    const logContext = this.buildJobFailureContext(job, errorMessage, durationMs, willRetry, error)

    if (willRetry) {
      this.appLogger.warn(`Job failed (will retry): ${job.type}`, logContext)
    } else {
      this.appLogger.error(`Job failed permanently: ${job.type}`, logContext)
    }
  }

  private buildJobFailureContext(
    job: Job,
    errorMessage: string,
    durationMs: number,
    willRetry: boolean,
    error: unknown
  ): AppLogContext {
    return {
      feature: AppLogFeature.JOBS,
      action: 'execute',
      outcome: willRetry ? AppLogOutcome.WARNING : AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.JOB as string,
      className: 'JobProcessorService',
      functionName: 'processJob',
      tenantId: job.tenantId,
      targetResource: 'Job',
      targetResourceId: job.id,
      stackTrace: error instanceof Error ? error.stack : undefined,
      metadata: {
        jobType: job.type,
        durationMs,
        attempt: job.attempts + 1,
        maxAttempts: job.maxAttempts,
        willRetry,
        error: errorMessage,
      },
    }
  }

  private logStaleRecovery(count: number, staleThreshold: Date): void {
    this.appLogger.warn(`Recovered ${String(count)} stale job(s) from RUNNING to PENDING`, {
      feature: AppLogFeature.JOBS,
      action: 'recoverStaleJobs',
      outcome: AppLogOutcome.WARNING,
      sourceType: AppLogSourceType.CRON,
      className: 'JobProcessorService',
      functionName: 'recoverStaleJobs',
      metadata: {
        recoveredCount: count,
        staleThresholdMs: STALE_RUNNING_WINDOW_MS,
        staleThresholdDate: toIso(staleThreshold),
      },
    })
  }

  private logStaleRecoveryError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    this.appLogger.error(`Stale job recovery failed: ${errorMessage}`, {
      feature: AppLogFeature.JOBS,
      action: 'recoverStaleJobs',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.CRON,
      className: 'JobProcessorService',
      functionName: 'recoverStaleJobs',
      stackTrace: error instanceof Error ? error.stack : undefined,
      metadata: { error: errorMessage },
    })
  }
}
