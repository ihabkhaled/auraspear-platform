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
import { memoryService } from '@/services/memory.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('memoryService', () => {
  // ─── list ─────────────────────────────────────────────────────

  describe('list', () => {
    it('calls GET /user-memory with params', async () => {
      const payload = { data: [{ id: 'm1', content: 'test' }], total: 1 }
      mockGet.mockResolvedValueOnce({ data: payload })

      const params = { category: 'fact', search: 'test', limit: 10, offset: 0 }
      const result = await memoryService.list(params)

      expect(mockGet).toHaveBeenCalledWith('/user-memory', { params })
      expect(result).toEqual(payload)
    })

    it('calls GET /user-memory without params when none provided', async () => {
      const payload = { data: [], total: 0 }
      mockGet.mockResolvedValueOnce({ data: payload })

      const result = await memoryService.list()

      expect(mockGet).toHaveBeenCalledWith('/user-memory', { params: undefined })
      expect(result).toEqual(payload)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      await expect(memoryService.list()).rejects.toThrow('Network error')
    })
  })

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('calls POST /user-memory and extracts data', async () => {
      const input = { content: 'Remember this', category: 'fact' }
      const created = { id: 'm1', content: 'Remember this', category: 'fact' }
      mockPost.mockResolvedValueOnce({ data: { data: created } })

      const result = await memoryService.create(input)

      expect(mockPost).toHaveBeenCalledWith('/user-memory', input)
      expect(result).toEqual(created)
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Validation error'))

      await expect(memoryService.create({ content: '' })).rejects.toThrow('Validation error')
    })
  })

  // ─── update ───────────────────────────────────────────────────

  describe('update', () => {
    it('calls PATCH /user-memory/:id and extracts data', async () => {
      const id = 'mem-123'
      const data = { content: 'Updated content', category: 'preference' }
      const updated = { id, ...data }
      mockPatch.mockResolvedValueOnce({ data: { data: updated } })

      const result = await memoryService.update(id, data)

      expect(mockPatch).toHaveBeenCalledWith(`/user-memory/${id}`, data)
      expect(result).toEqual(updated)
    })

    it('propagates API errors', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Not found'))

      await expect(memoryService.update('bad-id', { content: 'x' })).rejects.toThrow('Not found')
    })
  })

  // ─── delete ───────────────────────────────────────────────────

  describe('delete', () => {
    it('calls DELETE /user-memory/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: { data: undefined } })

      await memoryService.delete('mem-456')

      expect(mockDelete).toHaveBeenCalledWith('/user-memory/mem-456')
    })

    it('propagates API errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(memoryService.delete('bad-id')).rejects.toThrow('Forbidden')
    })
  })

  // ─── deleteAll ────────────────────────────────────────────────

  describe('deleteAll', () => {
    it('calls DELETE /user-memory and extracts data', async () => {
      mockDelete.mockResolvedValueOnce({ data: { data: { deleted: 5 } } })

      const result = await memoryService.deleteAll()

      expect(mockDelete).toHaveBeenCalledWith('/user-memory')
      expect(result).toEqual({ deleted: 5 })
    })

    it('propagates API errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Server error'))

      await expect(memoryService.deleteAll()).rejects.toThrow('Server error')
    })
  })

  // ─── getStats ─────────────────────────────────────────────────

  describe('getStats', () => {
    it('calls GET /user-memory/governance/stats and extracts data', async () => {
      const stats = { totalMemories: 42, byCategory: { fact: 20, preference: 15, instruction: 7 } }
      mockGet.mockResolvedValueOnce({ data: { data: stats } })

      const result = await memoryService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/user-memory/governance/stats')
      expect(result).toEqual(stats)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(memoryService.getStats()).rejects.toThrow('Forbidden')
    })
  })

  // ─── listAll ──────────────────────────────────────────────────

  describe('listAll', () => {
    it('calls GET /user-memory/governance/all and returns normalized result', async () => {
      const memories = [{ id: 'm1', content: 'fact 1' }, { id: 'm2', content: 'fact 2' }]
      mockGet.mockResolvedValueOnce({ data: { data: memories, total: 2 } })

      const result = await memoryService.listAll({ limit: '10', offset: '0' })

      expect(mockGet).toHaveBeenCalledWith('/user-memory/governance/all', {
        params: { limit: '10', offset: '0' },
      })
      expect(result).toEqual({ data: memories, total: 2 })
    })

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null, total: 0 } })

      const result = await memoryService.listAll()

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('defaults total to 0 when missing', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [], total: undefined } })

      const result = await memoryService.listAll()

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(memoryService.listAll()).rejects.toThrow('Server error')
    })
  })

  // ─── exportMemories ───────────────────────────────────────────

  describe('exportMemories', () => {
    it('calls GET /user-memory/governance/export and returns array', async () => {
      const memories = [{ id: 'm1', content: 'exported' }]
      mockGet.mockResolvedValueOnce({ data: { data: memories } })

      const result = await memoryService.exportMemories()

      expect(mockGet).toHaveBeenCalledWith('/user-memory/governance/export', { params: {} })
      expect(result).toEqual(memories)
    })

    it('passes userId param when provided', async () => {
      const memories = [{ id: 'm1', content: 'user export' }]
      mockGet.mockResolvedValueOnce({ data: { data: memories } })

      const result = await memoryService.exportMemories('user-123')

      expect(mockGet).toHaveBeenCalledWith('/user-memory/governance/export', {
        params: { userId: 'user-123' },
      })
      expect(result).toEqual(memories)
    })

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null } })

      const result = await memoryService.exportMemories()

      expect(result).toEqual([])
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(memoryService.exportMemories()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getRetentionPolicy ───────────────────────────────────────

  describe('getRetentionPolicy', () => {
    it('calls GET /user-memory/governance/retention and extracts data', async () => {
      const policy = { retentionDays: 90, autoCleanup: true }
      mockGet.mockResolvedValueOnce({ data: { data: policy } })

      const result = await memoryService.getRetentionPolicy()

      expect(mockGet).toHaveBeenCalledWith('/user-memory/governance/retention')
      expect(result).toEqual(policy)
    })

    it('returns null when no policy exists', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null } })

      const result = await memoryService.getRetentionPolicy()

      expect(result).toBeNull()
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(memoryService.getRetentionPolicy()).rejects.toThrow('Server error')
    })
  })

  // ─── upsertRetentionPolicy ────────────────────────────────────

  describe('upsertRetentionPolicy', () => {
    it('calls PATCH /user-memory/governance/retention and extracts data', async () => {
      const input = { retentionDays: 60, autoCleanup: false }
      const saved = { id: 'rp1', ...input }
      mockPatch.mockResolvedValueOnce({ data: { data: saved } })

      const result = await memoryService.upsertRetentionPolicy(input)

      expect(mockPatch).toHaveBeenCalledWith('/user-memory/governance/retention', input)
      expect(result).toEqual(saved)
    })

    it('propagates API errors', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Validation error'))

      await expect(
        memoryService.upsertRetentionPolicy({ retentionDays: -1, autoCleanup: false })
      ).rejects.toThrow('Validation error')
    })
  })

  // ─── runCleanup ───────────────────────────────────────────────

  describe('runCleanup', () => {
    it('calls POST /user-memory/governance/cleanup and extracts data', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: { cleaned: 12 } } })

      const result = await memoryService.runCleanup()

      expect(mockPost).toHaveBeenCalledWith('/user-memory/governance/cleanup')
      expect(result).toEqual({ cleaned: 12 })
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(memoryService.runCleanup()).rejects.toThrow('Forbidden')
    })
  })

  // ─── adminDeleteUserMemories ──────────────────────────────────

  describe('adminDeleteUserMemories', () => {
    it('calls DELETE /user-memory/governance/user/:userId and extracts data', async () => {
      mockDelete.mockResolvedValueOnce({ data: { data: { deleted: 8 } } })

      const result = await memoryService.adminDeleteUserMemories('user-999')

      expect(mockDelete).toHaveBeenCalledWith('/user-memory/governance/user/user-999')
      expect(result).toEqual({ deleted: 8 })
    })

    it('propagates API errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Not found'))

      await expect(memoryService.adminDeleteUserMemories('bad-id')).rejects.toThrow('Not found')
    })
  })
})
