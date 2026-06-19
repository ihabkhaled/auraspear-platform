'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useTenantSwitcher } from '@/hooks'

export function TenantSwitcher() {
  const { t, currentTenantId, tenants, userTenants, isGlobalAdmin, handleTenantChange } =
    useTenantSwitcher()

  // GLOBAL_ADMIN uses the full tenants list, others use their own memberships
  if (isGlobalAdmin) {
    if (tenants.length <= 1) {
      return null
    }

    return (
      <Select value={currentTenantId} onValueChange={handleTenantChange}>
        <SelectTrigger size="sm" className="w-24 sm:w-[160px]">
          <SelectValue placeholder={t('selectTenant')} />
        </SelectTrigger>
        <SelectContent>
          {tenants.map(tenant => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Non-admin: show switcher only if user has multiple tenant memberships
  if (userTenants.length <= 1) {
    return null
  }

  return (
    <Select value={currentTenantId} onValueChange={handleTenantChange}>
      <SelectTrigger size="sm" className="w-[160px]">
        <SelectValue placeholder={t('selectTenant')} />
      </SelectTrigger>
      <SelectContent>
        {userTenants.map(membership => (
          <SelectItem key={membership.id} value={membership.id}>
            {membership.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
