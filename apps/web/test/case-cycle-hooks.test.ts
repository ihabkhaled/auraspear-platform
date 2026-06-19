import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
// Mock the services module before importing hooks
vi.mock('@/services', () => ({
  caseCycleService: {
    getCycles: vi.fn(),
    getActiveCycle: vi.fn(),
    getCycle: vi.fn(),
    createCycle: vi.fn(),
    closeCycle: vi.fn(),
    updateCycle: vi.fn(),
    activateCycle: vi.fn(),
    deleteCycle: vi.fn(),
    getOrphanedStats: vi.fn(),
  },
}))
// Mock @tanstack/react-query to capture mutation/query configs
const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => {
  const keepPreviousData = Symbol('keepPreviousData')
  return {
    keepPreviousData,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
    useQuery: vi.fn((opts: Record<string, unknown>) => ({
      queryKey: opts['queryKey'],
      queryFn: opts['queryFn'],
      _opts: opts,
    })),
    useMutation: vi.fn((opts: Record<string, unknown>) => {
      // Return the mutation config so we can test mutationFn and onSuccess
      return {
        mutationFn: opts['mutationFn'],
        onSuccess: opts['onSuccess'],
        _opts: opts,
      }
    }),
  }
})
// Mock the stores module
vi.mock('@/stores', () => ({
  useTenantStore: vi.fn((selector: (s: { currentTenantId: string | null }) => unknown) =>
    selector({ currentTenantId: 'test-tenant-id' })
  ),
  useAuthStore: vi.fn((selector: (s: { permissions: string[] }) => unknown) =>
    selector({ permissions: ['cases.changeStatus'] })
  ),
}))
import { useUpdateCaseCycle, useActivateCaseCycle, useDeleteCaseCycle } from '@/hooks/useCaseCycles'
import { caseCycleService } from '@/services'

const mockUpdateCycle = caseCycleService.updateCycle as Mock
const mockActivateCycle = caseCycleService.activateCycle as Mock
const mockDeleteCycle = caseCycleService.deleteCycle as Mock

describe('useCaseCycles hooks', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── useUpdateCaseCycle ─────────────────────────────────────────

  describe('useUpdateCaseCycle', () => {
    it('should call caseCycleService.updateCycle via mutationFn', async () => {
      mockUpdateCycle.mockResolvedValue({ id: 'cycle-1', name: 'Updated' })

      const hook = useUpdateCaseCycle() as unknown as {
        mutationFn: (args: { id: string; data: { name: string } }) => Promise<unknown>
      }

      const args = { id: 'cycle-1', data: { name: 'Updated' } }
      await hook.mutationFn(args)

      expect(mockUpdateCycle).toHaveBeenCalledWith('cycle-1', { name: 'Updated' })
    })

    it('should invalidate caseCycles query key on success', async () => {
      const hook = useUpdateCaseCycle() as unknown as {
        onSuccess: () => void
      }

      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['caseCycles', 'test-tenant-id'],
      })
    })
  })

  // ─── useActivateCaseCycle ───────────────────────────────────────

  describe('useActivateCaseCycle', () => {
    it('should call caseCycleService.activateCycle via mutationFn', async () => {
      mockActivateCycle.mockResolvedValue({ id: 'cycle-2', status: 'active' })

      const hook = useActivateCaseCycle() as unknown as {
        mutationFn: (id: string) => Promise<unknown>
      }

      await hook.mutationFn('cycle-2')

      expect(mockActivateCycle).toHaveBeenCalledWith('cycle-2')
    })

    it('should invalidate caseCycles query key on success', async () => {
      const hook = useActivateCaseCycle() as unknown as {
        onSuccess: () => void
      }

      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['caseCycles', 'test-tenant-id'],
      })
    })
  })

  // ─── useDeleteCaseCycle ─────────────────────────────────────────

  describe('useDeleteCaseCycle', () => {
    it('should call caseCycleService.deleteCycle via mutationFn', async () => {
      mockDeleteCycle.mockResolvedValue({ deleted: true })

      const hook = useDeleteCaseCycle() as unknown as {
        mutationFn: (id: string) => Promise<unknown>
      }

      await hook.mutationFn('cycle-3')

      expect(mockDeleteCycle).toHaveBeenCalledWith('cycle-3')
    })

    it('should invalidate caseCycles query key on success', async () => {
      const hook = useDeleteCaseCycle() as unknown as {
        onSuccess: () => void
      }

      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['caseCycles', 'test-tenant-id'],
      })
    })
  })
})
