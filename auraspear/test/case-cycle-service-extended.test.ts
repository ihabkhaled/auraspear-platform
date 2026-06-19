import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
// Mock the api module before importing the service
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { caseCycleService } from '@/services/case-cycle.service'

const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('caseCycleService (extended)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── updateCycle ────────────────────────────────────────────────

  describe('updateCycle', () => {
    it('should call PATCH /case-cycles/:id with data', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', name: 'Updated' } } }
      mockPatch.mockResolvedValue(mockResponse)

      const data = { name: 'Updated' }
      const result = await caseCycleService.updateCycle('cycle-1', data)

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1', data)
      expect(result).toEqual({ id: 'cycle-1', name: 'Updated' })
    })

    it('should call PATCH /case-cycles/:id with partial data', async () => {
      const mockResponse = { data: { data: { id: 'cycle-2', startDate: '2026-06-01' } } }
      mockPatch.mockResolvedValue(mockResponse)

      const data = { startDate: '2026-06-01' }
      await caseCycleService.updateCycle('cycle-2', data)

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-2', data)
    })
  })

  // ─── activateCycle ──────────────────────────────────────────────

  describe('activateCycle', () => {
    it('should call PATCH /case-cycles/:id/activate', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', status: 'active' } } }
      mockPatch.mockResolvedValue(mockResponse)

      const result = await caseCycleService.activateCycle('cycle-1')

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/activate')
      expect(result).toEqual({ id: 'cycle-1', status: 'active' })
    })

    it('should resolve with cycle data on success', async () => {
      const cycleData = { id: 'cycle-3', name: 'Q2 Cycle', status: 'active' }
      mockPatch.mockResolvedValue({ data: { data: cycleData } })

      const result = await caseCycleService.activateCycle('cycle-3')

      expect(result).toEqual(cycleData)
    })
  })

  // ─── deleteCycle ────────────────────────────────────────────────

  describe('deleteCycle', () => {
    it('should call DELETE /case-cycles/:id', async () => {
      const mockResponse = { data: { deleted: true } }
      mockDelete.mockResolvedValue(mockResponse)

      const result = await caseCycleService.deleteCycle('cycle-1')

      expect(mockDelete).toHaveBeenCalledWith('/case-cycles/cycle-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      const error = new Error('Not found')
      mockDelete.mockRejectedValue(error)

      await expect(caseCycleService.deleteCycle('nonexistent')).rejects.toThrow('Not found')
    })
  })
})
