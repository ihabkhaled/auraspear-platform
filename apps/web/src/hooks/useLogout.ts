import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { type UserRole } from '@/enums'
import { authService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { logout, impersonator, setTokens, setUser, endImpersonation } = useAuthStore()
  const { setCurrentTenant } = useTenantStore()

  const handleLogout = useCallback(async () => {
    // If currently impersonating, end impersonation instead of full logout
    if (impersonator) {
      try {
        const { data } = await authService.endImpersonation()
        setTokens(data.accessToken)
        setUser({
          sub: data.user.sub,
          email: data.user.email,
          tenantId: data.user.tenantId,
          tenantSlug: data.user.tenantSlug,
          role: data.user.role as UserRole,
        })
        endImpersonation()
        setCurrentTenant(data.user.tenantId)
        queryClient.clear()
        router.push('/admin/tenant')
        return
      } catch {
        // If end-impersonation fails, fall through to full logout
      }
    }

    // Full logout — blacklist tokens on the backend
    try {
      await authService.logout()
    } catch {
      // Proceed with local logout even if backend call fails
    }

    // Clear service worker caches that may contain authenticated data
    // (RSC pages, HTML pages, and any residual API responses)
    const swCacheNames = ['apis', 'pages-rsc-prefetch', 'pages-rsc', 'pages']
    await Promise.allSettled(swCacheNames.map(name => caches.delete(name)))

    queryClient.clear()
    setCurrentTenant('')
    logout()
    router.push('/login')
  }, [
    queryClient,
    logout,
    setCurrentTenant,
    router,
    impersonator,
    setTokens,
    setUser,
    endImpersonation,
  ])

  return handleLogout
}
