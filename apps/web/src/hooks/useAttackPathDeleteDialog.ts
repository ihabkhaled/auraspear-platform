import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'

export function useAttackPathDeleteDialog() {
  const t = useTranslations('attackPath')

  const confirmDelete = useCallback(
    async (pathTitle: string): Promise<boolean> => {
      const confirmed = await SweetAlertDialog.show({
        text: `${t('confirmDeleteMessage')} "${pathTitle}"?`,
        icon: SweetAlertIcon.QUESTION,
      })
      return confirmed
    },
    [t]
  )

  return {
    t,
    confirmDelete,
  }
}
