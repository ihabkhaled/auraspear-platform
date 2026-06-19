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
import { entityService } from '@/services/entity.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('entityService', () => {
  // ─── list ──────────────────────────────────────────────────────────

  describe('list', () => {
    it('should call GET /entities without params', async () => {
      const response = { data: { data: [], pagination: { total: 0 } } }
      mockGet.mockResolvedValue({ data: response })

      const result = await entityService.list()

      expect(mockGet).toHaveBeenCalledWith('/entities', { params: undefined })
      expect(result).toBeDefined()
    })

    it('should call GET /entities with search params', async () => {
      const entities = [{ id: 'e-1', type: 'ip', value: '192.168.1.1' }]
      mockGet.mockResolvedValue({ data: { data: entities, pagination: { total: 1 } } })

      const params = { search: '192.168', type: 'ip', page: 1, limit: 20 }
      const result = await entityService.list(params)

      expect(mockGet).toHaveBeenCalledWith('/entities', { params })
      expect(result.data).toEqual(entities)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(entityService.list()).rejects.toThrow('Network error')
    })
  })

  // ─── getById ───────────────────────────────────────────────────────

  describe('getById', () => {
    it('should call GET /entities/:id', async () => {
      const entity = { id: 'e-1', type: 'ip', value: '192.168.1.1' }
      mockGet.mockResolvedValue({ data: { data: entity } })

      const result = await entityService.getById('e-1')

      expect(mockGet).toHaveBeenCalledWith('/entities/e-1')
      expect(result.data).toEqual(entity)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(entityService.getById('nonexistent')).rejects.toThrow('Not found')
    })
  })

  // ─── getGraph ──────────────────────────────────────────────────────

  describe('getGraph', () => {
    it('should call GET /entities/:id/graph', async () => {
      const graph = {
        rootEntity: { id: 'e-1' },
        nodes: [{ id: 'e-1' }, { id: 'e-2' }],
        edges: [{ fromEntityId: 'e-1', toEntityId: 'e-2' }],
      }
      mockGet.mockResolvedValue({ data: { data: graph } })

      const result = await entityService.getGraph('e-1')

      expect(mockGet).toHaveBeenCalledWith('/entities/e-1/graph')
      expect(result.data).toEqual(graph)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(entityService.getGraph('e-1')).rejects.toThrow('Server error')
    })
  })

  // ─── getTopRisky ───────────────────────────────────────────────────

  describe('getTopRisky', () => {
    it('should call GET /entities/top-risky', async () => {
      const entities = [
        { id: 'e-1', riskScore: 95 },
        { id: 'e-2', riskScore: 88 },
      ]
      mockGet.mockResolvedValue({ data: { data: entities } })

      const result = await entityService.getTopRisky()

      expect(mockGet).toHaveBeenCalledWith('/entities/top-risky')
      expect(result.data).toEqual(entities)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(entityService.getTopRisky()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getRiskBreakdown ──────────────────────────────────────────────

  describe('getRiskBreakdown', () => {
    it('should call GET /entities/:id/risk-breakdown', async () => {
      const breakdown = { entityId: 'e-1', totalScore: 72, factors: [] }
      mockGet.mockResolvedValue({ data: { data: breakdown } })

      const result = await entityService.getRiskBreakdown('e-1')

      expect(mockGet).toHaveBeenCalledWith('/entities/e-1/risk-breakdown')
      expect(result.data).toEqual(breakdown)
    })
  })

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call POST /entities with data', async () => {
      const entity = { id: 'e-new', type: 'ip', value: '10.0.0.1' }
      mockPost.mockResolvedValue({ data: { data: entity } })

      const input = { type: 'ip', value: '10.0.0.1', displayName: 'Server-1' }
      const result = await entityService.create(input)

      expect(mockPost).toHaveBeenCalledWith('/entities', input)
      expect(result.data).toEqual(entity)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Duplicate'))

      await expect(entityService.create({ type: 'ip', value: '1.2.3.4' })).rejects.toThrow(
        'Duplicate'
      )
    })
  })

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call PATCH /entities/:id with data', async () => {
      const entity = { id: 'e-1', displayName: 'Updated Name' }
      mockPatch.mockResolvedValue({ data: { data: entity } })

      const input = { displayName: 'Updated Name' }
      const result = await entityService.update('e-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/entities/e-1', input)
      expect(result.data).toEqual(entity)
    })
  })

  // ─── aiExplainRisk ─────────────────────────────────────────────────

  describe('aiExplainRisk', () => {
    it('should call POST /entities/:id/ai/explain-risk', async () => {
      const aiResult = { result: 'Risk explanation...' }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await entityService.aiExplainRisk('e-1')

      expect(mockPost).toHaveBeenCalledWith('/entities/e-1/ai/explain-risk')
      expect(result).toEqual(aiResult)
    })
  })

  // ─── recalculateRisk ───────────────────────────────────────────────

  describe('recalculateRisk', () => {
    it('should call POST /entities/recalculate-risk', async () => {
      mockPost.mockResolvedValue({ data: { data: { updatedCount: 15 } } })

      const result = await entityService.recalculateRisk()

      expect(mockPost).toHaveBeenCalledWith('/entities/recalculate-risk')
      expect(result.data).toEqual({ updatedCount: 15 })
    })
  })
})
