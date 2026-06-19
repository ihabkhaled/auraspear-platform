import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { SoarDeleteDialogProps } from '@/types'

export function useSoarDeleteDialog({
  playbookId,
  playbookName,
  onConfirm,
}: SoarDeleteDialogProps) {
  const t = useTranslations('soar')
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    onConfirmRef.current = onConfirm
  }, [onConfirm])

  const handleDelete = useCallback(async () => {
    if (!playbookId) {
      return
    }

    const confirmed = await SweetAlertDialog.show({
      title: t('deleteTitle'),
      text: t('deleteWarning', { name: playbookName }),
      icon: SweetAlertIcon.WARNING,
      confirmButtonText: t('deleteConfirm'),
      cancelButtonText: t('cancelButton'),
    })

    if (confirmed) {
      onConfirmRef.current(playbookId)
    }
  }, [playbookId, playbookName, t])

  useEffect(() => {
    if (playbookId) {
      void handleDelete()
    }
  }, [playbookId, handleDelete])

  return { handleDelete }
}
