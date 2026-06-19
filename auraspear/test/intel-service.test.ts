import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))
import api from '@/lib/api'
import { intelService } from '@/services/intel.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('intelService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getStats ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /intel/stats and unwrap data', async () => {
      const stats = { totalIOCs: 150, totalFeeds: 5, recentCorrelations: 12 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await intelService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/intel/stats')
      expect(result).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(intelService.getStats()).rejects.toThrow('Network error')
    })
  })

  // ─── getMISPEvents ─────────────────────────────────────────────

  describe('getMISPEvents', () => {
    it('should call GET /intel/misp-events without params', async () => {
      const events = [{ id: 'ev-1', info: 'Phishing campaign' }]
      mockGet.mockResolvedValue({ data: { data: events } })

      const result = await intelService.getMISPEvents()

      expect(mockGet).toHaveBeenCalledWith('/intel/misp-events', { params: undefined })
      expect(result.data).toEqual(events)
    })

    it('should call GET /intel/misp-events with search params', async () => {
      const events = [{ id: 'ev-2', info: 'APT28 indicators' }]
      mockGet.mockResolvedValue({ data: { data: events } })

      const params = { search: 'APT28', page: 1, limit: 10 }
      const result = await intelService.getMISPEvents(params)

      expect(mockGet).toHaveBeenCalledWith('/intel/misp-events', { params })
      expect(result.data).toEqual(events)
    })
  })

  // ─── searchIOC ─────────────────────────────────────────────────

  describe('searchIOC', () => {
    it('should call GET /intel/ioc-search with required params', async () => {
      const iocs = [{ id: 'ioc-1', value: '1.2.3.4', type: 'ip' }]
      mockGet.mockResolvedValue({ data: { data: iocs } })

      const result = await intelService.searchIOC('1.2.3.4', 'ip')

      expect(mockGet).toHaveBeenCalledWith('/intel/ioc-search', {
        params: {
          value: '1.2.3.4',
          type: 'ip',
          source: undefined,
          page: 1,
          limit: 10,
          sortBy: undefined,
          sortOrder: undefined,
        },
      })
      expect(result.data).toEqual(iocs)
    })

    it('should pass all optional params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await intelService.searchIOC('evil.com', 'domain', 2, 25, 'createdAt', 'desc', 'misp')

      expect(mockGet).toHaveBeenCalledWith('/intel/ioc-search', {
        params: {
          value: 'evil.com',
          type: 'domain',
          source: 'misp',
          page: 2,
          limit: 25,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      })
    })
  })

  // ─── aiEnrichIoc ───────────────────────────────────────────────

  describe('aiEnrichIoc', () => {
    it('should call POST /intel/:id/ai/enrich with connector', async () => {
      const enrichment = { result: 'Enriched IOC data', confidence: 0.9 }
      mockPost.mockResolvedValue({ data: { data: enrichment } })

      const result = await intelService.aiEnrichIoc('ioc-1', 'bedrock')

      expect(mockPost).toHaveBeenCalledWith('/intel/ioc-1/ai/enrich', { connector: 'bedrock' })
      expect(result).toEqual(enrichment)
    })

    it('should call without connector when not provided', async () => {
      const enrichment = { result: 'Enriched', confidence: 0.8 }
      mockPost.mockResolvedValue({ data: { data: enrichment } })

      const result = await intelService.aiEnrichIoc('ioc-1')

      expect(mockPost).toHaveBeenCalledWith('/intel/ioc-1/ai/enrich', { connector: undefined })
      expect(result).toEqual(enrichment)
    })

    it('should reject when iocId is empty', async () => {
      await expect(intelService.aiEnrichIoc('')).rejects.toThrow('IOC ID is required')
    })
  })

  // ─── aiDraftAdvisory ──────────────────────────────────────────

  describe('aiDraftAdvisory', () => {
    it('should call POST /intel/ai/advisory with iocIds and connector', async () => {
      const advisory = { result: 'Advisory draft', confidence: 0.88 }
      mockPost.mockResolvedValue({ data: { data: advisory } })

      const result = await intelService.aiDraftAdvisory(['ioc-1', 'ioc-2'], 'openai')

      expect(mockPost).toHaveBeenCalledWith('/intel/ai/advisory', {
        iocIds: ['ioc-1', 'ioc-2'],
        connector: 'openai',
      })
      expect(result).toEqual(advisory)
    })

    it('should reject when iocIds is empty', async () => {
      await expect(intelService.aiDraftAdvisory([])).rejects.toThrow(
        'At least one IOC ID is required'
      )
    })
  })
})
