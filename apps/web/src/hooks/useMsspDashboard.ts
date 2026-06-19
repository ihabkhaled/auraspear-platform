import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services'
import { useTenantStore } from '@/stores'

export function useMsspPortfolio() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['mssp-portfolio', tenantId],
    queryFn: () => dashboardService.getMsspPortfolio(),
  })
}

export function useMsspComparison() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['mssp-comparison', tenantId],
    queryFn: () => dashboardService.getMsspComparison(),
  })
}
