import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
import { JobStatus } from '@/enums'
import api from '@/lib/api'
import { jobService } from '@/services/job.service'
import type { JobSearchParams } from '@/types'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('jobService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /jobs with params', async () => {
    const jobs = [{ id: 'job-1', status: JobStatus.FAILED }]
    mockGet.mockResolvedValue({ data: { data: jobs } })

    const params: JobSearchParams = { status: JobStatus.FAILED, page: 2, limit: 10 }
    const result = await jobService.getJobs(params)

    expect(mockGet).toHaveBeenCalledWith('/jobs', { params })
    expect(result.data).toEqual(jobs)
  })

  it('calls GET /jobs/stats', async () => {
    const stats = { total: 10, failed: 2 }
    mockGet.mockResolvedValue({ data: { data: stats } })

    const result = await jobService.getJobStats()

    expect(mockGet).toHaveBeenCalledWith('/jobs/stats')
    expect(result.data).toEqual(stats)
  })

  it('calls POST /jobs/:id/retry', async () => {
    const job = { id: 'job-1', status: JobStatus.PENDING }
    mockPost.mockResolvedValue({ data: { data: job } })

    const result = await jobService.retryJob('job-1')

    expect(mockPost).toHaveBeenCalledWith('/jobs/job-1/retry')
    expect(result.data).toEqual(job)
  })

  it('calls POST /jobs/:id/cancel', async () => {
    const response = { cancelled: true }
    mockPost.mockResolvedValue({ data: { data: response } })

    const result = await jobService.cancelJob('job-1')

    expect(mockPost).toHaveBeenCalledWith('/jobs/job-1/cancel')
    expect(result.data).toEqual(response)
  })
})
