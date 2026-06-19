import { useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { ComplianceDeleteDialogProps } from '@/types'

export function useComplianceDeleteDialog({
  frameworkId,
  frameworkName,
  onConfirm,
}: ComplianceDeleteDialogProps) {
  const t = useTranslations('compliance')

  const handleDelete = useCallback(async () => {
    if (!frameworkId) {
      return
    }

    const confirmed = await SweetAlertDialog.show({
      title: t('deleteTitle'),
      text: t('deleteWarning', { name: frameworkName }),
      icon: SweetAlertIcon.WARNING,
      confirmButtonText: t('deleteConfirm'),
      cancelButtonText: t('cancelButton'),
    })

    if (confirmed) {
      onConfirm(frameworkId)
    }
  }, [frameworkId, frameworkName, onConfirm, t])

  useEffect(() => {
    if (frameworkId) {
      void handleDelete()
    }
  }, [frameworkId, handleDelete])

  return { handleDelete }
}
