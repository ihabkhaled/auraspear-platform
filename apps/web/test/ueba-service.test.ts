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
import { uebaService } from '@/services/ueba.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('uebaService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getEntities ───────────────────────────────────────────────

  describe('getEntities', () => {
    it('should call GET /ueba/entities without params', async () => {
      const entities = [{ id: 'ent-1', name: 'admin-user', riskScore: 85 }]
      mockGet.mockResolvedValue({ data: { data: entities } })

      const result = await uebaService.getEntities()

      expect(mockGet).toHaveBeenCalledWith('/ueba/entities', { params: undefined })
      expect(result.data).toEqual(entities)
    })

    it('should call GET /ueba/entities with search params', async () => {
      const entities = [{ id: 'ent-2', name: 'service-account' }]
      mockGet.mockResolvedValue({ data: { data: entities } })

      const params = { search: 'service', entityType: 'user', page: 1, limit: 20 }
      const result = await uebaService.getEntities(params)

      expect(mockGet).toHaveBeenCalledWith('/ueba/entities', { params })
      expect(result.data).toEqual(entities)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(uebaService.getEntities()).rejects.toThrow('Network error')
    })
  })

  // ─── getEntityById ─────────────────────────────────────────────

  describe('getEntityById', () => {
    it('should call GET /ueba/entities/:id', async () => {
      const entity = { id: 'ent-1', name: 'admin-user', riskScore: 85 }
      mockGet.mockResolvedValue({ data: { data: entity } })

      const result = await uebaService.getEntityById('ent-1')

      expect(mockGet).toHaveBeenCalledWith('/ueba/entities/ent-1')
      expect(result.data).toEqual(entity)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(uebaService.getEntityById('ent-999')).rejects.toThrow('Not found')
    })
  })

  // ─── getAnomalies ──────────────────────────────────────────────

  describe('getAnomalies', () => {
    it('should call GET /ueba/anomalies without params', async () => {
      const anomalies = [{ id: 'anom-1', type: 'unusual_login', severity: 'high' }]
      mockGet.mockResolvedValue({ data: { data: anomalies } })

      const result = await uebaService.getAnomalies()

      expect(mockGet).toHaveBeenCalledWith('/ueba/anomalies', { params: undefined })
      expect(result.data).toEqual(anomalies)
    })

    it('should call GET /ueba/anomalies with search params', async () => {
      const anomalies = [{ id: 'anom-2', type: 'data_exfiltration' }]
      mockGet.mockResolvedValue({ data: { data: anomalies } })

      const params = { severity: 'critical', page: 1, limit: 10 }
      const result = await uebaService.getAnomalies(params)

      expect(mockGet).toHaveBeenCalledWith('/ueba/anomalies', { params })
      expect(result.data).toEqual(anomalies)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(uebaService.getAnomalies()).rejects.toThrow('Server error')
    })
  })

  // ─── getModels ─────────────────────────────────────────────────

  describe('getModels', () => {
    it('should call GET /ueba/models without params', async () => {
      const models = [{ id: 'model-1', name: 'Baseline v2', accuracy: 0.95 }]
      mockGet.mockResolvedValue({ data: { data: models } })

      const result = await uebaService.getModels()

      expect(mockGet).toHaveBeenCalledWith('/ueba/models', { params: undefined })
      expect(result.data).toEqual(models)
    })

    it('should call GET /ueba/models with search params', async () => {
      const models = [{ id: 'model-2', name: 'Anomaly Detector' }]
      mockGet.mockResolvedValue({ data: { data: models } })

      const params = { status: 'trained', page: 1, limit: 5 }
      const result = await uebaService.getModels(params)

      expect(mockGet).toHaveBeenCalledWith('/ueba/models', { params })
      expect(result.data).toEqual(models)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(uebaService.getModels()).rejects.toThrow('Network error')
    })
  })

  // ─── createEntity ──────────────────────────────────────────────

  describe('createEntity', () => {
    it('should call POST /ueba/entities with data', async () => {
      const entity = { id: 'ent-3', name: 'new-entity' }
      mockPost.mockResolvedValue({ data: { data: entity } })

      const input = { name: 'new-entity', entityType: 'host', department: 'IT' }
      const result = await uebaService.createEntity(input)

      expect(mockPost).toHaveBeenCalledWith('/ueba/entities', input)
      expect(result.data).toEqual(entity)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(uebaService.createEntity({ name: '' })).rejects.toThrow('Validation failed')
    })
  })

  // ─── updateEntity ──────────────────────────────────────────────

  describe('updateEntity', () => {
    it('should call PATCH /ueba/entities/:id with data', async () => {
      const entity = { id: 'ent-1', name: 'admin-user', riskScore: 40 }
      mockPatch.mockResolvedValue({ data: { data: entity } })

      const input = { riskScore: 40 }
      const result = await uebaService.updateEntity('ent-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/ueba/entities/ent-1', input)
      expect(result.data).toEqual(entity)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(uebaService.updateEntity('ent-1', { name: 'x' })).rejects.toThrow('Forbidden')
    })
  })

  // ─── deleteEntity ──────────────────────────────────────────────

  describe('deleteEntity', () => {
    it('should call DELETE /ueba/entities/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await uebaService.deleteEntity('ent-1')

      expect(mockDelete).toHaveBeenCalledWith('/ueba/entities/ent-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(uebaService.deleteEntity('ent-999')).rejects.toThrow('Not found')
    })
  })

  // ─── resolveAnomaly ────────────────────────────────────────────

  describe('resolveAnomaly', () => {
    it('should call PATCH /ueba/anomalies/:id/resolve', async () => {
      const anomaly = { id: 'anom-1', status: 'resolved' }
      mockPatch.mockResolvedValue({ data: { data: anomaly } })

      const result = await uebaService.resolveAnomaly('anom-1')

      expect(mockPatch).toHaveBeenCalledWith('/ueba/anomalies/anom-1/resolve')
      expect(result.data).toEqual(anomaly)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Already resolved'))

      await expect(uebaService.resolveAnomaly('anom-1')).rejects.toThrow('Already resolved')
    })
  })

  // ─── getStats ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /ueba/stats', async () => {
      const stats = { totalEntities: 250, totalAnomalies: 42, avgRiskScore: 35 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await uebaService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/ueba/stats')
      expect(result.data).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(uebaService.getStats()).rejects.toThrow('Server error')
    })
  })
})
