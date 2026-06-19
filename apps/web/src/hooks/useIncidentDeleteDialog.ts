import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'

export function useIncidentDeleteDialog() {
  const t = useTranslations('incidents')

  const confirmDelete = useCallback(
    async (incidentNumber: string, title: string): Promise<boolean> => {
      const confirmed = await SweetAlertDialog.show({
        title: t('deleteTitle'),
        text: t('deleteConfirmWithDetails', { number: incidentNumber, title }),
        icon: SweetAlertIcon.WARNING,
        confirmButtonText: t('deleteConfirmButton'),
        cancelButtonText: t('cancelButton'),
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
