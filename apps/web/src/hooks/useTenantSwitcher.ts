'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { UserRole } from '@/enums'
import { useTenants } from '@/hooks'
import { refreshCurrentSessionPermissions } from '@/lib/auth-session'
import { useAuthStore, useTenantStore } from '@/stores'

export function useTenantSwitcher() {
  const t = useTranslations('layout')
  const queryClient = useQueryClient()
  const { currentTenantId, tenants, userTenants, setCurrentTenant, setTenants } = useTenantStore()
  const user = useAuthStore(s => s.user)

  const isGlobalAdmin = user?.role === UserRole.GLOBAL_ADMIN

  // GLOBAL_ADMIN: fetch all tenants from admin API
  const { data: tenantsData } = useTenants(undefined, isGlobalAdmin)

  useEffect(() => {
    if (tenantsData?.data && tenantsData.data.length > 0) {
      setTenants(tenantsData.data)
    }
  }, [tenantsData?.data, setTenants])

  function handleTenantChange(value: string) {
    const allowedList = isGlobalAdmin ? tenants : userTenants
    const isValid = allowedList.some(item => item.id === value)
    if (!isValid) return

    setCurrentTenant(value)
    void queryClient.invalidateQueries()

    void refreshCurrentSessionPermissions(queryClient)
  }

  return {
    t,
    currentTenantId,
    tenants,
    userTenants,
    isGlobalAdmin,
    handleTenantChange,
  }
}
