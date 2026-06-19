import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { JobStatus, JobType } from './enums/job.enums'
import { SortOrder } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { JobTypeCount, ListJobsOptions } from './jobs.types'
import type { Job } from '@prisma/client'

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.JobUncheckedCreateInput): Promise<Job> {
    return this.prisma.job.create({ data })
  }

  async findById(id: string, tenantId: string): Promise<Job | null> {
    return this.prisma.job.findFirst({
      where: { id, tenantId },
    })
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
    })
  }

  async updateStatus(
    id: string,
    tenantId: string,
    data: Prisma.JobUncheckedUpdateInput
  ): Promise<Job> {
    await this.prisma.job.updateMany({
      where: { id, tenantId },
      data,
    })

    return this.prisma.job.findFirstOrThrow({
      where: { id, tenantId },
    })
  }

  async updateMany(params: {
    where: Prisma.JobWhereInput
    data: Prisma.JobUncheckedUpdateManyInput
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.job.updateMany(params)
  }

  /**
   * Fetch pending jobs with priority: interactive jobs (AI_AGENT_TASK, REPORT_GENERATION)
   * are fetched first, then remaining slots filled with background jobs.
   * This prevents bulk rule execution jobs from starving user-initiated tasks.
   */
  async findPendingJobs(limit: number = 10): Promise<Job[]> {
    const pendingStatuses: JobStatus[] = [JobStatus.PENDING, JobStatus.RETRYING]
    const baseWhere = {
      status: { in: pendingStatuses },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: nowDate() } }],
    }

    // Priority: interactive jobs first
    const priorityJobs = await this.prisma.job.findMany({
      where: {
        ...baseWhere,
        type: { in: [JobType.AI_AGENT_TASK, JobType.REPORT_GENERATION, JobType.SOAR_PLAYBOOK] },
      },
      orderBy: { createdAt: SortOrder.ASC },
      take: limit,
    })

    const remainingSlots = limit - priorityJobs.length
    if (remainingSlots <= 0) {
      return priorityJobs
    }

    const priorityIds = priorityJobs.map(job => job.id)

    const backgroundJobs = await this.prisma.job.findMany({
      where: {
        ...baseWhere,
        ...(priorityIds.length > 0 ? { id: { notIn: priorityIds } } : {}),
      },
      orderBy: { createdAt: SortOrder.ASC },
      take: remainingSlots,
    })

    return [...priorityJobs, ...backgroundJobs]
  }

  async listByTenant(
    tenantId: string,
    options?: ListJobsOptions
  ): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20

    const where: Prisma.JobWhereInput = { tenantId }
    if (options?.type) {
      where.type = options.type as Prisma.EnumJobTypeFilter['equals']
    }
    if (options?.status) {
      where.status = options.status as Prisma.EnumJobStatusFilter['equals']
    }

    const sortField = options?.sortBy ?? 'createdAt'
    const sortDirection = (options?.sortOrder as SortOrder) ?? SortOrder.DESC
    const orderBy: Prisma.JobOrderByWithRelationInput = { [sortField]: sortDirection }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ])

    return { data, total, page, limit }
  }

  async countByTenantAndStatus(tenantId: string, status: JobStatus): Promise<number> {
    return this.prisma.job.count({
      where: { tenantId, status },
    })
  }

  async countScheduled(tenantId: string, scheduledAfter: Date): Promise<number> {
    return this.prisma.job.count({
      where: {
        tenantId,
        status: { in: [JobStatus.PENDING, JobStatus.RETRYING] },
        scheduledAt: { gt: scheduledAfter },
      },
    })
  }

  async countStaleRunning(tenantId: string, startedBefore: Date): Promise<number> {
    return this.prisma.job.count({
      where: {
        tenantId,
        status: JobStatus.RUNNING,
        startedAt: { lt: startedBefore },
      },
    })
  }

  async groupTypeCounts(tenantId: string): Promise<JobTypeCount[]> {
    const results = await this.prisma.job.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { _all: true },
    })

    return results.map(result => ({
      type: result.type,
      count: result._count._all,
    }))
  }

  async cancelJob(id: string, tenantId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.job.updateMany({
      where: {
        id,
        tenantId,
        status: { in: [JobStatus.PENDING, JobStatus.RETRYING] },
      },
      data: { status: JobStatus.CANCELLED },
    })
  }

  async cancelAllPendingJobs(tenantId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.job.updateMany({
      where: {
        tenantId,
        status: { in: [JobStatus.PENDING, JobStatus.RETRYING] },
      },
      data: { status: JobStatus.CANCELLED },
    })
  }

  async retryJob(id: string, tenantId: string, scheduledAt: Date): Promise<Prisma.BatchPayload> {
    return this.prisma.job.updateMany({
      where: {
        id,
        tenantId,
        status: { in: [JobStatus.FAILED, JobStatus.CANCELLED] },
      },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        error: null,
        result: Prisma.DbNull,
        startedAt: null,
        completedAt: null,
        scheduledAt,
      },
    })
  }
}
