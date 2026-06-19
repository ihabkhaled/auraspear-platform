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
import { attackPathService } from '@/services/attack-path.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('attackPathService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAttackPaths ────────────────────────────────────────────

  describe('getAttackPaths', () => {
    it('should call GET /attack-paths without params', async () => {
      const paths = [{ id: 'path-1', name: 'Lateral Movement Chain' }]
      mockGet.mockResolvedValue({ data: { data: paths } })

      const result = await attackPathService.getAttackPaths()

      expect(mockGet).toHaveBeenCalledWith('/attack-paths', { params: undefined })
      expect(result.data).toEqual(paths)
    })

    it('should call GET /attack-paths with search params', async () => {
      const paths = [{ id: 'path-2', name: 'Privilege Escalation' }]
      mockGet.mockResolvedValue({ data: { data: paths } })

      const params = { search: 'privilege', severity: 'critical', page: 1, limit: 10 }
      const result = await attackPathService.getAttackPaths(params)

      expect(mockGet).toHaveBeenCalledWith('/attack-paths', { params })
      expect(result.data).toEqual(paths)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(attackPathService.getAttackPaths()).rejects.toThrow('Network error')
    })
  })

  // ─── getAttackPathById ─────────────────────────────────────────

  describe('getAttackPathById', () => {
    it('should call GET /attack-paths/:id', async () => {
      const path = { id: 'path-1', name: 'Lateral Movement Chain', nodes: [], edges: [] }
      mockGet.mockResolvedValue({ data: { data: path } })

      const result = await attackPathService.getAttackPathById('path-1')

      expect(mockGet).toHaveBeenCalledWith('/attack-paths/path-1')
      expect(result.data).toEqual(path)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(attackPathService.getAttackPathById('path-999')).rejects.toThrow('Not found')
    })
  })

  // ─── getAttackPathStats ────────────────────────────────────────

  describe('getAttackPathStats', () => {
    it('should call GET /attack-paths/stats', async () => {
      const stats = { totalPaths: 18, criticalPaths: 3, avgLength: 4.2 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await attackPathService.getAttackPathStats()

      expect(mockGet).toHaveBeenCalledWith('/attack-paths/stats')
      expect(result.data).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(attackPathService.getAttackPathStats()).rejects.toThrow('Server error')
    })
  })

  // ─── createAttackPath ──────────────────────────────────────────

  describe('createAttackPath', () => {
    it('should call POST /attack-paths with data', async () => {
      const path = { id: 'path-3', name: 'New Attack Path' }
      mockPost.mockResolvedValue({ data: { data: path } })

      const input = { name: 'New Attack Path', nodes: [], edges: [] }
      const result = await attackPathService.createAttackPath(input)

      expect(mockPost).toHaveBeenCalledWith('/attack-paths', input)
      expect(result.data).toEqual(path)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(attackPathService.createAttackPath({ name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── updateAttackPath ──────────────────────────────────────────

  describe('updateAttackPath', () => {
    it('should call PATCH /attack-paths/:id with data', async () => {
      const path = { id: 'path-1', name: 'Updated Path', severity: 'high' }
      mockPatch.mockResolvedValue({ data: { data: path } })

      const input = { severity: 'high' }
      const result = await attackPathService.updateAttackPath('path-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/attack-paths/path-1', input)
      expect(result.data).toEqual(path)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(attackPathService.updateAttackPath('path-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  // ─── deleteAttackPath ──────────────────────────────────────────

  describe('deleteAttackPath', () => {
    it('should call DELETE /attack-paths/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await attackPathService.deleteAttackPath('path-1')

      expect(mockDelete).toHaveBeenCalledWith('/attack-paths/path-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(attackPathService.deleteAttackPath('path-999')).rejects.toThrow('Not found')
    })
  })
})
