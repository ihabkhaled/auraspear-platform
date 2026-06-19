import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { UebaEntityDeleteDialogProps } from '@/types'

export function useUebaEntityDeleteDialog({
  entityName,
  anomalyCount,
  onConfirm,
}: UebaEntityDeleteDialogProps) {
  const t = useTranslations('ueba')

  const handleDelete = useCallback(async () => {
    const confirmed = await SweetAlertDialog.show({
      text: t('deleteConfirmText', { name: entityName, count: anomalyCount }),
      icon: SweetAlertIcon.QUESTION,
    })

    if (confirmed) {
      onConfirm()
    }
  }, [entityName, anomalyCount, onConfirm, t])

  return {
    t,
    handleDelete,
  }
}
