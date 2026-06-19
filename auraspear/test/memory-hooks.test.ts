import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

const mockInvalidateQueries = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

vi.mock('@/stores', () => ({
  useTenantStore: vi.fn((selector: Function) => selector({ currentTenantId: 'test-tenant' })),
  useAuthStore: vi.fn((selector: Function) =>
    selector({ permissions: ['ai.memory.view', 'ai.memory.edit'] })
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/components/common', () => ({
  Toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api-error', () => ({
  getErrorKey: () => 'someError',
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: (perms: string[], perm: string) => perms.includes(perm),
}))

vi.mock('@/services', () => ({
  memoryService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
  },
}))

vi.mock('react', () => ({
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  useCallback: vi.fn((fn: Function) => fn),
}))

import { memoryService } from '@/services'
import { Toast } from '@/components/common'
import { useMemorySettings } from '@/hooks/useMemorySettings'

afterEach(() => {
  vi.clearAllMocks()
})

describe('useMemorySettings', () => {
  function setupMocks() {
    let capturedQueryOpts: Record<string, unknown> = {}
    const capturedMutationOpts: Record<string, unknown>[] = []

    mockUseQuery.mockImplementation((opts: Record<string, unknown>) => {
      capturedQueryOpts = opts
      return {
        data: { data: [{ id: '1', content: 'test' }], total: 1 },
        isLoading: false,
        isFetching: false,
      }
    })

    mockUseMutation.mockImplementation((opts: Record<string, unknown>) => {
      capturedMutationOpts.push(opts)
      return {
        mutate: vi.fn(),
        isPending: false,
      }
    })

    return { getCapturedQueryOpts: () => capturedQueryOpts, capturedMutationOpts }
  }

  it('returns all expected properties', () => {
    setupMocks()
    const result = useMemorySettings()

    expect(result).toHaveProperty('t')
    expect(result).toHaveProperty('canView')
    expect(result).toHaveProperty('canEdit')
    expect(result).toHaveProperty('memories')
    expect(result).toHaveProperty('totalMemories')
    expect(result).toHaveProperty('isLoading')
    expect(result).toHaveProperty('isFetching')
    expect(result).toHaveProperty('searchQuery')
    expect(result).toHaveProperty('handleSearchChange')
    expect(result).toHaveProperty('categoryFilter')
    expect(result).toHaveProperty('handleCategoryChange')
    expect(result).toHaveProperty('editingMemory')
    expect(result).toHaveProperty('setEditingMemory')
    expect(result).toHaveProperty('createDialogOpen')
    expect(result).toHaveProperty('setCreateDialogOpen')
    expect(result).toHaveProperty('createMemory')
    expect(result).toHaveProperty('isCreating')
    expect(result).toHaveProperty('updateMemory')
    expect(result).toHaveProperty('isUpdating')
    expect(result).toHaveProperty('deleteMemory')
    expect(result).toHaveProperty('isDeleting')
    expect(result).toHaveProperty('deleteAllMemories')
    expect(result).toHaveProperty('isDeletingAll')
  })

  it('memoriesQuery uses correct queryKey with tenantId', () => {
    const { getCapturedQueryOpts } = setupMocks()
    useMemorySettings()

    const queryOpts = getCapturedQueryOpts()
    expect(queryOpts['queryKey']).toEqual(['user-memories', 'test-tenant', '', ''])
  })

  it('memoriesQuery is enabled when user has AI_MEMORY_VIEW permission', () => {
    const { getCapturedQueryOpts } = setupMocks()
    useMemorySettings()

    const queryOpts = getCapturedQueryOpts()
    expect(queryOpts['enabled']).toBe(true)
  })

  it('createMutation calls memoryService.create', async () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const createOpts = capturedMutationOpts.at(0)
    const input = { content: 'new memory', category: 'fact' }
    ;(memoryService.create as Mock).mockResolvedValueOnce({ data: { id: '2', ...input } })

    await (createOpts!['mutationFn'] as Function)(input)

    expect(memoryService.create).toHaveBeenCalledWith(input)
  })

  it('createMutation invalidates queries on success', () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const createOpts = capturedMutationOpts.at(0)
    ;(createOpts!['onSuccess'] as Function)()

    expect(Toast.success).toHaveBeenCalledWith('created')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-memories', 'test-tenant'],
    })
  })

  it('createMutation shows error toast on failure', () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const createOpts = capturedMutationOpts.at(0)
    ;(createOpts!['onError'] as Function)(new Error('fail'))

    expect(Toast.error).toHaveBeenCalledWith('someError')
  })

  it('updateMutation calls memoryService.update', async () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const updateOpts = capturedMutationOpts.at(1)
    const payload = { id: 'mem-1', data: { content: 'updated', category: 'preference' } }
    ;(memoryService.update as Mock).mockResolvedValueOnce({ data: { id: 'mem-1' } })

    await (updateOpts!['mutationFn'] as Function)(payload)

    expect(memoryService.update).toHaveBeenCalledWith('mem-1', payload.data)
  })

  it('updateMutation invalidates queries on success', () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const updateOpts = capturedMutationOpts.at(1)
    ;(updateOpts!['onSuccess'] as Function)()

    expect(Toast.success).toHaveBeenCalledWith('updated')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-memories', 'test-tenant'],
    })
  })

  it('deleteMutation calls memoryService.delete', async () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const deleteOpts = capturedMutationOpts.at(2)
    ;(memoryService.delete as Mock).mockResolvedValueOnce({ data: undefined })

    await (deleteOpts!['mutationFn'] as Function)('mem-99')

    expect(memoryService.delete).toHaveBeenCalledWith('mem-99')
  })

  it('deleteMutation invalidates queries on success', () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const deleteOpts = capturedMutationOpts.at(2)
    ;(deleteOpts!['onSuccess'] as Function)()

    expect(Toast.success).toHaveBeenCalledWith('deleted')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-memories', 'test-tenant'],
    })
  })

  it('deleteAllMutation calls memoryService.deleteAll', async () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const deleteAllOpts = capturedMutationOpts.at(3)
    ;(memoryService.deleteAll as Mock).mockResolvedValueOnce({ data: { deleted: 3 } })

    await (deleteAllOpts!['mutationFn'] as Function)()

    expect(memoryService.deleteAll).toHaveBeenCalled()
  })

  it('deleteAllMutation invalidates queries on success', () => {
    const { capturedMutationOpts } = setupMocks()
    useMemorySettings()

    const deleteAllOpts = capturedMutationOpts.at(3)
    ;(deleteAllOpts!['onSuccess'] as Function)()

    expect(Toast.success).toHaveBeenCalledWith('allDeleted')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-memories', 'test-tenant'],
    })
  })

  it('canView is true when user has AI_MEMORY_VIEW permission', () => {
    setupMocks()
    const result = useMemorySettings()
    expect(result.canView).toBe(true)
  })

  it('canEdit is true when user has AI_MEMORY_EDIT permission', () => {
    setupMocks()
    const result = useMemorySettings()
    expect(result.canEdit).toBe(true)
  })

  it('canView is false when user lacks AI_MEMORY_VIEW permission', async () => {
    setupMocks()

    const stores = await import('@/stores')
    const mockAuth = stores.useAuthStore as unknown as Mock
    mockAuth.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ permissions: [] })
    )

    const result = useMemorySettings()
    expect(result.canView).toBe(false)
  })

  it('canEdit is false when user lacks AI_MEMORY_EDIT permission', async () => {
    setupMocks()

    const stores = await import('@/stores')
    const mockAuth = stores.useAuthStore as unknown as Mock
    mockAuth.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ permissions: ['ai.memory.view'] })
    )

    const result = useMemorySettings()
    expect(result.canEdit).toBe(false)
  })

  it('extracts memories from query data with fallback to empty array', () => {
    mockUseQuery.mockImplementation(() => ({
      data: undefined,
      isLoading: true,
      isFetching: true,
    }))
    mockUseMutation.mockImplementation(() => ({
      mutate: vi.fn(),
      isPending: false,
    }))

    const result = useMemorySettings()
    expect(result.memories).toEqual([])
    expect(result.totalMemories).toBe(0)
  })
})
