import { BusinessException } from '../../src/common/exceptions/business.exception'
import { JobStatus, JobType } from '../../src/modules/jobs/enums/job.enums'
import { JobService } from '../../src/modules/jobs/jobs.service'

function createMockRepository() {
  return {
    findByIdempotencyKey: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    listByTenant: jest.fn(),
    updateStatus: jest.fn(),
    cancelJob: jest.fn(),
    retryJob: jest.fn(),
    countByTenantAndStatus: jest.fn(),
    countScheduled: jest.fn(),
    countStaleRunning: jest.fn(),
    groupTypeCounts: jest.fn(),
  }
}

function createMockAppLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

describe('JobService', () => {
  const TENANT_ID = 'tenant-001'
  const JOB_ID = 'job-001'

  let repository: ReturnType<typeof createMockRepository>
  let appLogger: ReturnType<typeof createMockAppLogger>
  let service: JobService

  beforeEach(() => {
    repository = createMockRepository()
    appLogger = createMockAppLogger()
    service = new JobService(repository as never, appLogger as never)
    jest.clearAllMocks()
  })

  it('schedules a retry with backoff when the next attempt is still allowed', async () => {
    repository.updateStatus.mockResolvedValue({ id: JOB_ID })

    await service.markFailed(JOB_ID, TENANT_ID, 'boom', 0, 3)

    expect(repository.updateStatus).toHaveBeenCalledWith(
      JOB_ID,
      TENANT_ID,
      expect.objectContaining({
        status: JobStatus.RETRYING,
        attempts: 1,
        error: 'boom',
        scheduledAt: expect.any(Date),
      })
    )
  })

  it('marks the job failed permanently on the final attempt', async () => {
    repository.updateStatus.mockResolvedValue({ id: JOB_ID })

    await service.markFailed(JOB_ID, TENANT_ID, 'boom', 2, 3)

    expect(repository.updateStatus).toHaveBeenCalledWith(
      JOB_ID,
      TENANT_ID,
      expect.objectContaining({
        status: JobStatus.FAILED,
        attempts: 3,
        completedAt: expect.any(Date),
        scheduledAt: null,
      })
    )
  })

  it('returns aggregated runtime stats', async () => {
    repository.countByTenantAndStatus
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(1)
    repository.countScheduled.mockResolvedValue(2)
    repository.countStaleRunning.mockResolvedValue(1)
    repository.groupTypeCounts.mockResolvedValue([{ type: JobType.AI_AGENT_TASK, count: 3 }])

    const stats = await service.getStats(TENANT_ID)

    expect(stats).toEqual({
      total: 19,
      pending: 4,
      running: 2,
      retrying: 1,
      failed: 3,
      completed: 8,
      cancelled: 1,
      delayed: 2,
      staleRunning: 1,
      typeBreakdown: [{ type: JobType.AI_AGENT_TASK, count: 3 }],
    })
  })

  it('retries failed jobs by resetting them to pending', async () => {
    repository.findById
      .mockResolvedValueOnce({ id: JOB_ID, tenantId: TENANT_ID, status: JobStatus.FAILED })
      .mockResolvedValueOnce({ id: JOB_ID, tenantId: TENANT_ID, status: JobStatus.PENDING })
    repository.retryJob.mockResolvedValue({ count: 1 })

    const result = await service.retryJob(JOB_ID, TENANT_ID)

    expect(repository.retryJob).toHaveBeenCalledWith(JOB_ID, TENANT_ID, expect.any(Date))
    expect(result.status).toBe(JobStatus.PENDING)
  })

  it('blocks retries for non-terminal jobs', async () => {
    repository.findById.mockResolvedValue({
      id: JOB_ID,
      tenantId: TENANT_ID,
      status: JobStatus.RUNNING,
    })

    await expect(service.retryJob(JOB_ID, TENANT_ID)).rejects.toBeInstanceOf(BusinessException)
  })
})
