import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { caseService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useCreateCaseTask(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (data: { title: string; assignee?: string }) => {
      requirePermission(permissions, Permission.CASES_ADD_TASK)
      return caseService.createTask(caseId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}

export function useUpdateCaseTask(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      data: { title?: string; status?: string; assignee?: string | null }
    }) => {
      requirePermission(permissions, Permission.CASES_UPDATE_TASK)
      return caseService.updateTask(caseId, taskId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}

export function useDeleteCaseTask(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (taskId: string) => {
      requirePermission(permissions, Permission.CASES_DELETE_TASK)
      return caseService.deleteTask(caseId, taskId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}
