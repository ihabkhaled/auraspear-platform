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
import { complianceService } from '@/services/compliance.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('complianceService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Frameworks ─────────────────────────────────────────────────

  describe('getFrameworks', () => {
    it('should call GET /compliance/frameworks without params', async () => {
      const frameworks = [{ id: 'fw-1', name: 'NIST CSF' }]
      mockGet.mockResolvedValue({ data: { data: frameworks } })

      const result = await complianceService.getFrameworks()

      expect(mockGet).toHaveBeenCalledWith('/compliance/frameworks', { params: undefined })
      expect(result).toEqual({ data: frameworks })
    })

    it('should call GET /compliance/frameworks with search params', async () => {
      const frameworks = [{ id: 'fw-2', name: 'ISO 27001' }]
      mockGet.mockResolvedValue({ data: { data: frameworks } })

      const params = { search: 'ISO', page: 1 }
      const result = await complianceService.getFrameworks(params)

      expect(mockGet).toHaveBeenCalledWith('/compliance/frameworks', { params })
      expect(result).toEqual({ data: frameworks })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(complianceService.getFrameworks()).rejects.toThrow('Network error')
    })
  })

  describe('getFrameworkById', () => {
    it('should call GET /compliance/frameworks/:id', async () => {
      const framework = { id: 'fw-1', name: 'NIST CSF' }
      mockGet.mockResolvedValue({ data: { data: framework } })

      const result = await complianceService.getFrameworkById('fw-1')

      expect(mockGet).toHaveBeenCalledWith('/compliance/frameworks/fw-1')
      expect(result).toEqual({ data: framework })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(complianceService.getFrameworkById('fw-999')).rejects.toThrow('Not found')
    })
  })

  describe('createFramework', () => {
    it('should call POST /compliance/frameworks', async () => {
      const framework = { id: 'fw-3', name: 'PCI DSS' }
      mockPost.mockResolvedValue({ data: { data: framework } })

      const input = { name: 'PCI DSS', version: '4.0' }
      const result = await complianceService.createFramework(input)

      expect(mockPost).toHaveBeenCalledWith('/compliance/frameworks', input)
      expect(result).toEqual({ data: framework })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(complianceService.createFramework({ name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updateFramework', () => {
    it('should call PATCH /compliance/frameworks/:id', async () => {
      const framework = { id: 'fw-1', name: 'NIST CSF v2' }
      mockPatch.mockResolvedValue({ data: { data: framework } })

      const input = { name: 'NIST CSF v2' }
      const result = await complianceService.updateFramework('fw-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/compliance/frameworks/fw-1', input)
      expect(result).toEqual({ data: framework })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(complianceService.updateFramework('fw-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  describe('deleteFramework', () => {
    it('should call DELETE /compliance/frameworks/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await complianceService.deleteFramework('fw-1')

      expect(mockDelete).toHaveBeenCalledWith('/compliance/frameworks/fw-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(complianceService.deleteFramework('fw-999')).rejects.toThrow('Not found')
    })
  })

  // ─── Controls ───────────────────────────────────────────────────

  describe('getControls', () => {
    it('should call GET /compliance/frameworks/:frameworkId/controls', async () => {
      const controls = [{ id: 'ctrl-1', name: 'Access Control' }]
      mockGet.mockResolvedValue({ data: { data: controls } })

      const result = await complianceService.getControls('fw-1')

      expect(mockGet).toHaveBeenCalledWith('/compliance/frameworks/fw-1/controls')
      expect(result).toEqual({ data: controls })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(complianceService.getControls('fw-999')).rejects.toThrow('Server error')
    })
  })

  describe('createControl', () => {
    it('should call POST /compliance/frameworks/:frameworkId/controls', async () => {
      const control = { id: 'ctrl-2', name: 'Encryption' }
      mockPost.mockResolvedValue({ data: { data: control } })

      const input = { name: 'Encryption', description: 'Data encryption at rest' }
      const result = await complianceService.createControl('fw-1', input)

      expect(mockPost).toHaveBeenCalledWith('/compliance/frameworks/fw-1/controls', input)
      expect(result).toEqual({ data: control })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(complianceService.createControl('fw-1', { name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updateControl', () => {
    it('should call PATCH /compliance/frameworks/:frameworkId/controls/:controlId', async () => {
      const control = { id: 'ctrl-1', name: 'Updated Control' }
      mockPatch.mockResolvedValue({ data: { data: control } })

      const input = { name: 'Updated Control' }
      const result = await complianceService.updateControl('fw-1', 'ctrl-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/compliance/frameworks/fw-1/controls/ctrl-1', input)
      expect(result).toEqual({ data: control })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(
        complianceService.updateControl('fw-1', 'ctrl-1', { name: 'x' })
      ).rejects.toThrow('Forbidden')
    })
  })

  describe('deleteControl', () => {
    it('should call DELETE /compliance/frameworks/:frameworkId/controls/:controlId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await complianceService.deleteControl('fw-1', 'ctrl-1')

      expect(mockDelete).toHaveBeenCalledWith('/compliance/frameworks/fw-1/controls/ctrl-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(complianceService.deleteControl('fw-1', 'ctrl-999')).rejects.toThrow('Not found')
    })
  })

  // ─── Stats ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /compliance/stats', async () => {
      const stats = { totalFrameworks: 5, overallScore: 85 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await complianceService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/compliance/stats')
      expect(result).toEqual({ data: stats })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(complianceService.getStats()).rejects.toThrow('Server error')
    })
  })
})
