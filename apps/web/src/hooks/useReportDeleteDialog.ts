import { useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { ReportDeleteDialogProps } from '@/types'

export function useReportDeleteDialog({
  reportId,
  reportName,
  onConfirm,
}: ReportDeleteDialogProps) {
  const t = useTranslations('reports')

  const handleDelete = useCallback(async () => {
    if (!reportId) {
      return
    }

    const confirmed = await SweetAlertDialog.show({
      title: t('deleteTitle'),
      text: t('deleteWarning', { name: reportName }),
      icon: SweetAlertIcon.WARNING,
      confirmButtonText: t('deleteConfirm'),
      cancelButtonText: t('cancelButton'),
    })

    if (confirmed) {
      onConfirm(reportId)
    }
  }, [reportId, reportName, onConfirm, t])

  useEffect(() => {
    if (reportId) {
      void handleDelete()
    }
  }, [reportId, handleDelete])

  return { handleDelete }
}
