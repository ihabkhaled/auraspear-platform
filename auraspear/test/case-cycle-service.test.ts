import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
// Mock the api module before importing the service
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))
import api from '@/lib/api'
import { caseCycleService } from '@/services/case-cycle.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock

describe('caseCycleService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getCycles', () => {
    it('should call GET /case-cycles with params', async () => {
      const mockResponse = {
        data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      }
      mockGet.mockResolvedValue(mockResponse)

      const params = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
      await caseCycleService.getCycles(params)

      expect(mockGet).toHaveBeenCalledWith('/case-cycles', { params })
    })
  })

  describe('getActiveCycle', () => {
    it('should call GET /case-cycles/active', async () => {
      const mockResponse = { data: { data: null } }
      mockGet.mockResolvedValue(mockResponse)

      await caseCycleService.getActiveCycle()

      expect(mockGet).toHaveBeenCalledWith('/case-cycles/active')
    })
  })

  describe('getCycle', () => {
    it('should call GET /case-cycles/:id', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', name: 'Test' } } }
      mockGet.mockResolvedValue(mockResponse)

      await caseCycleService.getCycle('cycle-1')

      expect(mockGet).toHaveBeenCalledWith('/case-cycles/cycle-1')
    })
  })

  describe('createCycle', () => {
    it('should call POST /case-cycles', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', name: 'New Cycle' } } }
      mockPost.mockResolvedValue(mockResponse)

      const input = { name: 'New Cycle', startDate: '2026-01-01' }
      await caseCycleService.createCycle(input)

      expect(mockPost).toHaveBeenCalledWith('/case-cycles', input)
    })
  })

  describe('closeCycle', () => {
    it('should call PATCH /case-cycles/:id/close', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', status: 'closed' } } }
      mockPatch.mockResolvedValue(mockResponse)

      await caseCycleService.closeCycle('cycle-1', {})

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/close', {})
    })

    it('should pass endDate if provided', async () => {
      const mockResponse = { data: { data: { id: 'cycle-1', status: 'closed' } } }
      mockPatch.mockResolvedValue(mockResponse)

      const data = { endDate: '2026-03-15' }
      await caseCycleService.closeCycle('cycle-1', data)

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/close', data)
    })
  })
})
