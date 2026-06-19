import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { caseService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useCreateCaseArtifact(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (data: { type: string; value: string; source?: string }) => {
      requirePermission(permissions, Permission.CASES_ADD_ARTIFACT)
      return caseService.createArtifact(caseId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}

export function useDeleteCaseArtifact(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (artifactId: string) => {
      requirePermission(permissions, Permission.CASES_DELETE_ARTIFACT)
      return caseService.deleteArtifact(caseId, artifactId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}
