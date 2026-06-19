import { Injectable } from '@nestjs/common'
import { JobStatus } from './enums/job.enums'
import { JobRepository } from './jobs.repository'
import {
  buildJobStats,
  computeRetryScheduledAt,
  getStaleRunningThreshold,
  shouldRetryJob,
} from './jobs.utilities'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate, toIso } from '../../common/utils/date-time.utility'
import type { EnqueueParameters, JobRuntimeStats, ListJobsOptions } from './jobs.types'
import type { Job, Prisma } from '@prisma/client'

@Injectable()
export class JobService {
  private readonly log: ServiceLogger

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.JOBS, 'JobService')
  }

  async enqueue(params: EnqueueParameters): Promise<Job> {
    this.log.entry('enqueue', params.tenantId, {
      jobType: params.type,
      hasPayload: Boolean(params.payload),
    })

    const existing = await this.checkIdempotency(params)
    if (existing) return existing

    const job = await this.jobRepository.create({
      tenantId: params.tenantId,
      type: params.type,
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
      maxAttempts: params.maxAttempts ?? 3,
      idempotencyKey: params.idempotencyKey,
      scheduledAt: params.scheduledAt,
      createdBy: params.createdBy,
    })

    this.log.success('enqueue', params.tenantId, {
      jobId: job.id,
      jobType: params.type,
      maxAttempts: params.maxAttempts ?? 3,
      scheduledAt: params.scheduledAt ? toIso(params.scheduledAt) : null,
      createdBy: params.createdBy ?? null,
      hasPayload: Boolean(params.payload),
    })
    return job
  }

  async getJob(id: string, tenantId: string): Promise<Job | null> {
    this.log.debug('getJob', tenantId, 'Fetching job', { jobId: id })
    return this.jobRepository.findById(id, tenantId)
  }

  async getJobOrThrow(id: string, tenantId: string): Promise<Job> {
    this.log.debug('getJobOrThrow', tenantId, 'Fetching job or throw', { jobId: id })

    const job = await this.jobRepository.findById(id, tenantId)

    if (!job) {
      this.log.warn('getJobOrThrow', tenantId, `Job not found: ${id}`, { jobId: id })
      throw new BusinessException(404, `Job ${id} not found`, 'errors.jobs.notFound')
    }

    return job
  }

  async listJobs(
    tenantId: string,
    options?: ListJobsOptions
  ): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    this.log.debug('listJobs', tenantId, 'Listing jobs', { options })
    return this.jobRepository.listByTenant(tenantId, options)
  }

  async markRunning(jobId: string, tenantId: string): Promise<Job> {
    this.log.entry('markRunning', tenantId, { jobId })

    const job = await this.jobRepository.updateStatus(jobId, tenantId, {
      status: JobStatus.RUNNING,
      error: null,
      scheduledAt: null,
      startedAt: nowDate(),
    })

    this.log.success('markRunning', tenantId, { jobId })

    return job
  }

  async markCompleted(
    jobId: string,
    tenantId: string,
    result?: Record<string, unknown>
  ): Promise<Job> {
    this.log.entry('markCompleted', tenantId, { jobId })

    const completedJob = await this.jobRepository.updateStatus(jobId, tenantId, {
      status: JobStatus.COMPLETED,
      result: (result as Prisma.InputJsonValue) ?? undefined,
      error: null,
      scheduledAt: null,
      completedAt: nowDate(),
    })

    this.log.success('markCompleted', tenantId, { jobId, hasResult: Boolean(result) })

    return completedJob
  }

  async markFailed(
    jobId: string,
    tenantId: string,
    error: string,
    currentAttempts: number,
    maxAttempts: number
  ): Promise<{ retrying: boolean }> {
    this.log.entry('markFailed', tenantId, { jobId, currentAttempts, maxAttempts })

    const nextAttempt = currentAttempts + 1
    const retrying = shouldRetryJob(nextAttempt, maxAttempts)
    const newStatus = retrying ? JobStatus.RETRYING : JobStatus.FAILED

    await this.jobRepository.updateStatus(jobId, tenantId, {
      status: newStatus,
      error,
      attempts: nextAttempt,
      scheduledAt: retrying ? computeRetryScheduledAt(nextAttempt) : null,
      completedAt: retrying ? null : nowDate(),
    })

    if (retrying) {
      this.log.warn(
        'markFailed',
        tenantId,
        `Job ${jobId} failed, scheduling retry ${String(nextAttempt)}/${String(maxAttempts)}`,
        { jobId, attempt: nextAttempt, maxAttempts, error, newStatus, willRetry: retrying }
      )
    } else {
      this.log.error(
        'markFailed',
        tenantId,
        new Error(`Job ${jobId} failed permanently after ${String(maxAttempts)} attempts`),
        { jobId, attempt: nextAttempt, maxAttempts, error, newStatus, willRetry: retrying }
      )
    }

    return { retrying }
  }

  async markUnrecoverableFailure(
    jobId: string,
    tenantId: string,
    error: string,
    attempts: number
  ): Promise<Job> {
    this.log.error(
      'markUnrecoverableFailure',
      tenantId,
      new Error(`Job ${jobId} marked as unrecoverable failure`),
      { jobId, error, attempts }
    )

    return this.jobRepository.updateStatus(jobId, tenantId, {
      status: JobStatus.FAILED,
      error,
      attempts,
      scheduledAt: null,
      completedAt: nowDate(),
    })
  }

  async getStats(tenantId: string): Promise<JobRuntimeStats> {
    this.log.entry('getStats', tenantId)

    const now = nowDate()
    const [pending, running, retrying, failed, completed, cancelled, delayed, staleRunning, types] =
      await Promise.all([
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.PENDING),
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.RUNNING),
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.RETRYING),
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.FAILED),
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.COMPLETED),
        this.jobRepository.countByTenantAndStatus(tenantId, JobStatus.CANCELLED),
        this.jobRepository.countScheduled(tenantId, now),
        this.jobRepository.countStaleRunning(tenantId, getStaleRunningThreshold()),
        this.jobRepository.groupTypeCounts(tenantId),
      ])

    const stats = buildJobStats({
      pending,
      running,
      retrying,
      failed,
      completed,
      cancelled,
      delayed,
      staleRunning,
      typeBreakdown: types,
    })

    this.log.success('getStats', tenantId, {
      pending,
      running,
      retrying,
      failed,
      completed,
      cancelled,
    })

    return stats
  }

  async cancelJob(id: string, tenantId: string): Promise<boolean> {
    this.log.entry('cancelJob', tenantId, { jobId: id })

    const job = await this.getJobOrThrow(id, tenantId)

    const result = await this.jobRepository.cancelJob(id, tenantId)
    if (result.count > 0) {
      this.log.success('cancelJob', tenantId, {
        jobId: id,
        jobType: job.type,
        previousStatus: job.status,
      })
      return true
    }

    throw new BusinessException(
      409,
      `Job ${id} cannot be cancelled in its current state`,
      'errors.jobs.cannotCancel'
    )
  }

  async cancelAllJobs(tenantId: string): Promise<number> {
    this.log.entry('cancelAllJobs', tenantId)

    const result = await this.jobRepository.cancelAllPendingJobs(tenantId)

    this.log.success('cancelAllJobs', tenantId, { cancelledCount: result.count })

    return result.count
  }

  async retryJob(id: string, tenantId: string): Promise<Job> {
    this.log.entry('retryJob', tenantId, { jobId: id })

    const job = await this.getJobOrThrow(id, tenantId)

    const retryableStatuses = new Set<string>([JobStatus.FAILED, JobStatus.CANCELLED])

    if (!retryableStatuses.has(job.status)) {
      throw new BusinessException(
        409,
        `Job ${id} cannot be retried in status ${job.status}`,
        'errors.jobs.cannotRetry'
      )
    }

    const result = await this.jobRepository.retryJob(id, tenantId, nowDate())
    if (result.count === 0) {
      throw new BusinessException(409, `Job ${id} could not be retried`, 'errors.jobs.cannotRetry')
    }

    this.log.success('retryJob', tenantId, {
      jobId: id,
      jobType: job.type,
      previousStatus: job.status,
    })

    return this.getJobOrThrow(id, tenantId)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                  */
  /* ---------------------------------------------------------------- */

  private async checkIdempotency(params: EnqueueParameters): Promise<Job | null> {
    if (!params.idempotencyKey) return null

    const existing = await this.jobRepository.findByIdempotencyKey(
      params.tenantId,
      params.idempotencyKey
    )

    if (existing) {
      this.log.skipped('enqueue', params.tenantId, 'Deduplicated by idempotency key', {
        jobType: params.type,
        idempotencyKey: params.idempotencyKey,
        existingJobId: existing.id,
        existingStatus: existing.status,
      })
    }

    return existing ?? null
  }
}
