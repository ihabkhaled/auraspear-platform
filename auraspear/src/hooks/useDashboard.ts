import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVAL } from '@/lib/constants'
import { dashboardService } from '@/services'
import { useTenantStore } from '@/stores'

export function useKPIs() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'kpis'],
    queryFn: () => dashboardService.getKPIs(),
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useAlertTrends(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'alert-trends'],
    queryFn: () => dashboardService.getAlertTrends(),
    enabled,
  })
}

export function useSeverityDistribution(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'severity-distribution'],
    queryFn: () => dashboardService.getSeverityDistribution(),
    enabled,
  })
}

export function useMITREStats(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'mitre-stats'],
    queryFn: () => dashboardService.getMITREStats(),
    enabled,
  })
}

export function useAssetRisks(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'asset-risks'],
    queryFn: () => dashboardService.getAssetRisks(),
    enabled,
  })
}

export function usePipelineHealth() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'pipeline-health'],
    queryFn: () => dashboardService.getPipelineHealth(),
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useExtendedKPIs() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'extended-kpis'],
    queryFn: () => dashboardService.getExtendedKPIs(),
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useDashboardAnalyticsOverview(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'analytics-overview'],
    queryFn: () => dashboardService.getAnalyticsOverview(),
    enabled,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useDashboardOperationsOverview(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'operations-overview'],
    queryFn: () => dashboardService.getOperationsOverview(),
    enabled,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useRecentActivity() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['dashboard', tenantId, 'recent-activity'],
    queryFn: () => dashboardService.getRecentActivity(),
    refetchInterval: POLLING_INTERVAL,
  })
}
