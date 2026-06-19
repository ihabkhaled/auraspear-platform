import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { type UserRole } from '@/enums'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { authService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useImpersonationBanner() {
  const t = useTranslations('impersonation')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { impersonator, user, setTokens, setUser, endImpersonation } = useAuthStore()
  const { setCurrentTenant } = useTenantStore()
  const [ending, setEnding] = useState(false)

  const handleEndImpersonation = useCallback(async () => {
    setEnding(true)
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

      Toast.success(t('ended'))
      router.push('/admin/tenant')
    } catch (error) {
      buildErrorToastHandler(tErrors)(error)
    } finally {
      setEnding(false)
    }
  }, [setTokens, setUser, endImpersonation, setCurrentTenant, queryClient, router, t, tErrors])

  return { t, impersonator, user, ending, handleEndImpersonation }
}
