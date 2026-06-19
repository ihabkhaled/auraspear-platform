import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { SoarRunDialogProps } from '@/types'

export function useSoarRunDialog({ playbookId, playbookName, onConfirm }: SoarRunDialogProps) {
  const t = useTranslations('soar')
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    onConfirmRef.current = onConfirm
  }, [onConfirm])

  const handleRun = useCallback(async () => {
    if (!playbookId) {
      return
    }

    const confirmed = await SweetAlertDialog.show({
      title: t('runTitle'),
      text: t('runWarning', { name: playbookName }),
      icon: SweetAlertIcon.QUESTION,
      confirmButtonText: t('runConfirm'),
      cancelButtonText: t('cancelButton'),
    })

    if (confirmed) {
      onConfirmRef.current(playbookId)
    }
  }, [playbookId, playbookName, t])

  useEffect(() => {
    if (playbookId) {
      void handleRun()
    }
  }, [playbookId, handleRun])

  return { handleRun }
}
