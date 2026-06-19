'use client'

import { useEffect } from 'react'
import { useAuthStore, useTenantStore } from '@/stores'

export function useTenantSessionSync(): void {
  const currentTenantId = useTenantStore(s => s.currentTenantId)
  const setCurrentTenant = useTenantStore(s => s.setCurrentTenant)
  const authTenantId = useAuthStore(s => s.user?.tenantId ?? '')

  useEffect(() => {
    if (currentTenantId.length === 0 && authTenantId.length > 0) {
      setCurrentTenant(authTenantId)
    }
  }, [authTenantId, currentTenantId, setCurrentTenant])
}
