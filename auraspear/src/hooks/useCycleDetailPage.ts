import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAuthStore } from '@/stores'
import type { Case } from '@/types'
import { useCaseCycle, useCloseCaseCycle } from './useCaseCycles'

export function useCycleDetailPage(id: string) {
  const t = useTranslations('cases.cycles')
  const tCases = useTranslations('cases')
  const tErrors = useTranslations('errors')
  const router = useRouter()

  const permissions = useAuthStore(s => s.permissions)
  const isAdmin = hasPermission(permissions, Permission.CASES_CHANGE_STATUS)

  const { data: cycleData, isLoading } = useCaseCycle(id)
  const closeCycle = useCloseCaseCycle()

  const cycle = cycleData?.data

  const handleCloseCycle = useCallback(async () => {
    if (!cycle) {
      return
    }
    const confirmed = await SweetAlertDialog.show({
      title: t('closeCycle'),
      text: t('confirmCloseCycle'),
      icon: SweetAlertIcon.WARNING,
    })
    if (!confirmed) {
      return
    }
    closeCycle.mutate(
      { id: cycle.id, data: {} },
      {
        onSuccess: () => Toast.success(t('cycleClosed')),
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }, [cycle, closeCycle, t, tErrors])

  const handleCaseClick = useCallback(
    (caseItem: Case) => {
      router.push(`/cases/${caseItem.id}`)
    },
    [router]
  )

  return {
    t,
    tCases,
    router,
    isLoading,
    isAdmin,
    cycle,
    closeCyclePending: closeCycle.isPending,
    handleCloseCycle,
    handleCaseClick,
  }
}
