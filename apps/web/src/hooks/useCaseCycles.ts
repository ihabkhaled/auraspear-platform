import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { caseCycleService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CaseCycleSearchParams, CreateCaseCycleInput, CloseCaseCycleInput } from '@/types'

export function useCaseCycles(params?: CaseCycleSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['caseCycles', tenantId, params],
    queryFn: () => caseCycleService.getCycles(params),
    placeholderData: keepPreviousData,
  })
}

export function useActiveCycle() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['caseCycles', tenantId, 'active'],
    queryFn: () => caseCycleService.getActiveCycle(),
  })
}

export function useCaseCycle(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['caseCycles', tenantId, id],
    queryFn: () => caseCycleService.getCycle(id),
    enabled: id.length > 0,
  })
}

export function useOrphanedCaseStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['caseCycles', tenantId, 'orphaned-stats'],
    queryFn: () => caseCycleService.getOrphanedStats(),
  })
}

export function useCreateCaseCycle() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: CreateCaseCycleInput) => {
      requirePermission(permissions, Permission.CASES_CHANGE_STATUS)
      return caseCycleService.createCycle(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseCycles', tenantId] })
    },
  })
}

export function useCloseCaseCycle() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseCaseCycleInput }) => {
      requirePermission(permissions, Permission.CASES_CHANGE_STATUS)
      return caseCycleService.closeCycle(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseCycles', tenantId] })
    },
  })
}

export function useUpdateCaseCycle() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCaseCycleInput> }) => {
      requirePermission(permissions, Permission.CASES_CHANGE_STATUS)
      return caseCycleService.updateCycle(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseCycles', tenantId] })
    },
  })
}

export function useActivateCaseCycle() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.CASES_CHANGE_STATUS)
      return caseCycleService.activateCycle(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseCycles', tenantId] })
    },
  })
}

export function useDeleteCaseCycle() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.CASES_CHANGE_STATUS)
      return caseCycleService.deleteCycle(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseCycles', tenantId] })
    },
  })
}
