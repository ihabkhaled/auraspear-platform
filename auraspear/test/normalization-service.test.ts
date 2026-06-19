import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { normalizationService } from '@/services/normalization.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('normalizationService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Pipelines ──────────────────────────────────────────────────

  describe('listPipelines', () => {
    it('should call GET /normalization/pipelines without params', async () => {
      const pipelines = [{ id: 'pipe-1', name: 'Syslog Parser' }]
      mockGet.mockResolvedValue({ data: { data: pipelines } })

      const result = await normalizationService.listPipelines()

      expect(mockGet).toHaveBeenCalledWith('/normalization/pipelines', { params: undefined })
      expect(result).toEqual({ data: pipelines })
    })

    it('should call GET /normalization/pipelines with search params', async () => {
      const pipelines = [{ id: 'pipe-2', name: 'Windows Event Log' }]
      mockGet.mockResolvedValue({ data: { data: pipelines } })

      const params = { search: 'windows', page: 1 }
      const result = await normalizationService.listPipelines(params)

      expect(mockGet).toHaveBeenCalledWith('/normalization/pipelines', { params })
      expect(result).toEqual({ data: pipelines })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(normalizationService.listPipelines()).rejects.toThrow('Network error')
    })
  })

  describe('getPipelineById', () => {
    it('should call GET /normalization/pipelines/:id', async () => {
      const pipeline = { id: 'pipe-1', name: 'Syslog Parser' }
      mockGet.mockResolvedValue({ data: { data: pipeline } })

      const result = await normalizationService.getPipelineById('pipe-1')

      expect(mockGet).toHaveBeenCalledWith('/normalization/pipelines/pipe-1')
      expect(result).toEqual({ data: pipeline })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(normalizationService.getPipelineById('pipe-999')).rejects.toThrow('Not found')
    })
  })

  describe('createPipeline', () => {
    it('should call POST /normalization/pipelines', async () => {
      const pipeline = { id: 'pipe-3', name: 'New Pipeline' }
      mockPost.mockResolvedValue({ data: { data: pipeline } })

      const input = { name: 'New Pipeline', format: 'json' }
      const result = await normalizationService.createPipeline(input)

      expect(mockPost).toHaveBeenCalledWith('/normalization/pipelines', input)
      expect(result).toEqual({ data: pipeline })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(normalizationService.createPipeline({ name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updatePipeline', () => {
    it('should call PATCH /normalization/pipelines/:id', async () => {
      const pipeline = { id: 'pipe-1', name: 'Updated Pipeline' }
      mockPatch.mockResolvedValue({ data: { data: pipeline } })

      const input = { name: 'Updated Pipeline' }
      const result = await normalizationService.updatePipeline('pipe-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/normalization/pipelines/pipe-1', input)
      expect(result).toEqual({ data: pipeline })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(normalizationService.updatePipeline('pipe-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  describe('deletePipeline', () => {
    it('should call DELETE /normalization/pipelines/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await normalizationService.deletePipeline('pipe-1')

      expect(mockDelete).toHaveBeenCalledWith('/normalization/pipelines/pipe-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(normalizationService.deletePipeline('pipe-999')).rejects.toThrow('Not found')
    })
  })

  // ─── aiVerifyPipeline ──────────────────────────────────────────

  describe('aiVerifyPipeline', () => {
    it('should call POST /normalization/pipelines/:id/ai/verify with sample events and connector', async () => {
      const aiResult = { text: 'Pipeline looks correct', confidence: 0.92 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const sampleEvents = [{ source: 'syslog', message: 'test event' }]
      const result = await normalizationService.aiVerifyPipeline('pipe-1', sampleEvents, 'bedrock')

      expect(mockPost).toHaveBeenCalledWith('/normalization/pipelines/pipe-1/ai/verify', {
        sampleEvents,
        connector: 'bedrock',
      })
      expect(result).toEqual(aiResult)
    })

    it('should call without connector when not provided', async () => {
      const aiResult = { text: 'Verification result', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const sampleEvents = [{ source: 'windows', message: 'event log' }]
      const result = await normalizationService.aiVerifyPipeline('pipe-1', sampleEvents)

      expect(mockPost).toHaveBeenCalledWith('/normalization/pipelines/pipe-1/ai/verify', {
        sampleEvents,
        connector: undefined,
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI unavailable'))

      await expect(normalizationService.aiVerifyPipeline('pipe-1', [])).rejects.toThrow(
        'AI unavailable'
      )
    })
  })

  // ─── Stats ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /normalization/stats', async () => {
      const stats = { totalPipelines: 12, activePipelines: 10 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await normalizationService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/normalization/pipelines/stats')
      expect(result).toEqual({ data: stats })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(normalizationService.getStats()).rejects.toThrow('Server error')
    })
  })
})
