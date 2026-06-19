import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { knowledgeService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CreateRunbookInput, RunbookSearchParams, UpdateRunbookInput } from '@/types'

export function useRunbooks(params?: RunbookSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['runbooks', tenantId, params],
    queryFn: () => knowledgeService.getAll(params),
    placeholderData: keepPreviousData,
  })
}

export function useRunbook(id: string | null) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['runbooks', tenantId, id],
    queryFn: () => knowledgeService.getById(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useCreateRunbook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: CreateRunbookInput) => {
      requirePermission(permissions, Permission.RUNBOOKS_CREATE)
      return knowledgeService.create(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runbooks', tenantId] })
    },
  })
}

export function useUpdateRunbook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRunbookInput }) => {
      requirePermission(permissions, Permission.RUNBOOKS_UPDATE)
      return knowledgeService.update(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runbooks', tenantId] })
    },
  })
}

export function useDeleteRunbook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.RUNBOOKS_DELETE)
      return knowledgeService.delete(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runbooks', tenantId] })
    },
  })
}

export function useSearchRunbooks(query: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['runbooks', 'search', tenantId, query],
    queryFn: () => knowledgeService.search(query),
    enabled: query.length >= 2,
  })
}
