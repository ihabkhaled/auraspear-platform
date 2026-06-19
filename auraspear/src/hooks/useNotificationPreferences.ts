import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import type { NotificationCategory } from '@/enums'
import { CATEGORY_TO_PREF_KEY, NOTIFICATION_CATEGORIES } from '@/lib/constants/notifications'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { lookup } from '@/lib/utils'
import { usePreferences, useUpdatePreferences } from './useSettings'

export function useNotificationPreferences() {
  const t = useTranslations('settings')
  const tErrors = useTranslations('errors')
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  const categoryStates = useMemo(
    () =>
      NOTIFICATION_CATEGORIES.map(category => ({
        category,
        enabled: Boolean(preferences?.[lookup(CATEGORY_TO_PREF_KEY, category)] ?? true),
      })),
    [preferences]
  )

  const handleToggle = useCallback(
    (category: NotificationCategory, checked: boolean) => {
      updatePreferences.mutate(
        { [lookup(CATEGORY_TO_PREF_KEY, category)]: checked },
        {
          onSuccess: () => {
            Toast.success(t('saved'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [updatePreferences, t, tErrors]
  )

  return {
    t,
    categoryStates,
    isPending: updatePreferences.isPending,
    handleToggle,
  }
}
