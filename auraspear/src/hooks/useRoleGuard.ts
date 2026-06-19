'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessRouteByPermission, getFirstAccessibleRoute } from '@/lib/permissions'
import { useAuthStore } from '@/stores'

export function useRoleGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const permissions = useAuthStore(s => s.permissions)
  const user = useAuthStore(s => s.user)

  const allowed = permissions.length > 0 ? canAccessRouteByPermission(permissions, pathname) : false
  const fallbackRoute = getFirstAccessibleRoute(permissions)

  useEffect(() => {
    if (user && permissions.length > 0 && !allowed && fallbackRoute && pathname !== fallbackRoute) {
      router.replace(fallbackRoute)
    }
  }, [allowed, fallbackRoute, pathname, permissions.length, router, user])

  return {
    userRole: user?.role,
    allowed,
  }
}
