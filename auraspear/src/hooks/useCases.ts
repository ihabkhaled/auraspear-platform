import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { adminService, caseService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CaseSearchParams, CreateCaseInput, UpdateCaseInput } from '@/types'

export function useTenantMembers() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['tenantMembers', tenantId],
    queryFn: () => adminService.getMembers(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCases(params?: CaseSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['cases', tenantId, params],
    queryFn: () => caseService.getCases(params),
  })
}

export function useCase(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['cases', tenantId, id],
    queryFn: () => caseService.getCase(id),
    enabled: id.length > 0,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: CreateCaseInput) => {
      requirePermission(permissions, Permission.CASES_CREATE)
      return caseService.createCase(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId] })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCaseInput }) => {
      requirePermission(permissions, Permission.CASES_UPDATE)
      return caseService.updateCase(id, data)
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, id] })
    },
  })
}
