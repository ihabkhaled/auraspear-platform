import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { detectionRuleService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  DetectionRuleSearchParams,
  ToggleDetectionRuleInput,
  SimulateDetectionRuleInput,
} from '@/types'

export function useDetectionRules(params?: DetectionRuleSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['detection-rules', tenantId, params],
    queryFn: () => detectionRuleService.listRules(params),
    placeholderData: keepPreviousData,
  })
}

export function useDetectionRuleStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['detection-rules', 'stats', tenantId],
    queryFn: () => detectionRuleService.getStats(),
  })
}

export function useCreateDetectionRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.DETECTION_RULES_CREATE)
      return detectionRuleService.createRule(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detection-rules', tenantId] })
    },
  })
}

export function useUpdateDetectionRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.DETECTION_RULES_UPDATE)
      return detectionRuleService.updateRule(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detection-rules', tenantId] })
    },
  })
}

export function useDeleteDetectionRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.DETECTION_RULES_DELETE)
      return detectionRuleService.deleteRule(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detection-rules', tenantId] })
    },
  })
}

export function useToggleDetectionRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, enabled }: ToggleDetectionRuleInput) => {
      requirePermission(permissions, Permission.DETECTION_RULES_TOGGLE)
      return detectionRuleService.toggleRule(id, enabled)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detection-rules', tenantId] })
    },
  })
}

export function useSimulateDetectionRule() {
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: ({ id, events }: SimulateDetectionRuleInput) => {
      requirePermission(permissions, Permission.DETECTION_RULES_UPDATE)
      return detectionRuleService.simulateRule(id, events)
    },
  })
}
